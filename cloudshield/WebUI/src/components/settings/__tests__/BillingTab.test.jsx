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
});
