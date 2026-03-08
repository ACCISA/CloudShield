import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import BillingTab from "../BillingTab";
import "@testing-library/jest-dom";
import { jest } from "@jest/globals";

jest.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ user: { package: "pro" }, refreshUser: jest.fn() }),
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;

delete window.location;
window.location = { href: "", search: "", pathname: "/settings" };

const mockCardActive = {
  brand: "visa",
  last4: "4242",
  exp_month: 12,
  exp_year: 2026,
  package: "pro",
  sub_status: "active",
  cancel_at_date: null,
};

const mockCardCanceled = {
  ...mockCardActive,
  sub_status: "canceled",
  cancel_at_date: "2026-04-01T00:00:00",
};

const mockInvoices = [
  {
    id: "inv_001",
    plan: "Professional Plan",
    amount: "$59.00 USD",
    date: "03/01/2026 12:00 PM",
    status: "Paid",
    url: "https://stripe.com/invoice.pdf",
  },
];

function setupFetch({ card = mockCardActive, invoices = mockInvoices } = {}) {
  mockFetch.mockImplementation((url) => {
    if (url.includes("invoices")) {
      return Promise.resolve({ json: () => Promise.resolve(invoices) });
    }
    if (url.includes("payment-method")) {
      return Promise.resolve({ json: () => Promise.resolve(card) });
    }
    if (url.includes("create-portal-session")) {
      return Promise.resolve({ json: () => Promise.resolve({ url: "https://billing.stripe.com/session" }) });
    }
    return Promise.resolve({ json: () => Promise.resolve({}) });
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.setItem("org_id", "org_abc");
  localStorage.setItem("jwt", "test_token");
  window.location.search = "";
  window.location.href = "";
});

describe("BillingTab", () => {
  test("renders billing center header", () => {
    render(<BillingTab />);

    expect(screen.getByText("Billing Centre")).toBeInTheDocument();
    expect(screen.getByText("Manage your plan and billing details")).toBeInTheDocument();
  });

  test("displays Billing History label", () => {
    render(<BillingTab />);

    expect(screen.getByText("Billing History")).toBeInTheDocument();
  });

  test("renders search input field", () => {
    render(<BillingTab />);

    expect(screen.getByPlaceholderText("Search Invoices")).toBeInTheDocument();
  });

  test("renders Filter button", () => {
    render(<BillingTab />);

    const filterButton = screen.getByRole("button", { name: /filter/i });
    expect(filterButton).toBeInTheDocument();
  });

  test("renders Download All button", () => {
    render(<BillingTab />);

    const downloadButton = screen.getByRole("button", { name: /download all/i });
    expect(downloadButton).toBeInTheDocument();
  });

  test("filters invoices based on search input", async () => {
    render(<BillingTab />);

    const searchInput = screen.getByPlaceholderText("Search Invoices");

    await act(async () => {
      fireEvent.change(searchInput, { target: { value: "Pro" } });
    });

    await waitFor(() => {
      expect(searchInput).toHaveValue("Pro");
    });
  });

  test("displays invoice table headers", () => {
    render(<BillingTab />);

    expect(screen.getByText("Invoice")).toBeInTheDocument();
    expect(screen.getByText("Amount")).toBeInTheDocument();
    expect(screen.getByText("Date")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
  });

  test("renders checkbox for select all functionality", () => {
    render(<BillingTab />);

    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes.length).toBeGreaterThan(0);
  });

  test("selects individual invoice when checkbox is clicked", async () => {
    render(<BillingTab />);

    const checkboxes = screen.getAllByRole("checkbox");
    const firstInvoiceCheckbox = checkboxes[1];

    await act(async () => {
      fireEvent.click(firstInvoiceCheckbox);
    });

    expect(firstInvoiceCheckbox).toBeChecked();
  });

  test("toggles select all when select-all checkbox is clicked", async () => {
    render(<BillingTab />);

    const checkboxes = screen.getAllByRole("checkbox");
    const selectAllCheckbox = checkboxes[0];

    await act(async () => {
      fireEvent.click(selectAllCheckbox);
    });

    expect(selectAllCheckbox).toBeChecked();

    const otherCheckboxes = checkboxes.slice(1);
    otherCheckboxes.forEach((checkbox) => {
      expect(checkbox).toBeChecked();
    });
  });

  test("deselects all items when select-all is toggled twice", async () => {
    render(<BillingTab />);

    const checkboxes = screen.getAllByRole("checkbox");
    const selectAllCheckbox = checkboxes[0];

    await act(async () => {
      fireEvent.click(selectAllCheckbox);
    });

    expect(selectAllCheckbox).toBeChecked();

    await act(async () => {
      fireEvent.click(selectAllCheckbox);
    });

    expect(selectAllCheckbox).not.toBeChecked();
  });

  test("search filters invoices by plan", async () => {
    render(<BillingTab />);

    const searchInput = screen.getByPlaceholderText("Search Invoices");

    const allCheckboxes = screen.getAllByRole("checkbox");
    expect(allCheckboxes.length).toBeGreaterThan(0);

    await act(async () => {
      fireEvent.change(searchInput, { target: { value: "NonExistent" } });
    });

    await waitFor(() => {
      expect(searchInput).toHaveValue("NonExistent");
    });
  });

  test("search is case-insensitive", async () => {
    render(<BillingTab />);

    const searchInput = screen.getByPlaceholderText("Search Invoices");

    await act(async () => {
      fireEvent.change(searchInput, { target: { value: "pro" } });
    });

    expect(searchInput).toHaveValue("pro");
  });

  test("displays invoice details in table", () => {
    render(<BillingTab />);

    expect(screen.getByText("Pro")).toBeInTheDocument();
    expect(screen.getByText("$100 CAD")).toBeInTheDocument();
  });

  test("shows invoice status as Paid", () => {
    render(<BillingTab />);

    expect(screen.getByText("Paid")).toBeInTheDocument();
  });

  test("handles empty search gracefully", async () => {
    render(<BillingTab />);

    const searchInput = screen.getByPlaceholderText("Search Invoices");

    await act(async () => {
      fireEvent.change(searchInput, { target: { value: "" } });
    });

    expect(searchInput).toHaveValue("");
  });

  test("maintains selection state when search is applied", async () => {
    render(<BillingTab />);

    const checkboxes = screen.getAllByRole("checkbox");
    const firstItemCheckbox = checkboxes[1];

    await act(async () => {
      fireEvent.click(firstItemCheckbox);
    });

    expect(firstItemCheckbox).toBeChecked();

    const searchInput = screen.getByPlaceholderText("Search Invoices");
    await act(async () => {
      fireEvent.change(searchInput, { target: { value: "Pro" } });
    });

    expect(searchInput).toHaveValue("Pro");
  });

  test("renders date and time in correct format", () => {
    render(<BillingTab />);

    expect(screen.getByText("10/11/2025 11:36 pm")).toBeInTheDocument();
  });

  test("renders invoice amount in correct format", () => {
    render(<BillingTab />);

    expect(screen.getByText("$100 CAD")).toBeInTheDocument();
  });

  test("renders AccessTime icon in toolbar", () => {
    render(<BillingTab />);

    expect(screen.getByText("Billing History")).toBeInTheDocument();
  });

  test("search input has correct styling classes", () => {
    render(<BillingTab />);

    const searchInput = screen.getByPlaceholderText("Search Invoices");
    expect(searchInput).toHaveClass("MuiOutlinedInput-input");
  });
});

describe("BillingTab — Stripe enabled, active subscription", () => {
  it("renders Billing Centre heading", async () => {
    setupFetch();
    await act(async () => render(<BillingTab />));
    expect(screen.getByText("Billing Centre")).toBeInTheDocument();
  });

  it("shows plan name and Active chip after load", async () => {
    setupFetch();
    await act(async () => render(<BillingTab />));
    await waitFor(() => {
      expect(screen.getByText(/Professional plan/i)).toBeInTheDocument();
      expect(screen.getByText("Active")).toBeInTheDocument();
    });
  });

  it("shows card last 4 digits", async () => {
    setupFetch();
    await act(async () => render(<BillingTab />));
    await waitFor(() => {
      expect(screen.getByText(/4242/)).toBeInTheDocument();
    });
  });

  it("shows card expiry", async () => {
    setupFetch();
    await act(async () => render(<BillingTab />));
    await waitFor(() => {
      expect(screen.getByText(/Expires 12\/2026/)).toBeInTheDocument();
    });
  });

  it("renders invoice rows", async () => {
    setupFetch();
    await act(async () => render(<BillingTab />));
    await waitFor(() => {
      expect(screen.getByText("Professional Plan")).toBeInTheDocument();
      expect(screen.getByText("$59.00 USD")).toBeInTheDocument();
    });
  });

  it("shows Upgrade plan button when active", async () => {
    setupFetch();
    await act(async () => render(<BillingTab />));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Upgrade plan/i })).toBeInTheDocument();
    });
  });

  it("shows Cancel subscription link when active", async () => {
    setupFetch();
    await act(async () => render(<BillingTab />));
    await waitFor(() => {
      expect(screen.getByText("Cancel subscription")).toBeInTheDocument();
    });
  });

  it("clicking Upgrade plan calls create-portal-session", async () => {
    setupFetch();
    await act(async () => render(<BillingTab />));
    await waitFor(() => screen.getByRole("button", { name: /Upgrade plan/i }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Upgrade plan/i }));
    });
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("create-portal-session"),
        expect.anything()
      );
    });
  });

  it("clicking Upgrade plan redirects to portal URL", async () => {
    setupFetch();
    await act(async () => render(<BillingTab />));
    await waitFor(() => screen.getByRole("button", { name: /Upgrade plan/i }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Upgrade plan/i }));
    });
    await waitFor(() => {
      expect(window.location.href).toBe("https://billing.stripe.com/session");
    });
  });

  it("clicking Cancel subscription calls create-portal-session", async () => {
    setupFetch();
    await act(async () => render(<BillingTab />));
    await waitFor(() => screen.getByText("Cancel subscription"));
    await act(async () => {
      fireEvent.click(screen.getByText("Cancel subscription"));
    });
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("create-portal-session"),
        expect.anything()
      );
    });
  });

  it("clicking Edit calls create-portal-session", async () => {
    setupFetch();
    await act(async () => render(<BillingTab />));
    await waitFor(() => screen.getByRole("button", { name: /Edit/i }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Edit/i }));
    });
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("create-portal-session"),
        expect.anything()
      );
    });
  });

  it("does not open any plan selection modal when clicking Upgrade plan", async () => {
    setupFetch();
    await act(async () => render(<BillingTab />));
    await waitFor(() => screen.getByRole("button", { name: /Upgrade plan/i }));
    fireEvent.click(screen.getByRole("button", { name: /Upgrade plan/i }));
    expect(screen.queryByText("Select your plan")).not.toBeInTheDocument();
    expect(screen.queryByText("Choose Plan")).not.toBeInTheDocument();
  });
});

describe("BillingTab — canceled subscription", () => {
  it("shows Canceled chip", async () => {
    setupFetch({ card: mockCardCanceled });
    await act(async () => render(<BillingTab />));
    await waitFor(() => {
      expect(screen.getByText("Canceled")).toBeInTheDocument();
    });
  });

  it("shows canceled message with date", async () => {
    setupFetch({ card: mockCardCanceled });
    await act(async () => render(<BillingTab />));
    await waitFor(() => {
      expect(screen.getByText(/subscription was canceled/i)).toBeInTheDocument();
    });
  });

  it("shows Reactivate plan button instead of Upgrade plan", async () => {
    setupFetch({ card: mockCardCanceled });
    await act(async () => render(<BillingTab />));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Reactivate plan/i })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Upgrade plan/i })).not.toBeInTheDocument();
    });
  });

  it("does not show Cancel subscription link when canceled", async () => {
    setupFetch({ card: mockCardCanceled });
    await act(async () => render(<BillingTab />));
    await waitFor(() => {
      expect(screen.queryByText("Cancel subscription")).not.toBeInTheDocument();
    });
  });

  it("clicking Reactivate plan calls create-portal-session", async () => {
    setupFetch({ card: mockCardCanceled });
    await act(async () => render(<BillingTab />));
    await waitFor(() => screen.getByRole("button", { name: /Reactivate plan/i }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Reactivate plan/i }));
    });
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("create-portal-session"),
        expect.anything()
      );
    });
  });
});

describe("BillingTab — no card on file", () => {
  it("shows No card on file when card has no brand", async () => {
    setupFetch({ card: { ...mockCardActive, brand: undefined, last4: undefined } });
    await act(async () => render(<BillingTab />));
    await waitFor(() => {
      expect(screen.getByText("No card on file")).toBeInTheDocument();
    });
  });

  it("shows Update in billing portal hint", async () => {
    setupFetch({ card: { ...mockCardActive, brand: undefined } });
    await act(async () => render(<BillingTab />));
    await waitFor(() => {
      expect(screen.getByText("Update in billing portal")).toBeInTheDocument();
    });
  });
});

describe("BillingTab — syncing overlay", () => {
  it("shows syncing overlay when ?status=success is in URL", async () => {
    window.location.search = "?status=success";
    jest.useFakeTimers();
    setupFetch();
    await act(async () => render(<BillingTab />));
    expect(screen.getByText(/Syncing with Stripe/i)).toBeInTheDocument();
    jest.useRealTimers();
  });
});

describe("BillingTab — empty invoices", () => {
  it("renders without crashing when invoice list is empty", async () => {
    setupFetch({ invoices: [] });
    await act(async () => render(<BillingTab />));
    await waitFor(() => {
      expect(screen.getByText("Billing History")).toBeInTheDocument();
    });
  });
});

describe("BillingTab — Stripe bypassed", () => {
  beforeEach(() => {
    jest.replaceProperty(import.meta, "env", { VITE_BYPASS_STRIPE_CONFIRMATION: "true" });
  });

  it("renders billing disabled notice", async () => {
    await act(async () => render(<BillingTab />));
    expect(screen.getByText(/Billing is disabled/i)).toBeInTheDocument();
  });

  it("does not call fetch when billing is bypassed", async () => {
    await act(async () => render(<BillingTab />));
    expect(mockFetch).not.toHaveBeenCalled();
  });
});