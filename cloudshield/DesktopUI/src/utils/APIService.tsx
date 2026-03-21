type ApiRequestOptions = RequestInit & { skipAuth?: boolean };

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
      return "http://127.0.0.1:5050/api";
    }
  }

  const isHttpOrigin =
    typeof window !== "undefined" && /^https?:$/i.test(window.location.protocol);
  return isHttpOrigin ? "/api" : "http://127.0.0.1:5050/api";
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

  private buildUrl(endpoint: string): string {
    const base = APIService.baseUrl.endsWith("/")
      ? APIService.baseUrl
      : `${APIService.baseUrl}/`;
    const normalizedEndpoint = endpoint.trim().replace(/^\/+/, "");
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

  public async get(endpoint: string, options: ApiRequestOptions = {}): Promise<Response> {
    const headers = this.withAuthHeaders(options.headers, options.skipAuth);
    return fetch(this.buildUrl(endpoint), {
      ...options,
      method: "GET",
      headers,
    });
  }

  public async post(
    endpoint: string,
    body?: unknown,
    options: ApiRequestOptions = {}
  ): Promise<Response> {
    const { body: normalizedBody, contentType } = this.normalizeBody(body);
    const headers = this.withAuthHeaders(options.headers, options.skipAuth);
    if (contentType && !headers.has("Content-Type")) {
      headers.set("Content-Type", contentType);
    }
    return fetch(this.buildUrl(endpoint), {
      ...options,
      method: "POST",
      headers,
      body: normalizedBody ?? options.body,
    });
  }

  public static async get(endpoint: string, options: ApiRequestOptions = {}) {
    return APIService.getInstance().get(endpoint, options);
  }

  public static async post(
    endpoint: string,
    body?: unknown,
    options: ApiRequestOptions = {}
  ) {
    return APIService.getInstance().post(endpoint, body, options);
  }
}

export default APIService.getInstance();