// utils/jwtLocalStorage.ts

/**
 * Decode a JWT and return its claims as an object.
 */
export function decodeJwtClaims(token: string): { [key: string]: any } {
  try {
    const payloadPart = token.split(".")[1];
    if (!payloadPart) return {};
    const base64 = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => `%${c.charCodeAt(0).toString(16).padStart(2, "0")}`)
        .join("")
    );
    return (JSON.parse(json) || {});
  } catch {
    return {};
  }
}

/**
 * Save org_id to localStorage from a JWT access token.
 */
export function saveOrgIdFromToken(token: string) {
  const claims = decodeJwtClaims(token);
  if (claims.org_id) {
    localStorage.setItem("org_id", claims.org_id);
  }
}

export function saveUserIdFromToken(token: string) {
  const claims = decodeJwtClaims(token);
  // Use user_id if present, otherwise use sub (standard JWT subject claim)
  const userId = claims.user_id || claims.sub;
  if (userId) {
    localStorage.setItem("user_id", userId);
  }
}

/**
 * Get org_id from localStorage.
 */
export function getOrgId(): string | null {
  return localStorage.getItem("org_id");
}

/**
 * Save auth info to localStorage.
 */
export function saveAuthToLocalStorage(auth: {
  accessToken: string;
  tokenType?: string;
  expiresAt?: number;
  email?: string;
}) {
  localStorage.setItem(
    "cloudshield.auth",
    JSON.stringify(auth)
  );
}

/**
 * Get auth info from localStorage.
 */
export function getAuthFromLocalStorage(): {
  accessToken?: string;
  tokenType?: string;
  expiresAt?: number;
  email?: string;
} | null {
  const raw = localStorage.getItem("cloudshield.auth");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Remove auth info from localStorage.
 */
export function clearAuthFromLocalStorage() {
  localStorage.removeItem("cloudshield.auth");
}
