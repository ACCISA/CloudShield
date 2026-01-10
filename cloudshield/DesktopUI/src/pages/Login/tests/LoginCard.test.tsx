import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import LoginCard from "../LoginCard";

describe("LoginCard Component", () => {
  const consoleLogMock = vi.spyOn(console, "log").mockImplementation(() => {});
  const consoleErrorMock = vi
    .spyOn(console, "error")
    .mockImplementation(() => {});
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
    consoleLogMock.mockReset();
    consoleErrorMock.mockReset();
  });

  it("renders the LoginCard", () => {
    const { container } = render(<LoginCard />);
    expect(container).toBeTruthy();
  });

  it("renders the CloudShield logo", () => {
    render(<LoginCard />);
    const logo = screen.getByAltText("cloudShieldLogo");
    expect(logo).toBeTruthy();
  });

  it("renders login button", () => {
    render(<LoginCard />);
    const button = screen.queryAllByRole("button");
    expect(button.length).toBeGreaterThan(0);
  });

  it("rejects empty email and password", async () => {
    render(<LoginCard />);
    window.alert = vi.fn();
    await waitFor(() => {
      expect(window.alert).not.toHaveBeenCalled();
    });
    const button = screen.getByText("Login");
    button.click();

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalled();
    });
  });

  it("handles login error", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Invalid credentials" }),
    });

    render(<LoginCard />);

    const emailInput = screen.getByPlaceholderText(
      "johndoe@example.com"
    ) as HTMLInputElement;
    const passwordInput = screen.getByPlaceholderText(
      "********"
    ) as HTMLInputElement;
    const button = screen.getByText("Login");

    fireEvent.change(emailInput, { target: { value: "johndoe@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "wrongpassword" } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "http://172.23.0.2:5050/api/auth/login",
        expect.objectContaining({
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: "johndoe@example.com",
            password: "wrongpassword",
          }),
        })
      );
      expect(consoleErrorMock).toHaveBeenLastCalledWith(
        "Login error:",
        "Invalid credentials"
      );
    });
  });

  it("handles successful login", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(<LoginCard />);

    const emailInput = screen.getByPlaceholderText(
      "johndoe@example.com"
    ) as HTMLInputElement;
    const passwordInput = screen.getByPlaceholderText(
      "********"
    ) as HTMLInputElement;
    const button = screen.getByText("Login");

    fireEvent.change(emailInput, { target: { value: "johndoe@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "password123" } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "http://172.23.0.2:5050/api/auth/login",
        expect.objectContaining({
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: "johndoe@example.com",
            password: "password123",
          }),
        })
      );
      expect(consoleLogMock).toHaveBeenLastCalledWith("Login successful:", {
        success: true,
      });
    });
  });

  it("displays logo image with correct alt text", () => {
    render(<LoginCard />);
    const logo = screen.getByAltText("cloudShieldLogo") as HTMLImageElement;
    expect(logo).toBeTruthy();
    expect(logo.alt).toContain("cloudShieldLogo");
  });

  it("toggles password visibility", () => {
    render(<LoginCard />);
    const passwordInput = screen.getByPlaceholderText(
      "********"
    ) as HTMLInputElement;
    const toggleButton = screen.getByText("Hide");

    expect(passwordInput.type).toBe("password");
    fireEvent.change(passwordInput, { target: { value: "test" } });
    expect(passwordInput.value).toBe("test");

    fireEvent.click(toggleButton);
    expect(passwordInput.type).toBe("text");
  });

  it("shows the searching state when the demo button is clicked", () => {
    render(<LoginCard />);
    const demoButton = screen.getByText("Search Demo");
    expect(screen.queryByAltText("searchIcon")).toBeNull();
    expect(screen.queryByText("Searching...")).toBeNull();

    fireEvent.click(demoButton);

    expect(screen.getByAltText("searchIcon")).toBeTruthy();
    expect(screen.getByText("Searching...")).toBeTruthy();
  });
});
