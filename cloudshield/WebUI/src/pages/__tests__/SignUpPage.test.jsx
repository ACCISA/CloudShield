import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { BrowserRouter } from "react-router-dom";
import SignupPage from "../SignUpPage";

// Mock dependencies
jest.mock("../../components/signup/SignupCard", () => {
  return function MockSignupCard({ children }) {
    return <div data-testid="signup-card">{children}</div>;
  };
});

jest.mock("../../components/signup/PlanCard", () => {
  return function MockPlanCard({ plan, selected, onSelect }) {
    return (
      <div
        data-testid={`plan-card-${plan.id}`}
        onClick={() => onSelect(plan.id)}
        style={{ border: selected ? "2px solid green" : "1px solid gray" }}
      >
        {plan.name} - ${plan.price}
      </div>
    );
  };
});

jest.mock("../../components/auth/AuthTextField", () => {
  return function MockAuthTextField({ label, value, onChange, placeholder }) {
    return (
      <input
        data-testid={`auth-field-${label.toLowerCase().replace(/\s/g, "-")}`}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        aria-label={label}
      />
    );
  };
});

jest.mock("../../components/auth/PasswordField", () => {
  return function MockPasswordField({ label, value, onChange }) {
    return (
      <input
        data-testid="password-field"
        type="password"
        value={value}
        onChange={onChange}
        aria-label={label}
      />
    );
  };
});

jest.mock("../../components/auth/PrimaryButton", () => {
  return function MockPrimaryButton({ children, onClick, disabled }) {
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        data-testid="primary-button"
      >
        {children}
      </button>
    );
  };
});

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

describe("SignupPage", () => {
  let mockFetch;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch = jest.fn();
    global.fetch = mockFetch;
    Storage.prototype.setItem = jest.fn();
    Storage.prototype.getItem = jest.fn();
  });

  const renderSignupPage = (props = {}) => {
    return render(
      <BrowserRouter>
        <SignupPage {...props} />
      </BrowserRouter>,
    );
  };

  it("renders the signup form", () => {
    renderSignupPage();

    expect(screen.getByText("Create Your Organization")).toBeInTheDocument();
    expect(screen.getByTestId("auth-field-email")).toBeInTheDocument();
    expect(screen.getByTestId("password-field")).toBeInTheDocument();
    expect(screen.getByTestId("auth-field-company-name")).toBeInTheDocument();
    expect(
      screen.getByTestId("auth-field-organization-id"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("primary-button")).toBeInTheDocument();
  });

  it("renders all plan cards", () => {
    renderSignupPage();

    expect(screen.getByTestId("plan-card-basic")).toBeInTheDocument();
    expect(screen.getByTestId("plan-card-pro")).toBeInTheDocument();
    expect(screen.getByTestId("plan-card-enterprise")).toBeInTheDocument();
  });

  it("updates email field", () => {
    renderSignupPage();

    const emailInput = screen.getByTestId("auth-field-email");
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });

    expect(emailInput.value).toBe("test@example.com");
  });

  it("updates password field", () => {
    renderSignupPage();

    const passwordInput = screen.getByTestId("password-field");
    fireEvent.change(passwordInput, { target: { value: "password123" } });

    expect(passwordInput.value).toBe("password123");
  });

  it("updates company name field", () => {
    renderSignupPage();

    const companyInput = screen.getByTestId("auth-field-company-name");
    fireEvent.change(companyInput, { target: { value: "Acme Corp" } });

    expect(companyInput.value).toBe("Acme Corp");
  });

  it("updates org id field and sanitizes input", () => {
    renderSignupPage();

    const orgIdInput = screen.getByTestId("auth-field-organization-id");
    fireEvent.change(orgIdInput, { target: { value: "Acme@123!" } });

    expect(orgIdInput.value).toBe("acme123");
  });

  it("selects a plan when plan card is clicked", () => {
    renderSignupPage();

    const basicPlanCard = screen.getByTestId("plan-card-basic");
    fireEvent.click(basicPlanCard);

    // Pro is default, check if basic is now selected by border style
    expect(basicPlanCard).toHaveStyle({ border: "2px solid green" });
  });

  it("shows validation error for invalid email", async () => {
    renderSignupPage();

    fireEvent.change(screen.getByTestId("auth-field-email"), {
      target: { value: "invalid-email" },
    });
    fireEvent.change(screen.getByTestId("password-field"), {
      target: { value: "pass123" },
    });
    fireEvent.change(screen.getByTestId("auth-field-company-name"), {
      target: { value: "Acme" },
    });
    fireEvent.change(screen.getByTestId("auth-field-organization-id"), {
      target: { value: "acme" },
    });

    fireEvent.click(screen.getByTestId("primary-button"));

    await waitFor(() => {
      expect(screen.getByText("Invalid email format.")).toBeInTheDocument();
    });

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("shows error for invalid email format", async () => {
    renderSignupPage();

    const emailInput = screen.getByTestId("auth-field-email");
    fireEvent.change(emailInput, { target: { value: "invalid-email" } });

    const submitButton = screen.getByTestId("primary-button");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Invalid email format.")).toBeInTheDocument();
    });
  });

  it("shows error for short password", async () => {
    renderSignupPage();

    const passwordInput = screen.getByTestId("password-field");
    fireEvent.change(passwordInput, { target: { value: "123" } });

    const submitButton = screen.getByTestId("primary-button");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText("Password must be at least 6 characters."),
      ).toBeInTheDocument();
    });
  });

  it("shows error for missing company name", async () => {
    renderSignupPage();

    const companyInput = screen.getByTestId("auth-field-company-name");
    fireEvent.change(companyInput, { target: { value: "" } });

    const submitButton = screen.getByTestId("primary-button");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Company name is required.")).toBeInTheDocument();
    });
  });

  it("handles server validation error", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ errors: { email: "Email already exists." } }),
    });

    renderSignupPage();

    const emailInput = screen.getByTestId("auth-field-email");
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });

    const submitButton = screen.getByTestId("primary-button");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Email already exists.")).toBeInTheDocument();
    });
  });

  it("handles server conflict error", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({ message: "Organization already exists." }),
    });

    renderSignupPage();

    const submitButton = screen.getByTestId("primary-button");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText("Organization already exists."),
      ).toBeInTheDocument();
    });
  });

  it("handles unexpected server error", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ message: "Unexpected error occurred." }),
    });

    renderSignupPage();

    const submitButton = screen.getByTestId("primary-button");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText("Unexpected error occurred."),
      ).toBeInTheDocument();
    });
  });

  it("handles successful signup", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        access_token: "mock-token",
        org: {
          org_id: "org123",
          company_name: "Test Company",
          package_type: "pro",
        },
      }),
    });

    const onSignupSuccess = jest.fn();
    renderSignupPage({ onSignupSuccess });

    const submitButton = screen.getByTestId("primary-button");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(onSignupSuccess).toHaveBeenCalledWith({
        access_token: "mock-token",
        user: {
          email: "",
          org_id: "org123",
          company_name: "Test Company",
          plan: "pro",
        },
      });
    });
  });

  it("submits form successfully and navigates to provisioning", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        token: "test-jwt-token",
        user: {
          email: "test@example.com",
          company_name: "Acme",
          org_id: "acme",
          plan: "pro",
        },
      }),
    });

    const mockOnSignupSuccess = jest.fn();
    renderSignupPage({ onSignupSuccess: mockOnSignupSuccess });

    fireEvent.change(screen.getByTestId("auth-field-email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByTestId("password-field"), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByTestId("auth-field-company-name"), {
      target: { value: "Acme" },
    });
    fireEvent.change(screen.getByTestId("auth-field-organization-id"), {
      target: { value: "acme" },
    });

    fireEvent.click(screen.getByTestId("primary-button"));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "test@example.com",
          password: "password123",
          company_name: "Acme",
          org_id: "acme",
          plan: "pro",
        }),
      });
    });

    await waitFor(() => {
      expect(localStorage.setItem).toHaveBeenCalledWith(
        "jwt",
        "test-jwt-token",
      );
      expect(mockOnSignupSuccess).toHaveBeenCalledWith({
        token: "test-jwt-token",
        user: {
          email: "test@example.com",
          company_name: "Acme",
          org_id: "acme",
          plan: "pro",
        },
      });
      expect(mockNavigate).toHaveBeenCalledWith("/provisioning", {
        replace: true,
      });
    });
  });

  it("handles 400 error with field-specific errors", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({
        errors: {
          email: "Email already exists",
          orgId: "Organization ID taken",
        },
      }),
    });

    renderSignupPage();

    fireEvent.change(screen.getByTestId("auth-field-email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByTestId("password-field"), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByTestId("auth-field-company-name"), {
      target: { value: "Acme" },
    });
    fireEvent.change(screen.getByTestId("auth-field-organization-id"), {
      target: { value: "acme" },
    });

    fireEvent.click(screen.getByTestId("primary-button"));

    await waitFor(() => {
      expect(screen.getByText("Email already exists")).toBeInTheDocument();
      expect(screen.getByText("Organization ID taken")).toBeInTheDocument();
    });
  });

  it("handles 400 error with general message", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({
        message: "Invalid request data",
      }),
    });

    renderSignupPage();

    fireEvent.change(screen.getByTestId("auth-field-email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByTestId("password-field"), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByTestId("auth-field-company-name"), {
      target: { value: "Acme" },
    });
    fireEvent.change(screen.getByTestId("auth-field-organization-id"), {
      target: { value: "acme" },
    });

    fireEvent.click(screen.getByTestId("primary-button"));

    await waitFor(() => {
      expect(screen.getByText("Invalid request data")).toBeInTheDocument();
    });
  });

  it("handles 409 conflict error", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({
        message: "Organization already exists",
      }),
    });

    renderSignupPage();

    fireEvent.change(screen.getByTestId("auth-field-email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByTestId("password-field"), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByTestId("auth-field-company-name"), {
      target: { value: "Acme" },
    });
    fireEvent.change(screen.getByTestId("auth-field-organization-id"), {
      target: { value: "acme" },
    });

    fireEvent.click(screen.getByTestId("primary-button"));

    await waitFor(() => {
      expect(
        screen.getByText("Organization already exists"),
      ).toBeInTheDocument();
    });
  });

  it("handles generic server error", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({
        message: "Internal server error",
      }),
    });

    renderSignupPage();

    fireEvent.change(screen.getByTestId("auth-field-email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByTestId("password-field"), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByTestId("auth-field-company-name"), {
      target: { value: "Acme" },
    });
    fireEvent.change(screen.getByTestId("auth-field-organization-id"), {
      target: { value: "acme" },
    });

    fireEvent.click(screen.getByTestId("primary-button"));

    await waitFor(() => {
      expect(screen.getByText("Internal server error")).toBeInTheDocument();
    });
  });

  it("handles network error", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    renderSignupPage();

    fireEvent.change(screen.getByTestId("auth-field-email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByTestId("password-field"), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByTestId("auth-field-company-name"), {
      target: { value: "Acme" },
    });
    fireEvent.change(screen.getByTestId("auth-field-organization-id"), {
      target: { value: "acme" },
    });

    fireEvent.click(screen.getByTestId("primary-button"));

    await waitFor(() => {
      expect(screen.getByText(/Network error/)).toBeInTheDocument();
    });
  });

  it("disables submit button while submitting", async () => {
    mockFetch.mockImplementationOnce(
      () => new Promise((resolve) => setTimeout(resolve, 1000)),
    );

    renderSignupPage();

    fireEvent.change(screen.getByTestId("auth-field-email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByTestId("password-field"), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByTestId("auth-field-company-name"), {
      target: { value: "Acme" },
    });
    fireEvent.change(screen.getByTestId("auth-field-organization-id"), {
      target: { value: "acme" },
    });

    fireEvent.click(screen.getByTestId("primary-button"));

    await waitFor(() => {
      expect(screen.getByTestId("primary-button")).toBeDisabled();
      expect(screen.getByText("Creating...")).toBeInTheDocument();
    });
  });

  it("handles malformed JSON response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => {
        throw new Error("Invalid JSON");
      },
    });

    renderSignupPage();

    fireEvent.change(screen.getByTestId("auth-field-email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByTestId("password-field"), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByTestId("auth-field-company-name"), {
      target: { value: "Acme" },
    });
    fireEvent.change(screen.getByTestId("auth-field-organization-id"), {
      target: { value: "acme" },
    });

    fireEvent.click(screen.getByTestId("primary-button"));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/provisioning", {
        replace: true,
      });
    });
  });

  it("handles localStorage errors gracefully", async () => {
    Storage.prototype.setItem = jest.fn(() => {
      throw new Error("Storage quota exceeded");
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        token: "test-jwt-token",
        user: { email: "test@example.com" },
      }),
    });

    renderSignupPage();

    fireEvent.change(screen.getByTestId("auth-field-email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByTestId("password-field"), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByTestId("auth-field-company-name"), {
      target: { value: "Acme" },
    });
    fireEvent.change(screen.getByTestId("auth-field-organization-id"), {
      target: { value: "acme" },
    });

    fireEvent.click(screen.getByTestId("primary-button"));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/provisioning", {
        replace: true,
      });
    });
  });

  it("uses access_token if token is not present", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        access_token: "test-access-token",
        user: { email: "test@example.com" },
      }),
    });

    renderSignupPage();

    fireEvent.change(screen.getByTestId("auth-field-email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByTestId("password-field"), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByTestId("auth-field-company-name"), {
      target: { value: "Acme" },
    });
    fireEvent.change(screen.getByTestId("auth-field-organization-id"), {
      target: { value: "acme" },
    });

    fireEvent.click(screen.getByTestId("primary-button"));

    await waitFor(() => {
      expect(localStorage.setItem).toHaveBeenCalledWith(
        "jwt",
        "test-access-token",
      );
    });
  });

  it("clears form errors when resubmitting", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({ message: "Conflict error" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ token: "token", user: {} }),
      });

    renderSignupPage();

    fireEvent.change(screen.getByTestId("auth-field-email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByTestId("password-field"), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByTestId("auth-field-company-name"), {
      target: { value: "Acme" },
    });
    fireEvent.change(screen.getByTestId("auth-field-organization-id"), {
      target: { value: "acme" },
    });

    fireEvent.click(screen.getByTestId("primary-button"));

    await waitFor(() => {
      expect(screen.getByText("Conflict error")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("primary-button"));

    await waitFor(() => {
      expect(screen.queryByText("Conflict error")).not.toBeInTheDocument();
    });
  });

  // ---------------------------
  // ADDITIONS: tests for provisioning errors, token picking, onSignupSuccess shape, and /login navigation
  // ---------------------------

  it("stops after provisioning errors and does not navigate or call onSignupSuccess", async () => {
    // 1) signup/create user succeeds
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        user: {
          email: "test@example.com",
          company_name: "Acme",
          org_id: "acme",
          plan: "pro",
        },
      }),
    });

    // 2) provisioning returns field errors -> provisionErrors is truthy -> setErrors + return
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({
        errors: {
          orgId: "Provisioning failed for org",
        },
      }),
    });

    const mockOnSignupSuccess = jest.fn();
    renderSignupPage({ onSignupSuccess: mockOnSignupSuccess });

    fireEvent.change(screen.getByTestId("auth-field-email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByTestId("password-field"), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByTestId("auth-field-company-name"), {
      target: { value: "Acme" },
    });
    fireEvent.change(screen.getByTestId("auth-field-organization-id"), {
      target: { value: "acme" },
    });

    fireEvent.click(screen.getByTestId("primary-button"));

    await waitFor(() => {
      // should have tried both calls
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    await waitFor(() => {
      // provisioning error should be shown
      expect(
        screen.getByText("Provisioning failed for org"),
      ).toBeInTheDocument();
    });

    expect(mockOnSignupSuccess).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalledWith("/login", { replace: true });
  });

  it("stores token from either createUser or provision response and navigates to /login with fallback user shape", async () => {
    // 1) create user returns no token and no user object -> forces fallback user object
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({}),
    });

    // 2) provision returns access_token -> should be stored + passed
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        access_token: "prov-access-token",
      }),
    });

    const mockOnSignupSuccess = jest.fn();
    renderSignupPage({ onSignupSuccess: mockOnSignupSuccess });

    fireEvent.change(screen.getByTestId("auth-field-email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByTestId("password-field"), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByTestId("auth-field-company-name"), {
      target: { value: "Acme" },
    });
    fireEvent.change(screen.getByTestId("auth-field-organization-id"), {
      target: { value: "acme" },
    });

    fireEvent.click(screen.getByTestId("primary-button"));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    await waitFor(() => {
      // token stored
      expect(localStorage.setItem).toHaveBeenCalledWith(
        "jwt",
        "prov-access-token",
      );
      // callback shape compatible: access_token + user.org_id fallback
      expect(mockOnSignupSuccess).toHaveBeenCalledWith({
        access_token: "prov-access-token",
        user: {
          email: "test@example.com",
          org_id: "acme",
          company_name: "Acme",
          plan: "pro",
        },
      });
      // final navigation after signup + provisioning
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard", {
        replace: true,
      });
    });
  });

  it("sets default form error message when catch receives a non-Error rejection", async () => {
    // Reject with plain object -> err?.message is undefined -> default string
    mockFetch.mockRejectedValueOnce({});

    renderSignupPage();

    fireEvent.change(screen.getByTestId("auth-field-email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByTestId("password-field"), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByTestId("auth-field-company-name"), {
      target: { value: "Acme" },
    });
    fireEvent.change(screen.getByTestId("auth-field-organization-id"), {
      target: { value: "acme" },
    });

    fireEvent.click(screen.getByTestId("primary-button"));

    await waitFor(() => {
      expect(
        screen.getByText("Network error during signup."),
      ).toBeInTheDocument();
    });
  });
});
