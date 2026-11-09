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
    readonly status: number,
    message: string,
    readonly loginUrl?: string,
  ) {
    super(message);
  }
}

function csrfToken() {
  return document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith("XSRF-TOKEN="))
    ?.split("=")[1];
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

  const response = await fetch(path, { ...init, headers });

  if (!response.ok) {
    const problem = await response.json().catch(() => null);
    throw new ApiError(
      response.status,
      problem?.detail ?? response.statusText,
      problem?.loginUrl && loginUrl(problem.loginUrl),
    );
  }
  return response.status === 204 ? (undefined as T) : response.json();
}
