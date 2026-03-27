import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { BrowserRouter } from "react-router-dom";
import SignupPage from "../SignUpPage";
import { apiPost } from "../../api/client";

jest.mock("../../lib/analytics", () => ({
  trackButton: jest.fn(),
}));

jest.mock("../../api/client", () => ({
  apiPost: jest.fn(),
}));

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
      <button onClick={onClick} disabled={disabled} data-testid="primary-button">
        {children}
      </button>
    );
  };
});

jest.mock("../../components/layout/PageShell", () => {
  return function MockPageShell({ children }) {
    return <div data-testid="page-shell">{children}</div>;
  };
});

jest.mock("../../components/table/TableSurface", () => {
  return function MockTableSurface({ children }) {
    return <div data-testid="table-surface">{children}</div>;
  };
});

jest.mock("../../components/table/TableSkeleton", () => {
  return function MockTableSkeleton({ rows, cols }) {
    return (
      <div
        data-testid="table-skeleton"
        data-rows={rows}
        data-cols={cols}
      />
    );
  };
});

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

describe("SignupPage (additional coverage)", () => {
  let mockFetch;

  const VALID_EMAIL = "test@example.com";
  const VALID_COMPANY = "Acme Corp";
  const VALID_ADMIN_NAME = "Jane Doe";
  const VALID_PASSWORD = "ValidPass123!";

  const renderSignupPage = (props = {}) =>
    render(
      <BrowserRouter>
        <SignupPage {...props} />
      </BrowserRouter>
    );

  const fillValidForm = () => {
    fireEvent.change(screen.getByTestId("auth-field-email"), {
      target: { value: VALID_EMAIL },
    });
    fireEvent.change(screen.getByTestId("password-field"), {
      target: { value: VALID_PASSWORD },
    });
    fireEvent.change(screen.getByTestId("auth-field-admin-name"), {
      target: { value: VALID_ADMIN_NAME },
    });
    fireEvent.change(screen.getByTestId("auth-field-company-name"), {
      target: { value: VALID_COMPANY },
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    apiPost.mockReset();
    mockFetch = jest.fn();
    global.fetch = mockFetch;
    Storage.prototype.setItem = jest.fn();
    Storage.prototype.getItem = jest.fn();
  });

  it("renders inside SignupCard wrapper", () => {
    renderSignupPage();
    expect(screen.getByTestId("signup-card")).toBeInTheDocument();
    expect(screen.getByText("Create Your Organization")).toBeInTheDocument();
  });

  it("shows a submitting state while signup is pending", async () => {
    // Never resolve: keeps submitting=true without flake
    apiPost.mockImplementationOnce(() => new Promise(() => {}));

    renderSignupPage();
    fillValidForm();

    expect(screen.getByTestId("plan-card-basic")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("primary-button"));

    await waitFor(() => {
      expect(screen.getByTestId("primary-button")).toBeDisabled();
      expect(screen.getByText("Redirecting to payment...")).toBeInTheDocument();
    });

    expect(screen.getByTestId("plan-card-basic")).toBeInTheDocument();
    expect(screen.getByTestId("plan-card-pro")).toBeInTheDocument();
    expect(screen.getByTestId("plan-card-enterprise")).toBeInTheDocument();
  });

  it("does not block navigation if localStorage throws", async () => {
    Storage.prototype.setItem = jest.fn(() => {
      throw new Error("Storage quota exceeded");
    });

    apiPost.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        access_token: "test-token",
        user_id: "user123",
        org_id: "org123",
        job_id: "job123",
      }),
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ error: "Stripe unavailable" }),
    });

    renderSignupPage();
    fillValidForm();
    fireEvent.click(screen.getByTestId("primary-button"));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/provisioning", { replace: true });
    });
  });

  it("shows a form error when signup response JSON cannot be parsed", async () => {
    apiPost.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => {
        throw new Error("Invalid JSON");
      },
    });

    renderSignupPage();
    fillValidForm();
    fireEvent.click(screen.getByTestId("primary-button"));

    await waitFor(() => {
      expect(
        screen.getByText("Unexpected error during signup. Please try again.")
      ).toBeInTheDocument();
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("renders inside PageShell and keeps the signup card visible", () => {
    renderSignupPage();

    expect(screen.getByTestId("page-shell")).toBeInTheDocument();
    expect(screen.getByTestId("signup-card")).toBeInTheDocument();
    expect(screen.getByText("Your Plan Overview")).toBeInTheDocument();
  });
});
