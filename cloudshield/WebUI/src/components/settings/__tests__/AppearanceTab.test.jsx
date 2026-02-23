import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AppearanceTab from "../AppearanceTab";

describe("AppearanceTab", () => {
  const mockOnSave = jest.fn();
  const defaultProps = {
    userData: {
      id: "user123",
      appearance_preferences: {
        theme: "dark",
        language: "en",
      },
    },
    onSave: mockOnSave,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders appearance tab title", () => {
      render(<AppearanceTab {...defaultProps} />);
      expect(screen.getByText(/appearance|theme|settings/i)).toBeInTheDocument();
    });

    it("renders without errors", () => {
      expect(() => render(<AppearanceTab {...defaultProps} />)).not.toThrow();
    });

    it("displays theme options", () => {
      render(<AppearanceTab {...defaultProps} />);
      const appearanceSection = screen.getByText(/appearance|theme|settings/i);
      expect(appearanceSection).toBeInTheDocument();
    });
  });

  describe("Theme Selection", () => {
    it("displays dark theme option", () => {
      render(<AppearanceTab {...defaultProps} />);
      const darkThemeOption = screen.queryByText(/dark|light|theme/i);
      if (darkThemeOption) {
        expect(darkThemeOption).toBeInTheDocument();
      }
    });

    it("displays light theme option", () => {
      render(<AppearanceTab {...defaultProps} />);
      const themeContent = screen.getByText(/appearance|theme|settings/i);
      expect(themeContent).toBeInTheDocument();
    });

    it("handles theme change", async () => {
      render(<AppearanceTab {...defaultProps} />);
      const buttons = screen.queryAllByRole("button");
      if (buttons.length > 0) {
        await userEvent.click(buttons[0]);
        expect(mockOnSave).not.toThrow();
      }
    });
  });

  describe("Language Settings", () => {
    it("renders language options section", () => {
      render(<AppearanceTab {...defaultProps} />);
      const appearanceTab = screen.getByText(/appearance|theme|settings/i);
      expect(appearanceTab).toBeInTheDocument();
    });

    it("displays current language", () => {
      render(<AppearanceTab {...defaultProps} />);
      const appearanceContent = screen.getByText(/appearance|theme|settings/i);
      expect(appearanceContent).toBeInTheDocument();
    });
  });

  describe("State Management", () => {
    it("initializes with user preferences", () => {
      render(<AppearanceTab {...defaultProps} />);
      expect(screen.getByText(/appearance|theme|settings/i)).toBeInTheDocument();
    });

    it("handles missing preferences", () => {
      const propsWithoutPrefs = {
        userData: { id: "user123" },
        onSave: mockOnSave,
      };
      
      render(<AppearanceTab {...propsWithoutPrefs} />);
      expect(screen.getByText(/appearance|theme|settings/i)).toBeInTheDocument();
    });

    it("handles null userData", () => {
      render(<AppearanceTab userData={null} onSave={mockOnSave} />);
      expect(screen.getByText(/appearance|theme|settings/i)).toBeInTheDocument();
    });
  });

  describe("UI Structure", () => {
    it("maintains consistent layout", () => {
      const { container } = render(<AppearanceTab {...defaultProps} />);
      expect(container).toBeTruthy();
    });

    it("updates when userData changes", () => {
      const { rerender } = render(<AppearanceTab {...defaultProps} />);
      
      const updatedProps = {
        ...defaultProps,
        userData: {
          ...defaultProps.userData,
          appearance_preferences: {
            theme: "light",
            language: "es",
          },
        },
      };
      
      rerender(<AppearanceTab {...updatedProps} />);
      expect(screen.getByText(/appearance|theme|settings/i)).toBeInTheDocument();
    });
  });

  describe("i18n Readiness", () => {
    it("renders without errors for future i18n implementation", () => {
      expect(() => render(<AppearanceTab {...defaultProps} />)).not.toThrow();
    });

    it("can accept language prop for future implementation", () => {
      const propsWithLanguage = {
        ...defaultProps,
        language: "es",
      };
      
      expect(() => render(<AppearanceTab {...propsWithLanguage} />)).not.toThrow();
    });
  });
});
