// api client with JWT auth and error handling
// This is a simple wrapper around fetch that adds the JWT token from localStorage and provides consistent error handling.
// It also allows for easy extension in the future (e.g. adding retries, logging, etc.).
// Usage:
// import { apiGet, apiPost } from './client';
// const data = await apiGet('/some/endpoint');
// const result = await apiPost('/some/endpoint', { key: 'value' });

const API_BASE =
  import.meta?.env?.VITE_API_BASE_URL || "http://localhost:5050/api";

let unauthorizedHandled = false;

function clearAuthStorage() {
  try {
    localStorage.removeItem("jwt");
    localStorage.removeItem("org_id");
    localStorage.removeItem("provision_job_id");
    localStorage.removeItem("isProvisioned");
  } catch {
    // ignore storage failures
  }
}

function handleUnauthorized(path, hasToken) {
  // Ignore login/signup failures; these are normal invalid-credentials flows.
  if (
    !hasToken ||
    path.startsWith("/auth/login") ||
    path.startsWith("/auth/signup")
  ) {
    return;
  }
  if (unauthorizedHandled) return;
  unauthorizedHandled = true;

  clearAuthStorage();

  if (typeof window !== "undefined") {
    try {
      window.dispatchEvent(new Event("auth:logout"));
    } catch {
      // ignore event dispatch failures
    }

    try {
      if (window.location?.pathname !== "/login") {
        window.location.assign("/login");
      }
    } catch {
      // ignore redirect failures
    }
  }
}

export function getToken() {
  return localStorage.getItem("jwt");
}

async function request(path, { method = "GET", body, headers } = {}) {
  const token = getToken();

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers || {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (!res.ok) {
    if (res.status === 401) {
      handleUnauthorized(path, Boolean(token));
    }

    let msg = `HTTP ${res.status}`;
    try {
      const data = await res.json();
      msg = data?.error || data?.details || msg;
    } catch {}
    const error = new Error(msg);
    error.status = res.status;
    throw error;
  }

  // handle empty responses (204 etc.)
  if (res.status === 204) return null;
  return res;
}

// Convenience methods for common HTTP verbs
export const apiGet = (path, opts) => request(path, { ...opts, method: "GET" });
export const apiPost = (path, body, opts) =>
  request(path, { ...opts, method: "POST", body });
export const apiPatch = (path, body, opts) =>
  request(path, { ...opts, method: "PATCH", body });
export const apiDelete = (path, opts) =>
  request(path, { ...opts, method: "DELETE" });
