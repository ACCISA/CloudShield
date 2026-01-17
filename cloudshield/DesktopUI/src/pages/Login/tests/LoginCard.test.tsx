import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import LoginCard from "../LoginCard";

const LOGIN_URL = "http://127.0.0.1:5050/api/auth/login";

type LoginResponse = {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  error?: string;
};

const mockResponse = (payload: LoginResponse, ok: boolean): Response =>
  ({
    ok,
    json: async () => payload,
  } as Response);

describe("LoginCard Component", () => {
  const saveAuthMock = vi.fn<AuthStoreAPI["saveAuth"]>();
  const loadAuthMock = vi.fn<AuthStoreAPI["loadAuth"]>();
  const clearAuthMock = vi.fn<AuthStoreAPI["clearAuth"]>();
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    global.fetch = fetchMock as typeof fetch;
    window.authStore = {
      saveAuth: saveAuthMock,
      loadAuth: loadAuthMock,
      clearAuth: clearAuthMock,
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
    delete window.authStore;
  });

  it("renders the login form", () => {
    render(<LoginCard />);
    expect(screen.getByPlaceholderText("johndoe@example.com")).toBeTruthy();
    expect(screen.getByPlaceholderText("********")).toBeTruthy();
    expect(screen.getByText("Login")).toBeTruthy();
  });

  it("shows validation for empty credentials", async () => {
    render(<LoginCard />);

    fireEvent.click(screen.getByText("Login"));

    expect(
      await screen.findByText(/enter both email and password/i)
    ).toBeTruthy();
  });

  it("handles login error", async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse({ error: "Invalid credentials" }, false)
    );

    render(<LoginCard />);

    fireEvent.change(screen.getByPlaceholderText("johndoe@example.com"), {
      target: { value: "johndoe@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("********"), {
      target: { value: "wrongpassword" },
    });
    fireEvent.click(screen.getByText("Login"));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        LOGIN_URL,
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "johndoe@example.com",
            password: "wrongpassword",
          }),
        })
      );
    });

    expect(await screen.findByText(/invalid credentials/i)).toBeTruthy();
  });

  it("handles successful login and stores token", async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse(
        {
          access_token: "token123",
          token_type: "Bearer",
          expires_in: 3600,
        },
        true
      )
    );

    render(<LoginCard />);

    fireEvent.change(screen.getByPlaceholderText("johndoe@example.com"), {
      target: { value: "johndoe@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("********"), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByText("Login"));

    await waitFor(() => {
      expect(saveAuthMock).toHaveBeenCalledWith({
        accessToken: "token123",
        tokenType: "Bearer",
        expiresIn: 3600,
        email: "johndoe@example.com",
      });
    });

    expect(await screen.findByText(/signed in successfully/i)).toBeTruthy();
  });

  it("toggles password visibility", () => {
    render(<LoginCard />);

    const passwordInput = screen.getByPlaceholderText(
      "********"
    ) as HTMLInputElement;
    const toggleButton = screen.getByText("Show");

    expect(passwordInput.type).toBe("password");
    fireEvent.click(toggleButton);
    expect(passwordInput.type).toBe("text");
  });

  it("shows and hides the help modal", () => {
    render(<LoginCard />);

    fireEvent.click(screen.getByText("Can't log in?"));
    expect(
      screen.getByRole("heading", { name: "Can't log in?" })
    ).toBeTruthy();
    expect(screen.getByText(/recover access/i)).toBeTruthy();

    fireEvent.click(screen.getByText("Close"));
    expect(screen.queryByText(/recover access/i)).toBeNull();
  });

  it("validates 2FA code when enabled", async () => {
    render(<LoginCard />);

    fireEvent.click(screen.getByText(/secure login with 2fa/i));
    fireEvent.change(screen.getByPlaceholderText("johndoe@example.com"), {
      target: { value: "johndoe@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("********"), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByPlaceholderText("123456"), {
      target: { value: "12" },
    });

    fireEvent.click(screen.getByText("Login"));

    expect(await screen.findByText(/valid 6-digit 2fa code/i)).toBeTruthy();
  });

  it("includes 2FA code in login payload when enabled", async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse(
        {
          access_token: "token123",
          token_type: "Bearer",
          expires_in: 3600,
        },
        true
      )
    );

    render(<LoginCard />);

    fireEvent.click(screen.getByText(/secure login with 2fa/i));
    fireEvent.change(screen.getByPlaceholderText("johndoe@example.com"), {
      target: { value: "johndoe@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("********"), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByPlaceholderText("123456"), {
      target: { value: "654321" },
    });

    fireEvent.click(screen.getByText("Login"));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        LOGIN_URL,
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            email: "johndoe@example.com",
            password: "password123",
            otp: "654321",
          }),
        })
      );
    });
  });
});
