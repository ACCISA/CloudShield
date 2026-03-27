import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AuthPage from "../AuthPage";
import { apiPost } from "../../api/client";

// ---- Mocks ----
jest.mock("../../lib/analytics", () => ({
  trackButton: jest.fn(),
}));

jest.mock("../../api/client", () => ({
  apiPost: jest.fn(),
}));

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

// Make MUI sx testable in JSDOM by mapping `sx` -> inline `style`
jest.mock("@mui/material", () => {
  const React = require("react");

  const Box = ({ sx, style, children, ...rest }) => (
    <div style={{ ...(sx || {}), ...(style || {}) }} {...rest}>
      {children}
    </div>
  );

  const Alert = ({ children, ...rest }) => (
    <div role="alert" {...rest}>
      {children}
    </div>
  );

  const Typography = ({ children, ...rest }) => <div {...rest}>{children}</div>;

  return { Box, Alert, Typography };
});

// Mock layout wrapper to avoid nested MUI sx complications
jest.mock("../../components/layout/PageShell.jsx", () => {
  const React = require("react");
  return function MockPageShell({ children }) {
    return <div data-testid="page-shell">{children}</div>;
  };
});

// Mock auth UI components to keep tests deterministic
jest.mock("../../components/auth/AuthCard.jsx", () => {
  const React = require("react");
  return function MockAuthCard({ children }) {
    return <div data-testid="auth-card">{children}</div>;
  };
});

jest.mock("../../components/auth/AuthTextField.jsx", () => {
  const React = require("react");
  return function MockAuthTextField({
    label,
    placeholder,
    value,
    onChange,
    onKeyDown,
  }) {
    return (
      <input
        aria-label={label}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
      />
    );
  };
});

jest.mock("../../components/auth/PasswordField.jsx", () => {
  const React = require("react");
  return function MockPasswordField({ label, value, onChange, onKeyDown }) {
    return (
      <input
        aria-label={label}
        type="password"
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
      />
    );
  };
});

jest.mock("../../components/auth/PrimaryButton.jsx", () => {
  const React = require("react");
  return function MockPrimaryButton({ children, onClick, disabled }) {
    return (
      <button type="button" onClick={onClick} disabled={disabled}>
        {children}
      </button>
    );
  };
});

/**
 * Build a fetch Response-like object compatible with AuthPage.safeReadJson
 */
const buildResponse = ({
  ok = true,
  status = 200,
  text = "",
  contentType = "text/plain",
} = {}) => ({
  ok,
  status,
  headers: {
    get: (key) => (key?.toLowerCase() === "content-type" ? contentType : ""),
  },
  text: async () => text,
  json: async () => JSON.parse(text), // throws on invalid JSON when contentType is JSON
});

describe("AuthPage", () => {
  const mockOnLoginSuccess = jest.fn();

  beforeEach(() => {
    mockOnLoginSuccess.mockClear();
    apiPost.mockReset();
    mockNavigate.mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const getPasswordInput = (container) => {
    return container.querySelector('input[type="password"]');
  };

  it("renders login form with all elements", () => {
    const { container } = render(
      <AuthPage onLoginSuccess={mockOnLoginSuccess} />,
    );
    expect(
      screen.getByPlaceholderText("johndoe@example.com"),
    ).toBeInTheDocument();
    expect(getPasswordInput(container)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /sign in/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Don't have an account? Sign up"),
    ).toBeInTheDocument();
  });

  it("navigates to signup when clicking the signup link", () => {
    render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);
    fireEvent.click(screen.getByText("Don't have an account? Sign up"));
    expect(mockNavigate).toHaveBeenCalledWith("/signup");
  });

  it("updates email input when typing", () => {
    render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);
    const emailInput = screen.getByPlaceholderText("johndoe@example.com");
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    expect(emailInput).toHaveValue("test@example.com");
  });

  it("updates password input when typing", () => {
    const { container } = render(
      <AuthPage onLoginSuccess={mockOnLoginSuccess} />,
    );
    const passwordInput = getPasswordInput(container);
    fireEvent.change(passwordInput, { target: { value: "mypassword123" } });
    expect(passwordInput).toHaveValue("mypassword123");
  });

  it("shows error when submitting empty form", async () => {
    render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);

    const loginButton = screen.getByRole("button", { name: /sign in/i });

    // Validation is enforced by disabling the button (no error message rendered)
    expect(loginButton).toBeDisabled();

    fireEvent.click(loginButton);

    // Should not submit
    expect(apiPost).not.toHaveBeenCalled();
    expect(mockOnLoginSuccess).not.toHaveBeenCalled();
  });

  it("shows error when submitting with only email", async () => {
    render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);

    const emailInput = screen.getByPlaceholderText("johndoe@example.com");
    const loginButton = screen.getByRole("button", { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: "test@example.com" } });

    // Still invalid -> button stays disabled
    expect(loginButton).toBeDisabled();

    fireEvent.click(loginButton);

    // Should not submit
    expect(apiPost).not.toHaveBeenCalled();
    expect(mockOnLoginSuccess).not.toHaveBeenCalled();
  });

  it("shows error when submitting with only password", async () => {
    const { container } = render(
      <AuthPage onLoginSuccess={mockOnLoginSuccess} />,
    );

    const passwordInput = getPasswordInput(container);
    const loginButton = screen.getByRole("button", { name: /sign in/i });

    fireEvent.change(passwordInput, { target: { value: "password123" } });

    // Still invalid -> button stays disabled
    expect(loginButton).toBeDisabled();

    fireEvent.click(loginButton);

    // Should not submit
    expect(apiPost).not.toHaveBeenCalled();
    expect(mockOnLoginSuccess).not.toHaveBeenCalled();
  });

  it("successfully logs in with valid credentials", async () => {
    const mockResponse = {
      access_token: "test-token-123",
      user: { id: "1", email: "test@example.com", role: "admin" },
    };

    apiPost.mockResolvedValueOnce(
      buildResponse({
        ok: true,
        text: JSON.stringify(mockResponse),
        contentType: "application/json",
      }),
    );

    const { container } = render(
      <AuthPage onLoginSuccess={mockOnLoginSuccess} />,
    );

    const emailInput = screen.getByPlaceholderText("johndoe@example.com");
    const passwordInput = getPasswordInput(container);
    const loginButton = screen.getByRole("button", { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "password123" } });
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(apiPost).toHaveBeenCalledWith("/auth/login", {
        email: "test@example.com",
        password: "password123",
      });
    });

    await waitFor(() => {
      expect(mockOnLoginSuccess).toHaveBeenCalledWith(mockResponse);
    });
  });

  it("shows error message on failed login (401)", async () => {
    apiPost.mockResolvedValueOnce(
      buildResponse({
        ok: false,
        status: 401,
        text: JSON.stringify({ error: "Invalid credentials" }),
        contentType: "application/json",
      }),
    );

    const { container } = render(
      <AuthPage onLoginSuccess={mockOnLoginSuccess} />,
    );

    const emailInput = screen.getByPlaceholderText("johndoe@example.com");
    const passwordInput = getPasswordInput(container);
    const loginButton = screen.getByRole("button", { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: "wrong@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "wrongpassword" } });
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(screen.getByText("Invalid credentials")).toBeInTheDocument();
    });

    expect(mockOnLoginSuccess).not.toHaveBeenCalled();
  });

  it("shows generic error on server error (500)", async () => {
    apiPost.mockResolvedValueOnce(
      buildResponse({
        ok: false,
        status: 500,
        text: JSON.stringify({ error: "Internal server error" }),
        contentType: "application/json",
      }),
    );

    const { container } = render(
      <AuthPage onLoginSuccess={mockOnLoginSuccess} />,
    );

    const emailInput = screen.getByPlaceholderText("johndoe@example.com");
    const passwordInput = getPasswordInput(container);
    const loginButton = screen.getByRole("button", { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "password123" } });
    fireEvent.click(loginButton);

    await waitFor(() => {
      // Generic 5xx message from getAuthErrorMessage
      expect(screen.getByText(/trouble signing you in/i)).toBeInTheDocument();
    });

    expect(mockOnLoginSuccess).not.toHaveBeenCalled();
  });

  it("shows 403-specific message", async () => {
    apiPost.mockResolvedValueOnce(
      buildResponse({
        ok: false,
        status: 403,
        text: JSON.stringify({}),
        contentType: "application/json",
      }),
    );

    const { container } = render(
      <AuthPage onLoginSuccess={mockOnLoginSuccess} />,
    );
    const emailInput = screen.getByPlaceholderText("johndoe@example.com");
    const passwordInput = getPasswordInput(container);

    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/don’t have permission/i)).toBeInTheDocument();
    });
  });

  it("parses non-JSON error text responses", async () => {
    apiPost.mockResolvedValueOnce(
      buildResponse({
        ok: false,
        status: 401,
        text: "Plain text auth error",
        contentType: "text/plain",
      }),
    );

    const { container } = render(
      <AuthPage onLoginSuccess={mockOnLoginSuccess} />,
    );
    const emailInput = screen.getByPlaceholderText("johndoe@example.com");
    const passwordInput = getPasswordInput(container);

    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText("Plain text auth error")).toBeInTheDocument();
    });
  });

  it("shows default error message when response has no error field", async () => {
    apiPost.mockResolvedValueOnce(
      buildResponse({
        ok: false,
        status: 400,
        text: JSON.stringify({}),
        contentType: "application/json",
      }),
    );

    const { container } = render(
      <AuthPage onLoginSuccess={mockOnLoginSuccess} />,
    );

    const emailInput = screen.getByPlaceholderText("johndoe@example.com");
    const passwordInput = getPasswordInput(container);
    const loginButton = screen.getByRole("button", { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "password123" } });
    fireEvent.click(loginButton);

    await waitFor(() => {
      // Default 400 message from getAuthErrorMessage
      expect(
        screen.getByText(/please check your email and password/i),
      ).toBeInTheDocument();
    });

    expect(mockOnLoginSuccess).not.toHaveBeenCalled();
  });

  it("handles network errors gracefully", async () => {
    apiPost.mockRejectedValueOnce(new Error("Network error"));

    const { container } = render(
      <AuthPage onLoginSuccess={mockOnLoginSuccess} />,
    );

    const emailInput = screen.getByPlaceholderText("johndoe@example.com");
    const passwordInput = getPasswordInput(container);
    const loginButton = screen.getByRole("button", { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "password123" } });
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });

    expect(mockOnLoginSuccess).not.toHaveBeenCalled();
  });

  it("shows loading state while submitting", async () => {
    let resolveFetch;
    const pending = new Promise((resolve) => {
      resolveFetch = resolve;
    });

    apiPost.mockImplementationOnce(() => pending);

    const { container } = render(
      <AuthPage onLoginSuccess={mockOnLoginSuccess} />,
    );

    const emailInput = screen.getByPlaceholderText("johndoe@example.com");
    const passwordInput = getPasswordInput(container);

    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "password123" } });

    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    // Button should switch to loading label + be disabled
    const loadingBtn = await screen.findByRole("button", {
      name: /signing in/i,
    });
    expect(loadingBtn).toBeDisabled();

    // resolve request
    resolveFetch(
      buildResponse({
        ok: true,
        text: JSON.stringify({}),
        contentType: "application/json",
      }),
    );

    await waitFor(() => {
      expect(mockOnLoginSuccess).toHaveBeenCalledWith({});
    });
  });

  it("allows login via Enter key in email field", async () => {
    const mockResponse = {
      access_token: "test-token-123",
      user: { id: "1", email: "test@example.com" },
    };

    apiPost.mockResolvedValueOnce(
      buildResponse({
        ok: true,
        text: JSON.stringify(mockResponse),
        contentType: "application/json",
      }),
    );

    const user = userEvent.setup();
    const { container } = render(
      <AuthPage onLoginSuccess={mockOnLoginSuccess} />,
    );

    const emailInput = screen.getByPlaceholderText("johndoe@example.com");
    const passwordInput = getPasswordInput(container);

    await user.type(emailInput, "test@example.com");
    await user.type(passwordInput, "password123");
    await user.type(emailInput, "{enter}");

    await waitFor(() => {
      expect(apiPost).toHaveBeenCalled();
    });
  });

  it("allows login via Enter key in password field", async () => {
    const mockResponse = {
      access_token: "test-token-123",
      user: { id: "1", email: "test@example.com" },
    };

    apiPost.mockResolvedValueOnce(
      buildResponse({
        ok: true,
        text: JSON.stringify(mockResponse),
        contentType: "application/json",
      }),
    );

    const user = userEvent.setup();
    const { container } = render(
      <AuthPage onLoginSuccess={mockOnLoginSuccess} />,
    );

    const emailInput = screen.getByPlaceholderText("johndoe@example.com");
    const passwordInput = getPasswordInput(container);

    await user.type(emailInput, "test@example.com");
    await user.type(passwordInput, "password123");
    await user.type(passwordInput, "{enter}");

    await waitFor(() => {
      expect(apiPost).toHaveBeenCalled();
    });
  });

  it("works without onLoginSuccess callback", async () => {
    const mockResponse = {
      access_token: "test-token-123",
      user: { id: "1", email: "test@example.com" },
    };

    apiPost.mockResolvedValueOnce(
      buildResponse({
        ok: true,
        text: JSON.stringify(mockResponse),
        contentType: "application/json",
      }),
    );

    const { container } = render(<AuthPage />);

    const emailInput = screen.getByPlaceholderText("johndoe@example.com");
    const passwordInput = getPasswordInput(container);
    const loginButton = screen.getByRole("button", { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "password123" } });
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(apiPost).toHaveBeenCalled();
    });

    // Should not throw error even without callback
    expect(mockOnLoginSuccess).not.toHaveBeenCalled();
  });

  it("renders auth page root and auth card", () => {
    const { container } = render(
      <AuthPage onLoginSuccess={mockOnLoginSuccess} />,
    );
    expect(container.querySelector(".auth-page")).toBeInTheDocument();
    expect(screen.getByTestId("auth-card")).toBeInTheDocument();
  });

  it("handles empty response body on success", async () => {
    apiPost.mockResolvedValueOnce(
      buildResponse({
        ok: true,
        text: "",
        contentType: "application/json",
      }),
    );

    const user = userEvent.setup();
    const { container } = render(
      <AuthPage onLoginSuccess={mockOnLoginSuccess} />,
    );

    await user.type(
      screen.getByPlaceholderText("johndoe@example.com"),
      "test@example.com",
    );
    await user.type(getPasswordInput(container), "password123");
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(mockOnLoginSuccess).toHaveBeenCalledWith({});
    });
  });

  it("handles invalid JSON response body", async () => {
    apiPost.mockResolvedValueOnce(
      buildResponse({
        ok: true,
        text: "{bad json",
        contentType: "application/json",
      }),
    );

    const user = userEvent.setup();
    const { container } = render(
      <AuthPage onLoginSuccess={mockOnLoginSuccess} />,
    );

    await user.type(
      screen.getByPlaceholderText("johndoe@example.com"),
      "test@example.com",
    );
    await user.type(getPasswordInput(container), "password123");
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(mockOnLoginSuccess).toHaveBeenCalledWith({});
    });
  });

  it("uses fallback error message when catch receives no error message", async () => {
    apiPost.mockRejectedValueOnce(null);

    const user = userEvent.setup();
    const { container } = render(
      <AuthPage onLoginSuccess={mockOnLoginSuccess} />,
    );

    await user.type(
      screen.getByPlaceholderText("johndoe@example.com"),
      "test@example.com",
    );
    await user.type(getPasswordInput(container), "password123");
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(
        screen.getByText("Login failed. Please try again."),
      ).toBeInTheDocument();
    });

    expect(mockOnLoginSuccess).not.toHaveBeenCalled();
  });
});
