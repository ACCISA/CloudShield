import { beforeEach, describe, expect, it, jest } from "@jest/globals";

global.fetch = jest.fn();

const localStorageMock = {
  getItem: jest.fn(() => "test-jwt-token"),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

describe("client.js", () => {
  function importClient() {
    jest.resetModules();
    return require("../client");
  }

  beforeEach(() => {
    jest.clearAllMocks();
    fetch.mockClear();

    localStorageMock.getItem.mockClear();
    localStorageMock.getItem.mockReturnValue("test-jwt-token");

    global.importMeta = { env: {} };

    Object.defineProperty(globalThis, "localStorage", {
      value: localStorageMock,
      configurable: true,
    });

    if (typeof window !== "undefined") {
      Object.defineProperty(window, "localStorage", {
        value: localStorageMock,
        configurable: true,
      });
    }
  });

  describe("getToken", () => {
    it("returns jwt token from localStorage", () => {
      const { getToken } = importClient();
      expect(getToken()).toBe("test-jwt-token");
      expect(localStorageMock.getItem).toHaveBeenCalledWith("jwt");
    });

    it("returns null if jwt is missing", () => {
      localStorageMock.getItem.mockReturnValueOnce(null);
      const { getToken } = importClient();
      expect(getToken()).toBeNull();
    });
  });

  describe("request helpers", () => {
    it("uses custom API base from importMeta env", async () => {
      global.importMeta = { env: { VITE_API_BASE_URL: "http://example.test/api" } };
      const { apiGet } = importClient();
      const okRes = { ok: true, status: 200, json: async () => ({ ok: true }) };
      fetch.mockResolvedValueOnce(okRes);

      const res = await apiGet("/health");

      expect(fetch).toHaveBeenCalledWith(
        "http://example.test/api/health",
        expect.objectContaining({ method: "GET" }),
      );
      expect(res).toBe(okRes);
    });

    it("apiGet adds Authorization when token exists", async () => {
      const { apiGet } = importClient();
      const okRes = { ok: true, status: 200, json: async () => ({ hello: "world" }) };
      fetch.mockResolvedValueOnce(okRes);

      const res = await apiGet("/ping");

      const [url, opts] = fetch.mock.calls[0];
      expect(url).toBe("http://localhost:5050/api/ping");
      expect(opts.method).toBe("GET");
      expect(opts.headers.Authorization).toBe("Bearer test-jwt-token");
      expect(opts.headers["Content-Type"]).toBeUndefined();
      expect(opts.body).toBeUndefined();
      expect(res).toBe(okRes);
    });

    it("apiGet does not add Authorization when token is missing", async () => {
      localStorageMock.getItem.mockReturnValueOnce(null);
      const { apiGet } = importClient();
      fetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ ok: true }) });

      await apiGet("/noauth");
      const [, opts] = fetch.mock.calls[0];
      expect(opts.headers.Authorization).toBeUndefined();
    });

    it("apiGet merges custom headers", async () => {
      const { apiGet } = importClient();
      fetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ ok: true }) });

      await apiGet("/headers", { headers: { "X-Test": "yes" } });
      const [, opts] = fetch.mock.calls[0];
      expect(opts.headers).toMatchObject({
        Authorization: "Bearer test-jwt-token",
        "X-Test": "yes",
      });
    });

    it("apiPost sets Content-Type and JSON body", async () => {
      const { apiPost } = importClient();
      const okRes = { ok: true, status: 201, json: async () => ({ created: true }) };
      fetch.mockResolvedValueOnce(okRes);

      const payload = { a: 1 };
      const res = await apiPost("/things", payload);

      const [url, opts] = fetch.mock.calls[0];
      expect(url).toBe("http://localhost:5050/api/things");
      expect(opts.method).toBe("POST");
      expect(opts.headers["Content-Type"]).toBe("application/json");
      expect(opts.body).toBe(JSON.stringify(payload));
      expect(res).toBe(okRes);
    });

    it("apiPatch sets PATCH method and JSON body", async () => {
      const { apiPatch } = importClient();
      fetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ updated: true }) });

      await apiPatch("/things/1", { name: "x" });
      const [, opts] = fetch.mock.calls[0];
      expect(opts.method).toBe("PATCH");
      expect(opts.headers["Content-Type"]).toBe("application/json");
      expect(opts.body).toBe(JSON.stringify({ name: "x" }));
    });

    it("apiDelete does not set body/content-type by default", async () => {
      const { apiDelete } = importClient();
      fetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ deleted: true }) });

      await apiDelete("/things/1");
      const [, opts] = fetch.mock.calls[0];
      expect(opts.method).toBe("DELETE");
      expect(opts.body).toBeUndefined();
      expect(opts.headers["Content-Type"]).toBeUndefined();
    });

    it("returns null for 204 responses", async () => {
      const { apiGet } = importClient();
      fetch.mockResolvedValueOnce({ ok: true, status: 204, json: async () => ({}) });
      await expect(apiGet("/empty")).resolves.toBeNull();
    });

    it("throws backend error/details and HTTP fallback", async () => {
      const { apiGet } = importClient();

      fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: "Bad input" }),
      });
      await expect(apiGet("/bad")).rejects.toThrow("Bad input");

      fetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ details: "Forbidden" }),
      });
      await expect(apiGet("/forbidden")).rejects.toThrow("Forbidden");

      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => {
          throw new Error("no json");
        },
      });
      await expect(apiGet("/err")).rejects.toThrow("HTTP 500");

      fetch.mockResolvedValueOnce({
        ok: false,
        status: 418,
        json: async () => ({}),
      });
      await expect(apiGet("/empty-error")).rejects.toThrow("HTTP 418");
    });
  });

  describe("apiUploadFile", () => {
    it("uploads file with default field and auth header", async () => {
      const { apiUploadFile } = importClient();
      const file = new File(["a,b,c"], "users.csv", { type: "text/csv" });
      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ created: 1 }),
      });

      const result = await apiUploadFile("/users/import-csv", file);
      const [url, opts] = fetch.mock.calls[0];

      expect(url).toBe("http://localhost:5050/api/users/import-csv");
      expect(opts.method).toBe("POST");
      expect(opts.headers.Authorization).toBe("Bearer test-jwt-token");
      expect(opts.headers["Content-Type"]).toBeUndefined();
      expect(opts.body).toBeInstanceOf(FormData);
      expect(opts.body.get("file")).toBe(file);
      expect(result).toEqual({ created: 1 });
    });

    it("supports custom field name and missing token", async () => {
      localStorageMock.getItem.mockReturnValueOnce(null);
      const { apiUploadFile } = importClient();
      const file = new File(["x"], "groups.csv", { type: "text/csv" });
      fetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ ok: true }) });

      await apiUploadFile("/access-groups/import-csv", file, "upload");
      const [, opts] = fetch.mock.calls[0];
      expect(opts.headers.Authorization).toBeUndefined();
      expect(opts.body.get("upload")).toBe(file);
    });

    it("returns null for 204", async () => {
      const { apiUploadFile } = importClient();
      const file = new File(["a"], "empty.csv", { type: "text/csv" });
      fetch.mockResolvedValueOnce({ ok: true, status: 204, json: async () => ({}) });
      await expect(apiUploadFile("/users/import-csv", file)).resolves.toBeNull();
    });

    it("throws parsed backend error or HTTP fallback when JSON parse fails", async () => {
      const { apiUploadFile } = importClient();
      const file = new File(["a"], "bad.csv", { type: "text/csv" });

      fetch.mockResolvedValueOnce({
        ok: false,
        status: 422,
        json: async () => ({ details: "Invalid CSV" }),
      });
      await expect(apiUploadFile("/users/import-csv", file)).rejects.toThrow("Invalid CSV");

      fetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => {
          throw new Error("no json");
        },
      });
      await expect(apiUploadFile("/users/import-csv", file)).rejects.toThrow("HTTP 503");

      fetch.mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({}),
      });
      await expect(apiUploadFile("/users/import-csv", file)).rejects.toThrow("HTTP 409");
    });
  });
});
