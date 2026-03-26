const API_PREFIX = "/api";

function normalizeApiBase(apiBase) {
  return apiBase.replace(/\/+$/, "");
}

export function getApiBaseUrl() {
  const configuredApiBase = import.meta?.env?.VITE_API_BASE_URL;
  if (configuredApiBase) {
    return normalizeApiBase(configuredApiBase);
  }

  return API_PREFIX;
}

export function buildApiUrl(path = "") {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getApiBaseUrl()}${normalizedPath}`;
}
