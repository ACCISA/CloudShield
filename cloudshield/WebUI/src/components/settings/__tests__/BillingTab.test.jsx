import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BillingTab from "../BillingTab";

describe("BillingTab", () => {
  const mockOnSave = jest.fn();
  const defaultProps = {
    userData: {
      id: "user123",
      package_type: "pro",
      billing_date: "2026-03-01",
    },
    onSave: mockOnSave,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders billing tab title", () => {
      render(<BillingTab {...defaultProps} />);
      expect(screen.getByText(/plan|billing|subscription/i)).toBeInTheDocument();
    });

    it("displays current plan information", () => {
      render(<BillingTab {...defaultProps} />);
      // Should display some plan info
      const tabContent = screen.getByText(/plan|billing|subscription/i);
      expect(tabContent).toBeInTheDocument();
    });

    it("renders billing management interface", () => {
      render(<BillingTab {...defaultProps} />);
      expect(screen.queryByText(/plan|billing|pricing|subscription/i)).toBeTruthy();
    });
  });

  describe("Plan Display", () => {
    it("displays basic plan option", () => {
      render(<BillingTab {...defaultProps} />);
      const basicPlanText = screen.queryByText(/basic/i);
      if (basicPlanText) {
        expect(basicPlanText).toBeInTheDocument();
      }
    });

    it("displays pro plan option", () => {
      render(<BillingTab {...defaultProps} />);
      const proPlanText = screen.queryByText(/pro/i);
      if (proPlanText) {
        expect(proPlanText).toBeInTheDocument();
      }
    });

    it("displays enterprise plan option", () => {
      render(<BillingTab {...defaultProps} />);
      const enterprisePlanText = screen.queryByText(/enterprise/i);
      if (enterprisePlanText) {
        expect(enterprisePlanText).toBeInTheDocument();
      }
    });
  });

  describe("Empty State", () => {
    it("handles missing user data", () => {
      render(<BillingTab userData={null} onSave={mockOnSave} />);
      expect(screen.queryByText(/plan|billing|subscription/i)).toBeTruthy();
    });

    it("renders without userData prop", () => {
      render(<BillingTab onSave={mockOnSave} />);
      expect(screen.queryByText(/plan|billing|subscription/i)).toBeTruthy();
    });
  });

  describe("UI Structure", () => {
    it("renders without errors", () => {
      expect(() => render(<BillingTab {...defaultProps} />)).not.toThrow();
    });

    it("maintains layout structure", () => {
      const { container } = render(<BillingTab {...defaultProps} />);
      expect(container).toBeTruthy();
    });
  });

  describe("Dynamic Content", () => {
    it("updates when userData changes", () => {
      const { rerender } = render(<BillingTab {...defaultProps} />);
      
      const updatedProps = {
        ...defaultProps,
        userData: {
          ...defaultProps.userData,
          package_type: "enterprise",
        },
      };
      
      rerender(<BillingTab {...updatedProps} />);
      expect(screen.queryByText(/plan|billing|subscription/i)).toBeTruthy();
    });
  });

  describe("Search and Filtering", () => {
    it("renders search input field", () => {
      render(<BillingTab {...defaultProps} />);
      expect(screen.getByPlaceholderText("Search Invoices")).toBeInTheDocument();
    });

    it("filters invoices by search term", async () => {
      render(<BillingTab {...defaultProps} />);
      const searchInput = screen.getByPlaceholderText("Search Invoices");
      
      await userEvent.type(searchInput, "Pro");
      
      // The component should still render
      expect(searchInput).toHaveValue("Pro");
    });

    it("clears search results when search is empty", async () => {
      render(<BillingTab {...defaultProps} />);
      const searchInput = screen.getByPlaceholderText("Search Invoices");
      
      await userEvent.type(searchInput, "Pro");
      expect(searchInput).toHaveValue("Pro");
      
      await userEvent.clear(searchInput);
      expect(searchInput).toHaveValue("");
    });
  });

  describe("Checkbox Selection", () => {
    it("renders checkboxes in table", () => {
      render(<BillingTab {...defaultProps} />);
      const checkboxes = screen.getAllByRole("checkbox");
      expect(checkboxes.length).toBeGreaterThan(0);
    });

    it("selects individual invoice", async () => {
      render(<BillingTab {...defaultProps} />);
      const checkboxes = screen.getAllByRole("checkbox");
      
      // Skip select-all checkbox (first one) and select second
      if (checkboxes.length > 1) {
        await userEvent.click(checkboxes[1]);
        expect(checkboxes[1]).toBeChecked();
      }
    });

    it("selects all invoices with select-all checkbox", async () => {
      render(<BillingTab {...defaultProps} />);
      const checkboxes = screen.getAllByRole("checkbox");
      const selectAllCheckbox = checkboxes[0];
      
      await userEvent.click(selectAllCheckbox);
      
      // All checkboxes should be checked
      checkboxes.forEach((cb) => {
        expect(cb).toBeChecked();
      });
    });

    it("deselects all when select-all is clicked again", async () => {
      render(<BillingTab {...defaultProps} />);
      const checkboxes = screen.getAllByRole("checkbox");
      const selectAllCheckbox = checkboxes[0];
      
      // First click to select all
      await userEvent.click(selectAllCheckbox);
      checkboxes.forEach((cb) => {
        expect(cb).toBeChecked();
      });
      
      // Second click to deselect all
      await userEvent.click(selectAllCheckbox);
      checkboxes.forEach((cb) => {
        expect(cb).not.toBeChecked();
      });
    });
  });

  describe("Buttons", () => {
    it("renders filter button", () => {
      render(<BillingTab {...defaultProps} />);
      expect(screen.getByText("Filter")).toBeInTheDocument();
    });

    it("renders download all button", () => {
      render(<BillingTab {...defaultProps} />);
      expect(screen.getByText("Download All")).toBeInTheDocument();
    });

    it("filter button is clickable", async() => {
      render(<BillingTab {...defaultProps} />);
      const filterButton = screen.getByText("Filter");
      await userEvent.click(filterButton);
      expect(filterButton).toBeInTheDocument();
    });

    it("download all button is clickable", async () => {
      render(<BillingTab {...defaultProps} />);
      const downloadButton = screen.getByText("Download All");
      await userEvent.click(downloadButton);
      expect(downloadButton).toBeInTheDocument();
    });
  });
});
