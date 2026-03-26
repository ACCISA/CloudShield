// api client with JWT auth and error handling
// This is a simple wrapper around fetch that adds the JWT token from localStorage and provides consistent error handling. 
// It also allows for easy extension in the future (e.g. adding retries, logging, etc.).
// Usage:
// import { apiGet, apiPost } from './client';
// const data = await apiGet('/some/endpoint');
// const result = await apiPost('/some/endpoint', { key: 'value' });

const API_BASE =
  import.meta?.env?.VITE_API_BASE_URL || "http://localhost:5050/api";

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
    let msg = `HTTP ${res.status}`;
    try {
      const data = await res.json();
      msg = data?.error || data?.details || msg;
    } catch {}
    throw new Error(msg);
  }

  // handle empty responses (204 etc.)
  if (res.status === 204) return null;
  return res;
}

// Convenience methods for common HTTP verbs
export const apiGet = (path, opts) => request(path, { ...opts, method: "GET" });
export const apiPost = (path, body, opts) => request(path, { ...opts, method: "POST", body });
export const apiPatch = (path, body, opts) => request(path, { ...opts, method: "PATCH", body });
export const apiDelete = (path, opts) => request(path, { ...opts, method: "DELETE" });
