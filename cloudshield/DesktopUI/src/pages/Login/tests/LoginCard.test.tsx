import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import LoginCard from "../LoginCard";

const LOGIN_URL = "http://127.0.0.1:5050/api/auth/login";

describe("LoginCard Component", () => {
  const saveAuthMock = vi.fn();

  beforeEach(() => {
    (global.fetch as any) = vi.fn();
    (window as any).authStore = {
      saveAuth: saveAuthMock,
      loadAuth: vi.fn(),
      clearAuth: vi.fn(),
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
    delete (window as any).authStore;
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
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Invalid credentials" }),
    });

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
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        access_token: "token123",
        token_type: "Bearer",
        expires_in: 3600,
      }),
    });

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
});
