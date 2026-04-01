type ApiRequestOptions = RequestInit & { skipAuth?: boolean };

function normalizeApiRoot(raw: string): string {
  try {
    const u = new URL(raw);
    const normalizedPath = u.pathname.replace(/\/+$/, "");
    u.pathname = !normalizedPath || normalizedPath === "/" ? "/api" : normalizedPath;
    return u.toString().replace(/\/+$/, "");
  } catch {
    return "";
  }
}

function resolveNonHttpFallback(): string {
  const proxyTarget = (import.meta.env.VITE_API_PROXY_TARGET || "").trim();
  const normalized = proxyTarget ? normalizeApiRoot(proxyTarget) : "";
  return normalized || "http://127.0.0.1:5050/api";
}

function resolveApiBaseUrl(): string {
  const raw = (import.meta.env.VITE_API_BASE_URL || "").trim();

  if (raw) {
    if (raw.startsWith("/")) {
      return raw.replace(/\/+$/, "") || "/api";
    }
    try {
      const u = new URL(raw);
      const normalizedPath = u.pathname.replace(/\/+$/, "");
      u.pathname = !normalizedPath || normalizedPath === "/" ? "/api" : normalizedPath;
      return u.toString().replace(/\/+$/, "");
    } catch {
      return resolveNonHttpFallback();
    }
  }

  const isHttpOrigin =
    typeof window !== "undefined" && /^https?:$/i.test(window.location.protocol);
  return isHttpOrigin ? "/api" : resolveNonHttpFallback();
}

class APIService {
  private static instance: APIService | null = null;
  private static baseUrl: string = resolveApiBaseUrl();

  private constructor() {
    // Private constructor to prevent direct instantiation
  }

  public static getInstance(): APIService {
    if (!APIService.instance) {
      APIService.instance = new APIService();
    }
    return APIService.instance;
  }

  private resolveStoredAuth(): {
    accessToken?: string;
    tokenType?: string;
    expiresAt?: number;
    email?: string;
  } | null {
    const snapshot = window.authStore?.loadAuth();
    if (snapshot?.accessToken) {
      return snapshot;
    }

    const raw = localStorage.getItem("cloudshield.auth");
    if (!raw) return null;
    try {
      return JSON.parse(raw) as {
        accessToken?: string;
        tokenType?: string;
        expiresAt?: number;
        email?: string;
      };
    } catch {
      return null;
    }
  }

  private getToken(): { tokenType: string; accessToken: string } | null {
    const stored = this.resolveStoredAuth();
    if (!stored?.accessToken) return null;
    if (stored.expiresAt && Date.now() > stored.expiresAt) return null;
    return {
      tokenType: stored.tokenType || "Bearer",
      accessToken: stored.accessToken,
    };
  }

  private buildUrl(
    endpoint: string,
    orgIdParam?: boolean,
    userIdParam?: boolean,
  ): string {
    const base = APIService.baseUrl.endsWith("/")
      ? APIService.baseUrl
      : `${APIService.baseUrl}/`;
    let normalizedEndpoint = endpoint.trim().replace(/^\/+/, "");
    let paramAdded = false;
    if (orgIdParam) {
      const orgId = localStorage.getItem("org_id");
      if (orgId) {
        normalizedEndpoint +=
          (normalizedEndpoint.includes("?") ? "&" : "?") +
          `org_id=${encodeURIComponent(orgId)}`;
        paramAdded = true;
      }
    }
    if (userIdParam) {
      const userId = localStorage.getItem("user_id");
      console.log("user id", userId);
      if (userId) {
        normalizedEndpoint +=
          (normalizedEndpoint.includes("?") || paramAdded ? "&" : "?") +
          `user_id=${encodeURIComponent(userId)}`;
      }
    }
    return `${base}${normalizedEndpoint}`;
  }

  private withAuthHeaders(headers?: HeadersInit, skipAuth?: boolean): Headers {
    const merged = new Headers(headers);
    if (!skipAuth) {
      const token = this.getToken();
      if (token) {
        merged.set("Authorization", `${token.tokenType} ${token.accessToken}`);
      }
    }
    return merged;
  }

  private normalizeBody(body?: unknown): {
    body?: BodyInit | null;
    contentType?: string;
  } {
    if (body == null) return {};
    if (
      body instanceof FormData ||
      body instanceof URLSearchParams ||
      body instanceof Blob ||
      body instanceof ArrayBuffer ||
      body instanceof ReadableStream
    ) {
      return { body: body as BodyInit };
    }
    if (typeof body === "string") {
      return { body };
    }
    return { body: JSON.stringify(body), contentType: "application/json" };
  }

  public async get(
    endpoint: string,
    options: ApiRequestOptions = {},
    orgIdParam?: boolean,
    userIdParam?: boolean,
  ): Promise<Response> {
    const headers = this.withAuthHeaders(options.headers, options.skipAuth);
    return fetch(this.buildUrl(endpoint, orgIdParam, userIdParam), {
      ...options,
      method: "GET",
      headers,
    });
  }

  public async post(
    endpoint: string,
    body?: unknown,
    options: ApiRequestOptions = {},
    orgIdParam?: boolean,
    userIdParam?: boolean,
  ): Promise<Response> {
    const { body: normalizedBody, contentType } = this.normalizeBody(body);
    const headers = this.withAuthHeaders(options.headers, options.skipAuth);
    if (contentType && !headers.has("Content-Type")) {
      headers.set("Content-Type", contentType);
    }
    return fetch(this.buildUrl(endpoint, orgIdParam, userIdParam), {
      ...options,
      method: "POST",
      headers,
      body: normalizedBody ?? options.body,
    });
  }

  public static async get(
    endpoint: string,
    options: ApiRequestOptions = {},
    orgIdParam?: boolean,
    userIdParam?: boolean,
  ) {
    return APIService.getInstance().get(
      endpoint,
      options,
      orgIdParam,
      userIdParam,
    );
  }

  public static async post(
    endpoint: string,
    body?: unknown,
    options: ApiRequestOptions = {},
    orgIdParam?: boolean,
    userIdParam?: boolean,
  ) {
    return APIService.getInstance().post(
      endpoint,
      body,
      options,
      orgIdParam,
      userIdParam,
    );
  }
}

export default APIService.getInstance();