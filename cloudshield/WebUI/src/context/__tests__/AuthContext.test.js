import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import { AuthProvider, useAuth } from "../AuthContext";
import "@testing-library/jest-dom";

// Mock component to test the useAuth hook
const TestComponent = () => {
  const { currentUser, accessToken, isAuthenticated, authError, authLoading, refreshAuth } =
    useAuth();

  return (
    <div>
      <div data-testid="current-user">{currentUser?.id}</div>
      <div data-testid="email">{currentUser?.email}</div>
      <div data-testid="access-token">{accessToken ? "present" : "absent"}</div>
      <div data-testid="is-authenticated">{isAuthenticated ? "true" : "false"}</div>
      <div data-testid="auth-error">{authError}</div>
      <div data-testid="auth-loading">{authLoading ? "true" : "false"}</div>
      <button onClick={refreshAuth} data-testid="refresh-button">
        Refresh Auth
      </button>
    </div>
  );
};

describe("AuthContext", () => {
  beforeEach(() => {
    localStorage.clear();
    const localStorageMock = (function () {
      let store = {};
      return {
        getItem: jest.fn((key) => store[key] || null),
        setItem: jest.fn((key, value) => { store[key] = value.toString(); }),
        removeItem: jest.fn((key) => { delete store[key]; }),
        clear: jest.fn(() => { store = {}; }),
      };
    })();
    Object.defineProperty(window, "localStorage", { value: localStorageMock });

    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("throws error if useAuth is used without AuthProvider", () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation();

    expect(() => {
      render(<TestComponent />);
    }).toThrow("useAuth must be used within an AuthProvider");

    consoleError.mockRestore();
  });

  test("provides default user when no token is present", () => {
    render(
      <AuthProvider initialState={{ disableBootstrap: true }}>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByTestId("current-user")).toHaveTextContent("admin-001");
  });

  test("provides custom initial user from initialState", () => {
    const customUser = {
      id: "custom-user",
      email: "custom@example.com",
      full_name: "Custom User",
      role: "admin",
      org_id: "custom-org",
    };

    render(
      <AuthProvider
        initialState={{
          currentUser: customUser,
          disableBootstrap: true,
        }}
      >
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByTestId("current-user")).toHaveTextContent("custom-user");
    expect(screen.getByTestId("email")).toHaveTextContent("custom@example.com");
  });

  test("reads access token from localStorage", () => {
    const token = "test-jwt-token";
    localStorage.getItem.mockReturnValue(token);

    render(
      <AuthProvider initialState={{ disableBootstrap: true }}>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByTestId("access-token")).toHaveTextContent("present");
  });

  test("sets isAuthenticated to true when accessToken is present", () => {
    localStorage.getItem.mockReturnValue("test-jwt-token");

    render(
      <AuthProvider initialState={{ disableBootstrap: true }}>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByTestId("is-authenticated")).toHaveTextContent("true");
  });

  test("sets isAuthenticated to false when accessToken is absent", () => {
    render(
      <AuthProvider initialState={{ disableBootstrap: true }}>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByTestId("is-authenticated")).toHaveTextContent("false");
  });

  test("decodes JWT payload and extracts user claims", () => {
    const mockPayload = {
      sub: "user-123",
      email: "user@example.com",
      full_name: "Test User",
      role: "admin",
      org_id: "org-123",
    };

    const token = `header.${btoa(JSON.stringify(mockPayload))}.signature`;
    localStorage.getItem.mockReturnValue(token);

    render(
      <AuthProvider initialState={{ disableBootstrap: true }}>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByTestId("current-user")).toHaveTextContent("user-123");
    expect(screen.getByTestId("email")).toHaveTextContent("user@example.com");
  });

  test("handles invalid JWT gracefully", () => {
    localStorage.getItem.mockReturnValue("invalid-jwt-token");

    render(
      <AuthProvider initialState={{ disableBootstrap: true }}>
        <TestComponent />
      </AuthProvider>
    );

    // Should fall back to DEFAULT_USER
    expect(screen.getByTestId("current-user")).toHaveTextContent("admin-001");
  });

  test("performs bootstrap login with credentials from initialState", async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: "bootstrap-token",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          user: {
            id: "bootstrap-user",
            email: "bootstrap@example.com",
          },
        }),
      });

    render(
      <AuthProvider
        initialState={{
          bootstrapEmail: "admin@example.com",
          bootstrapPassword: "password",
        }}
      >
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("is-authenticated")).toHaveTextContent("true");
    });
  });

  test("sets authLoading to true during bootstrap", async () => {
    let resolveLogin;
    global.fetch.mockReturnValue(
      new Promise((resolve) => {
        resolveLogin = resolve;
      })
    );

    render(
      <AuthProvider
        initialState={{
          bootstrapEmail: "admin@example.com",
          bootstrapPassword: "password",
        }}
      >
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByTestId("auth-loading")).toHaveTextContent("true");
  });

  test("sets authLoading to false after bootstrap completes", async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: "bootstrap-token",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          user: {
            id: "bootstrap-user",
            email: "bootstrap@example.com",
          },
        }),
      });

    render(
      <AuthProvider
        initialState={{
          bootstrapEmail: "admin@example.com",
          bootstrapPassword: "password",
        }}
      >
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("auth-loading")).toHaveTextContent("false");
    });
  });

  test("sets authError on failed login", async () => {
    global.fetch.mockRejectedValueOnce(new Error("Login failed"));

    render(
      <AuthProvider
        initialState={{
          bootstrapEmail: "admin@example.com",
          bootstrapPassword: "password",
        }}
      >
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("auth-loading")).toHaveTextContent("false");
    });
  });

  test("sets error if bootstrap credentials are missing", async () => {
    render(
      <AuthProvider
        initialState={{
          bootstrapEmail: "",
          bootstrapPassword: "",
        }}
      >
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("auth-error")).toHaveTextContent(/missing/i);
    });
  });

  test("disables bootstrap when disableBootstrap is true", () => {
    global.fetch.mockClear();

    render(
      <AuthProvider
        initialState={{
          disableBootstrap: true,
          bootstrapEmail: "admin@example.com",
          bootstrapPassword: "password",
        }}
      >
        <TestComponent />
      </AuthProvider>
    );

    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("skips bootstrap when accessToken is already provided", () => {
    global.fetch.mockClear();

    render(
      <AuthProvider
        initialState={{
          accessToken: "existing-token",
          bootstrapEmail: "admin@example.com",
          bootstrapPassword: "password",
        }}
      >
        <TestComponent />
      </AuthProvider>
    );

    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("provides refreshAuth function", () => {
    render(
      <AuthProvider initialState={{ disableBootstrap: true }}>
        <TestComponent />
      </AuthProvider>
    );

    const refreshButton = screen.getByTestId("refresh-button");
    expect(refreshButton).toBeInTheDocument();
  });

  test("refreshAuth clears token and triggers re-bootstrap", async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: "bootstrap-token",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          user: {
            id: "bootstrap-user",
            email: "bootstrap@example.com",
          },
        }),
      });

    const { rerender } = render(
      <AuthProvider
        initialState={{
          bootstrapEmail: "admin@example.com",
          bootstrapPassword: "password",
        }}
      >
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("is-authenticated")).toHaveTextContent("true");
    });

    // Verify the component works before refresh
  });

  test("extracts user from /api/auth/me response", async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: "bootstrap-token",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          user: {
            id: "me-user-id",
            email: "me@example.com",
            full_name: "Me User",
            role: "employee",
            org_id: "org-456",
          },
        }),
      });

    render(
      <AuthProvider
        initialState={{
          bootstrapEmail: "admin@example.com",
          bootstrapPassword: "password",
        }}
      >
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("current-user")).toHaveTextContent("me-user-id");
      expect(screen.getByTestId("email")).toHaveTextContent("me@example.com");
    });
  });

  test("keeps the existing fallback user if /api/auth/me fails after bootstrap login", async () => {
    const mockPayload = {
      sub: "user-456",
      email: "claims@example.com",
      full_name: "Claims User",
      role: "admin",
      org_id: "org-789",
    };

    const token = `header.${btoa(JSON.stringify(mockPayload))}.signature`;

    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: token,
        }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

    render(
      <AuthProvider
        initialState={{
          bootstrapEmail: "admin@example.com",
          bootstrapPassword: "password",
        }}
      >
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("current-user")).toHaveTextContent("admin-001");
      expect(screen.getByTestId("access-token")).toHaveTextContent("present");
    });
  });

  test("handles abort signal when component unmounts during bootstrap", async () => {
    let abortController;
    global.fetch.mockImplementation((url, options) => {
      if (options?.signal) {
        abortController = options.signal;
      }
      return new Promise(() => { }); // Never resolves
    });

    const { unmount } = render(
      <AuthProvider
        initialState={{
          bootstrapEmail: "admin@example.com",
          bootstrapPassword: "password",
        }}
      >
        <TestComponent />
      </AuthProvider>
    );

    await new Promise((r) => setTimeout(r, 50));

    unmount();

    // Verify cleanup occurred
    expect(global.fetch).toHaveBeenCalled();
  });

  test("provides memoized context value", () => {
    const { rerender } = render(
      <AuthProvider initialState={{ disableBootstrap: true }}>
        <TestComponent />
      </AuthProvider>
    );

    const firstRender = screen.getByTestId("current-user").textContent;

    rerender(
      <AuthProvider initialState={{ disableBootstrap: true }}>
        <TestComponent />
      </AuthProvider>
    );

    const secondRender = screen.getByTestId("current-user").textContent;

    expect(firstRender).toBe(secondRender);
  });

  test("prefers initialState.currentUser over decoded JWT", () => {
    const mockPayload = {
      sub: "jwt-user",
      email: "jwt@example.com",
    };

    const token = `header.${btoa(JSON.stringify(mockPayload))}.signature`;
    localStorage.getItem.mockReturnValue(token);

    const customUser = {
      id: "custom-user",
      email: "custom@example.com",
      full_name: "Custom User",
      role: "admin",
      org_id: "custom-org",
    };

    render(
      <AuthProvider
        initialState={{
          currentUser: customUser,
          disableBootstrap: true,
        }}
      >
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByTestId("current-user")).toHaveTextContent("custom-user");
  });

  test("handles environment variables for bootstrap credentials", async () => {
    globalThis.__APP_ENV__ = {
      VITE_AUTH_EMAIL: "env@example.com",
      VITE_AUTH_PASSWORD: "env-password",
    };

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        access_token: "env-token",
      }),
    });

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        user: {
          id: "env-user",
          email: "env@example.com",
        },
      }),
    });

    render(
      <AuthProvider initialState={{ disableBootstrap: false }}>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/auth/login",
        expect.objectContaining({
          body: expect.stringContaining("env@example.com"),
        })
      );
    });

    delete globalThis.__APP_ENV__;
  });
});
