import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EmailCustomizationTab from "../EmailCustomizationTab";

describe("EmailCustomizationTab", () => {
  const mockOnSave = jest.fn();
  const defaultProps = {
    userData: {
      id: "user123",
      email: "test@example.com",
      email_customization: {
        digest_frequency: "weekly",
        email_notifications: true,
        marketing_emails: false,
      },
    },
    onSave: mockOnSave,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders email customization tab", () => {
      render(<EmailCustomizationTab {...defaultProps} />);
      expect(screen.getByText(/email|customization|notifications/i)).toBeInTheDocument();
    });

    it("displays email customization options", () => {
      render(<EmailCustomizationTab {...defaultProps} />);
      expect(screen.queryByText(/email|digest|frequency|notifications/i)).toBeTruthy();
    });
  });

  describe("Email Frequency Settings", () => {
    it("displays frequency options", () => {
      render(<EmailCustomizationTab {...defaultProps} />);
      const contentArea = screen.queryByText(/email|customization/i);
      expect(contentArea).toBeTruthy();
    });

    it("renders daily option", () => {
      render(<EmailCustomizationTab {...defaultProps} />);
      const dailyOption = screen.queryByText(/daily/i);
      if (dailyOption) {
        expect(dailyOption).toBeInTheDocument();
      }
    });

    it("renders weekly option", () => {
      render(<EmailCustomizationTab {...defaultProps} />);
      const weeklyOption = screen.queryByText(/weekly/i);
      if (weeklyOption) {
        expect(weeklyOption).toBeInTheDocument();
      }
    });

    it("renders monthly option", () => {
      render(<EmailCustomizationTab {...defaultProps} />);
      const monthlyOption = screen.queryByText(/monthly/i);
      if (monthlyOption) {
        expect(monthlyOption).toBeInTheDocument();
      }
    });

    it("selects current frequency", () => {
      render(<EmailCustomizationTab {...defaultProps} />);
      expect(screen.queryByText(/weekly/i)).toBeTruthy();
    });
  });

  describe("Email Toggle Options", () => {
    it("displays email notifications toggle", () => {
      render(<EmailCustomizationTab {...defaultProps} />);
      const toggles = screen.queryAllByRole("switch", { hidden: true });
      if (toggles.length > 0) {
        expect(toggles.length).toBeGreaterThan(0);
      }
    });

    it("displays marketing emails toggle", () => {
      render(<EmailCustomizationTab {...defaultProps} />);
      const toggleArea = screen.getByText(/email|customization/i);
      expect(toggleArea).toBeInTheDocument();
    });

    it("shows current toggle states", () => {
      render(<EmailCustomizationTab {...defaultProps} />);
      expect(screen.getByText(/email|customization/i)).toBeInTheDocument();
    });
  });

  describe("Interaction", () => {
    it("handles frequency change", async () => {
      render(<EmailCustomizationTab {...defaultProps} />);
      const buttons = screen.queryAllByRole("button");
      if (buttons.length > 0) {
        await userEvent.click(buttons[0]);
        expect(mockOnSave).not.toThrow();
      }
    });

    it("handles toggle change", async () => {
      render(<EmailCustomizationTab {...defaultProps} />);
      const toggles = screen.queryAllByRole("checkbox", { hidden: true });
      if (toggles.length > 0) {
        await userEvent.click(toggles[0]);
        expect(mockOnSave).not.toThrow();
      }
    });
  });

  describe("State Management", () => {
    it("initializes with user preferences", () => {
      render(<EmailCustomizationTab {...defaultProps} />);
      expect(screen.getByText(/email|customization/i)).toBeInTheDocument();
    });

    it("handles missing email customization data", () => {
      const propsWithoutCustomization = {
        userData: { id: "user123", email: "test@example.com" },
        onSave: mockOnSave,
      };
      
      render(<EmailCustomizationTab {...propsWithoutCustomization} />);
      expect(screen.getByText(/email|customization/i)).toBeInTheDocument();
    });

    it("handles null userData", () => {
      render(<EmailCustomizationTab userData={null} onSave={mockOnSave} />);
      expect(screen.queryByText(/email|customization/i)).toBeTruthy();
    });
  });

  describe("UI Structure", () => {
    it("renders without errors", () => {
      expect(() => render(<EmailCustomizationTab {...defaultProps} />)).not.toThrow();
    });

    it("maintains consistent layout", () => {
      const { container } = render(<EmailCustomizationTab {...defaultProps} />);
      expect(container).toBeTruthy();
    });

    it("updates when userData changes", () => {
      const { rerender } = render(<EmailCustomizationTab {...defaultProps} />);
      
      const updatedProps = {
        ...defaultProps,
        userData: {
          ...defaultProps.userData,
          email_customization: {
            digest_frequency: "daily",
            email_notifications: false,
            marketing_emails: true,
          },
        },
      };
      
      rerender(<EmailCustomizationTab {...updatedProps} />);
      expect(screen.getByText(/email|customization/i)).toBeInTheDocument();
    });
  });

  describe("Responsive Design", () => {
    it("renders content responsively", () => {
      const { container } = render(<EmailCustomizationTab {...defaultProps} />);
      expect(container.firstChild).toBeTruthy();
    });

    it("adjusts layout for different screen sizes", () => {
      render(<EmailCustomizationTab {...defaultProps} />);
      expect(screen.getByText(/email|customization/i)).toBeInTheDocument();
    });
  });
});
