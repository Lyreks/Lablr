import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError, apiFetch } from "./client";

describe("apiFetch", () => {
  beforeEach(() => {
    vi.stubGlobal("document", { cookie: "XSRF-TOKEN=abc%3D" });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const respondWith = (response: Response) => {
    const fetch = vi.fn().mockResolvedValue(response);
    vi.stubGlobal("fetch", fetch);
    return fetch;
  };

  const failure = (path = "/api/labels") =>
    apiFetch(path).then(
      () => expect.fail("expected an error"),
      (error: unknown) => error as ApiError,
    );

  it("sends the CSRF token on changes only", async () => {
    const fetch = respondWith(new Response(null, { status: 204 }));

    await apiFetch("/api/labels/1", { method: "DELETE" });
    await apiFetch("/api/labels");

    expect(fetch.mock.calls[0][1].headers.get("X-XSRF-TOKEN")).toBe("abc=");
    expect(fetch.mock.calls[1][1].headers.has("X-XSRF-TOKEN")).toBe(false);
  });

  it("uses the problem detail and keeps the request ID", async () => {
    respondWith(
      Response.json(
        { detail: "Label name exists or conflicts" },
        { status: 409, headers: { "X-Request-Id": "req-1" } },
      ),
    );

    const error = await failure();

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(409);
    expect(error.message).toBe("Label name exists or conflicts");
    expect(error.requestId).toBe("req-1");
    expect(error.loginUrl).toBeUndefined();
  });

  it("offers to sign in again on any 401", async () => {
    respondWith(new Response(null, { status: 401 }));

    const error = await failure();

    expect(error.message).toBe("You've been signed out. Sign in again to continue.");
    expect(error.loginUrl).toBe("/oauth2/authorization/google");
  });

  it("explains proxy errors without a body", async () => {
    respondWith(new Response("Bad Gateway", { status: 502 }));

    const error = await failure();

    expect(error.message).toBe("The server isn't responding. Try again in a moment.");
    expect(error.isClientError).toBe(false);
  });

  it("turns network failures into status 0", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    const error = await failure();

    expect(error.status).toBe(0);
    expect(error.message).toBe("Couldn't reach the server. Check your connection and try again.");
  });
});
