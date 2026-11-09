const LOGIN_PATH = "/oauth2/authorization/google";

// Comes back to the current page after login
export function loginUrl(path = LOGIN_PATH) {
  if (typeof window === "undefined") {
    return path;
  }
  const { pathname, search, hash } = window.location;
  return `${path}?returnTo=${encodeURIComponent(pathname + search + hash)}`;
}

export class ApiError extends Error {
  constructor(
    // 0 = network error
    readonly status: number,
    message: string,
    readonly loginUrl?: string,
    // X-Request-Id, for finding it in the backend logs
    readonly requestId?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }

  get isClientError() {
    return this.status >= 400 && this.status < 500;
  }
}

function csrfToken() {
  return document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith("XSRF-TOKEN="))
    ?.split("=")[1];
}

// When there's no problem detail body, e.g. a proxy 502 while the backend restarts
function fallbackMessage(status: number) {
  if (status === 401) return "You've been signed out. Sign in again to continue.";
  if (status === 502 || status === 503 || status === 504)
    return "The server isn't responding. Try again in a moment.";
  if (status >= 500) return "Something went wrong on our end. Try again in a moment.";
  return `Request failed (${status}).`;
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body) {
    headers.set("Content-Type", "application/json");
  }
  const token = csrfToken();
  if (init.method && init.method !== "GET" && token) {
    headers.set("X-XSRF-TOKEN", decodeURIComponent(token));
  }

  let response: Response;
  try {
    response = await fetch(path, { ...init, headers });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }
    // No response at all
    throw new ApiError(0, "Couldn't reach the server. Check your connection and try again.");
  }

  if (!response.ok) {
    const problem = await response.json().catch(() => null);
    // Any 401 (e.g. session timed out) is fixed by signing in again
    const login = problem?.loginUrl ?? (response.status === 401 ? LOGIN_PATH : undefined);
    throw new ApiError(
      response.status,
      problem?.detail ?? fallbackMessage(response.status),
      login && loginUrl(login),
      response.headers.get("X-Request-Id") ?? undefined,
    );
  }
  return response.status === 204 ? (undefined as T) : response.json();
}

// TODO: send these to an error tracker instead of the console
export function reportError(error: Error) {
  if (error instanceof ApiError && error.status === 401) {
    return; // expected when signed out
  }
  const requestId = error instanceof ApiError && error.requestId;
  console.error(requestId ? `${error.message} (request ${requestId})` : error);
}
