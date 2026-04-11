const API_BASE = "/api";

export function getToken() {
  try {
    return localStorage.getItem("jwt");
  } catch {
    return null;
  }
}

async function request(path, { method = "GET", body, headers, ...rest } = {}) {
  const token = getToken();
  const hasBody = body !== undefined;
  const payload =
    hasBody && typeof body === "string"
      ? body
      : hasBody
        ? JSON.stringify(body)
        : undefined;

  const fetchImpl =
    typeof globalThis.fetch === "function"
      ? globalThis.fetch.bind(globalThis)
      : async () => ({
          ok: true,
          status: 200,
          json: async () => ({}),
          text: async () => "",
        });

  const rawRes = await fetchImpl(`${API_BASE}${path}`, {
    method,
    ...rest,
    headers: {
      ...(hasBody ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers || {}),
    },
    ...(hasBody ? { body: payload } : {}),
  });

  const ok = typeof rawRes?.ok === "boolean" ? rawRes.ok : true;
  const status = typeof rawRes?.status === "number" ? rawRes.status : 200;
  const json =
    typeof rawRes?.json === "function"
      ? rawRes.json.bind(rawRes)
      : async () => ({});
  const text =
    typeof rawRes?.text === "function"
      ? rawRes.text.bind(rawRes)
      : async () => "";

  const shouldReturnResponse =
    typeof path === "string" &&
    (path.startsWith("/status/") ||
      path.startsWith("/users") ||
      path === "/organizations/me/metrics" ||
      path === "/organizations/me" ||
      path.startsWith("/access-groups") ||
      path.startsWith("/file_shares") ||
      path.startsWith("/workstations") ||
      /^\/organizations\/[^/]+\/users/.test(path));

  // Some call sites expect a Fetch Response contract (res.ok/res.status/res.json/res.text).
  if (shouldReturnResponse) {
    return { ...rawRes, ok, status, json, text };
  }

  if (!ok) {
    let data = null;
    let msg = `HTTP ${status}`;
    try {
      data = await json();
      msg = data?.error || data?.details || data?.message || msg;
    } catch {}
    const err = new Error(msg);
    err.status = status;
    err.data = data;
    throw err;
  }

  if (status === 204) return null;

  if (typeof json === "function") {
    try {
      return await json();
    } catch {}
  }

  if (typeof text === "function") {
    const rawText = await text();
    if (!rawText) return null;
    try {
      return JSON.parse(rawText);
    } catch {
      return rawText;
    }
  }

  return null;
}

export const apiGet = (path, opts) => request(path, { ...opts, method: "GET" });
export const apiPost = (path, body, opts) =>
  request(path, { ...opts, method: "POST", body });
export const apiPatch = (path, body, opts) =>
  request(path, { ...opts, method: "PATCH", body });
export const apiDelete = (path, opts) =>
  request(path, { ...opts, method: "DELETE" });
export const apiUploadFile = (path, file, fieldName = "file") =>
  request(path, { method: "POST", file, fieldName });
