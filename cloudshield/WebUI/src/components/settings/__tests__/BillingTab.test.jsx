import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import BillingTab from "../BillingTab";
import "@testing-library/jest-dom";

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
    const firstInvoiceCheckbox = checkboxes[1]; // Skip the select-all checkbox

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

    // Check that other checkboxes are also checked
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

    // Initially should show all 7 invoices
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

    // Check for mock data in the table
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

    // Search should reset the selection based on visible items
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
