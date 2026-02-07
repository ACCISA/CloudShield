import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { BrowserRouter } from "react-router-dom";
import SignupPage from "../SignUpPage";

jest.mock("../../lib/analytics", () => ({
  trackButton: jest.fn(),
}));

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

  const VALID_EMAIL = "test@example.com";
  const VALID_COMPANY = "Acme Corp";
  const VALID_PASSWORD = "ValidPass123!"; // 12+ chars, upper/lower/digit/symbol

  const PASSWORD_REQUIREMENTS_MESSAGE =
    "Password must be 12+ characters and include uppercase, lowercase, numbers, and symbols.";

  function setValidFormValues({ email = VALID_EMAIL, password = VALID_PASSWORD, company = VALID_COMPANY } = {}) {
    fireEvent.change(screen.getByTestId("auth-field-email"), {
      target: { value: email },
    });
    fireEvent.change(screen.getByTestId("password-field"), {
      target: { value: password },
    });
    fireEvent.change(screen.getByTestId("auth-field-company-name"), {
      target: { value: company },
    });
  }

  function makeEmailOfLength(totalLength) {
    const domain = "example.com";
    const localLength = totalLength - domain.length - 1;
    if (localLength <= 0) {
      throw new Error("Requested email length too small");
    }
    return `${"a".repeat(localLength)}@${domain}`;
  }

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

  it("selects a plan when plan card is clicked", () => {
    renderSignupPage();

    const basicPlanCard = screen.getByTestId("plan-card-basic");
    fireEvent.click(basicPlanCard);

    // Pro is default, check if basic is now selected by border style
    expect(basicPlanCard).toHaveStyle({ border: "2px solid green" });
  });

  it("shows validation error for invalid email (isEmailValid)", async () => {
    renderSignupPage();

    setValidFormValues({ email: "invalid-email" });
    fireEvent.click(screen.getByTestId("primary-button"));

    await waitFor(() => {
      expect(screen.getByText("Invalid email format.")).toBeInTheDocument();
    });

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("shows password requirements message for weak password", async () => {
    renderSignupPage();

    setValidFormValues({ password: "password123" }); // missing uppercase + symbol, and <12
    fireEvent.click(screen.getByTestId("primary-button"));

    await waitFor(() => {
      expect(
        screen.getByText(PASSWORD_REQUIREMENTS_MESSAGE),
      ).toBeInTheDocument();
    });
  });

  it("enforces minimum password length of 12 (PASSWORD_MIN_LENGTH)", async () => {
    renderSignupPage();

    // 11 chars, still meets upper/lower/digit/symbol but should fail length
    setValidFormValues({ password: "Aa1!aaaaaaa" });
    fireEvent.click(screen.getByTestId("primary-button"));

    await waitFor(() => {
      expect(
        screen.getByText(PASSWORD_REQUIREMENTS_MESSAGE),
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

  it("rejects emails longer than 254 characters (EMAIL_MAX_LENGTH)", async () => {
    renderSignupPage();

    const tooLongEmail = makeEmailOfLength(255);
    setValidFormValues({ email: tooLongEmail });
    fireEvent.click(screen.getByTestId("primary-button"));

    await waitFor(() => {
      expect(screen.getByText("Invalid email format.")).toBeInTheDocument();
    });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it.each([
    ["empty string", ""],
    ["whitespace-only", "   \n\t"],
    ["missing @", "user.example.com"],
    ["@ at start", "@example.com"],
    ["@ at end", "user@"],
    ["multiple @", "user@@example.com"],
    ["domain missing dot", "user@example"],
    ["dot at domain start", "user@.com"],
    ["dot at domain end", "user@example."],
  ])("isEmailValid rejects %s", async (_label, value) => {
    renderSignupPage();

    setValidFormValues({ email: value });
    fireEvent.click(screen.getByTestId("primary-button"));

    await waitFor(() => {
      expect(screen.getByText("Invalid email format.")).toBeInTheDocument();
    });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("handles server validation error", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ errors: { email: "Email already exists." } }),
    });

    renderSignupPage();

    setValidFormValues();
    fireEvent.click(screen.getByTestId("primary-button"));

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

    setValidFormValues();
    fireEvent.click(screen.getByTestId("primary-button"));

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

    setValidFormValues();
    fireEvent.click(screen.getByTestId("primary-button"));

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
        user_id: "user123",
        org_id: "org123",
        job_id: "job123",
      }),
    });

    const onSignupSuccess = jest.fn();
    renderSignupPage({ onSignupSuccess });

    setValidFormValues();
    fireEvent.click(screen.getByTestId("primary-button"));

    await waitFor(() => {
      expect(onSignupSuccess).toHaveBeenCalledWith({
        access_token: "mock-token",
        user: {
          email: VALID_EMAIL,
          user_id: "user123",
          org_id: "org123",
          company_name: VALID_COMPANY,
          plan: "pro",
          job_id: "job123",
        },
      });
    });

    expect(localStorage.setItem).toHaveBeenCalledWith(
      "user",
      expect.any(String),
    );
    expect(localStorage.setItem).toHaveBeenCalledWith("jwt", "mock-token");

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/auth/signup",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }),
    );
  });

  it("handles 400 error with general message", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ message: "Invalid request data" }),
    });

    renderSignupPage();
    setValidFormValues();
    fireEvent.click(screen.getByTestId("primary-button"));

    await waitFor(() => {
      expect(screen.getByText("Invalid request data")).toBeInTheDocument();
    });
  });

  it("handles network error", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    renderSignupPage();
    setValidFormValues();
    fireEvent.click(screen.getByTestId("primary-button"));

    await waitFor(() => {
      expect(
        screen.getByText("Error during signup. Is the server running?"),
      ).toBeInTheDocument();
    });
  });

  it("disables submit button while submitting", async () => {
    mockFetch.mockImplementationOnce(
      () => new Promise((resolve) => setTimeout(resolve, 1000)),
    );

    renderSignupPage();

    setValidFormValues();

    fireEvent.click(screen.getByTestId("primary-button"));

    await waitFor(() => {
      expect(screen.getByTestId("primary-button")).toBeDisabled();
      expect(screen.getByText("Creating...")).toBeInTheDocument();
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
        json: async () => ({ access_token: "token" }),
      });

    renderSignupPage();
    setValidFormValues();

    fireEvent.click(screen.getByTestId("primary-button"));
    await waitFor(() => {
      expect(screen.getByText("Conflict error")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("primary-button"));
    await waitFor(() => {
      expect(screen.queryByText("Conflict error")).not.toBeInTheDocument();
    });
  });

  it("navigates to /login when clicking the login link", () => {
    renderSignupPage();
    fireEvent.click(screen.getByText("Already have an account? Log in"));
    expect(mockNavigate).toHaveBeenCalledWith("/login");
  });
});
