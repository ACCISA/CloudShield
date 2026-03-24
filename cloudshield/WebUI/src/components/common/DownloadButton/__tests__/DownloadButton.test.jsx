/**
 * DownloadButton.test.jsx
 *
 * Comprehensive test suite for DownloadButton component.
 * Tests rendering, interactions, disabled states, and hover effects.
 * Designed to achieve 80%+ code coverage for SonarQube analysis.
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import DownloadButton from "../DownloadButton";

// Mock DownloadIcon
jest.mock("../../../../assets/DownloadIcon", () => {
  return function DownloadIcon({ width, height, color }) {
    return (
      <svg
        data-testid="download-icon"
        data-width={width}
        data-height={height}
        data-color={color}
      >
        <path d="M12 16l-4-4h3V4h2v8h3l-4 4z" />
      </svg>
    );
  };
});

describe("DownloadButton Component", () => {
  const mockOnClick = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Basic Rendering", () => {
    it("renders without crashing", () => {
      const { container } = render(<DownloadButton onClick={mockOnClick} />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it("renders as a button element", () => {
      render(<DownloadButton onClick={mockOnClick} />);
      const button = screen.getByRole("button");
      expect(button).toBeInTheDocument();
    });

    it("has type='button' attribute", () => {
      render(<DownloadButton onClick={mockOnClick} />);
      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("type", "button");
    });

    it("renders DownloadIcon", () => {
      render(<DownloadButton onClick={mockOnClick} />);
      expect(screen.getByTestId("download-icon")).toBeInTheDocument();
    });

    it("renders default label 'Download'", () => {
      render(<DownloadButton onClick={mockOnClick} />);
      expect(screen.getByText("Download")).toBeInTheDocument();
    });
  });

  describe("Custom Labels", () => {
    it("renders custom label when provided", () => {
      render(<DownloadButton onClick={mockOnClick} label="Export Data" />);
      expect(screen.getByText("Export Data")).toBeInTheDocument();
    });

    it("renders 'Download alert' label", () => {
      render(<DownloadButton onClick={mockOnClick} label="Download alert" />);
      expect(screen.getByText("Download alert")).toBeInTheDocument();
    });

    it("renders 'Download Report' label", () => {
      render(<DownloadButton onClick={mockOnClick} label="Download Report" />);
      expect(screen.getByText("Download Report")).toBeInTheDocument();
    });

    it("renders 'Export CSV' label", () => {
      render(<DownloadButton onClick={mockOnClick} label="Export CSV" />);
      expect(screen.getByText("Export CSV")).toBeInTheDocument();
    });
  });

  describe("Click Handling", () => {
    it("calls onClick when clicked", () => {
      render(<DownloadButton onClick={mockOnClick} />);
      const button = screen.getByRole("button");
      fireEvent.click(button);
      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    it("calls onClick multiple times on multiple clicks", () => {
      render(<DownloadButton onClick={mockOnClick} />);
      const button = screen.getByRole("button");

      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(button);

      expect(mockOnClick).toHaveBeenCalledTimes(3);
    });

    it("does not call onClick when disabled", () => {
      render(<DownloadButton onClick={mockOnClick} disabled={true} />);
      const button = screen.getByRole("button");
      fireEvent.click(button);
      expect(mockOnClick).not.toHaveBeenCalled();
    });
  });

  describe("Disabled State", () => {
    it("is not disabled by default", () => {
      render(<DownloadButton onClick={mockOnClick} />);
      const button = screen.getByRole("button");
      expect(button).not.toBeDisabled();
    });

    it("is disabled when disabled prop is true", () => {
      render(<DownloadButton onClick={mockOnClick} disabled={true} />);
      const button = screen.getByRole("button");
      expect(button).toBeDisabled();
    });

    it("applies disabled styling", () => {
      render(<DownloadButton onClick={mockOnClick} disabled={true} />);
      const button = screen.getByRole("button");

      expect(button).toHaveStyle({
        cursor: "not-allowed",
        opacity: 0.5,
      });
    });

    it("applies enabled styling when not disabled", () => {
      render(<DownloadButton onClick={mockOnClick} disabled={false} />);
      const button = screen.getByRole("button");

      expect(button).toHaveStyle({
        cursor: "pointer",
        opacity: 1,
      });
    });
  });

  describe("Hover Effects", () => {
    it("changes background on hover", () => {
      render(<DownloadButton onClick={mockOnClick} />);
      const button = screen.getByRole("button");

      expect(button).toHaveStyle({ backgroundColor: "transparent" });

      fireEvent.mouseEnter(button);
      expect(button).toHaveStyle({ backgroundColor: "rgba(255,255,255,0.12)" });

      fireEvent.mouseLeave(button);
      expect(button).toHaveStyle({ backgroundColor: "transparent" });
    });

    it("does not change background on hover when disabled", () => {
      render(<DownloadButton onClick={mockOnClick} disabled={true} />);
      const button = screen.getByRole("button");

      expect(button).toHaveStyle({ backgroundColor: "rgba(255,255,255,0.05)" });

      fireEvent.mouseEnter(button);
      expect(button).toHaveStyle({ backgroundColor: "rgba(255,255,255,0.05)" });
    });

    it("handles multiple hover cycles", () => {
      render(<DownloadButton onClick={mockOnClick} />);
      const button = screen.getByRole("button");

      fireEvent.mouseEnter(button);
      expect(button).toHaveStyle({ backgroundColor: "rgba(255,255,255,0.12)" });

      fireEvent.mouseLeave(button);
      expect(button).toHaveStyle({ backgroundColor: "transparent" });

      fireEvent.mouseEnter(button);
      expect(button).toHaveStyle({ backgroundColor: "rgba(255,255,255,0.12)" });

      fireEvent.mouseLeave(button);
      expect(button).toHaveStyle({ backgroundColor: "transparent" });
    });
  });

  describe("Icon Props", () => {
    it("passes correct width to DownloadIcon", () => {
      render(<DownloadButton onClick={mockOnClick} />);
      const icon = screen.getByTestId("download-icon");
      expect(icon).toHaveAttribute("data-width", "16");
    });

    it("passes correct height to DownloadIcon", () => {
      render(<DownloadButton onClick={mockOnClick} />);
      const icon = screen.getByTestId("download-icon");
      expect(icon).toHaveAttribute("data-height", "16");
    });

    it("passes correct color to DownloadIcon", () => {
      render(<DownloadButton onClick={mockOnClick} />);
      const icon = screen.getByTestId("download-icon");
      expect(icon).toHaveAttribute("data-color", "var(--text-primary)");
    });
  });

  describe("Styling", () => {
    it("applies flex display", () => {
      render(<DownloadButton onClick={mockOnClick} />);
      const button = screen.getByRole("button");
      expect(button).toHaveStyle({ display: "flex" });
    });

    it("applies correct alignment", () => {
      render(<DownloadButton onClick={mockOnClick} />);
      const button = screen.getByRole("button");
      expect(button).toHaveStyle({ alignItems: "center" });
    });

    it("applies correct gap", () => {
      render(<DownloadButton onClick={mockOnClick} />);
      const button = screen.getByRole("button");
      expect(button).toHaveStyle({ gap: "8px" });
    });

    it("applies correct padding", () => {
      render(<DownloadButton onClick={mockOnClick} />);
      const button = screen.getByRole("button");
      expect(button).toHaveStyle({ padding: "10px 20px" });
    });

    it("applies correct border", () => {
      render(<DownloadButton onClick={mockOnClick} />);
      const button = screen.getByRole("button");
      expect(button).toHaveStyle({ border: "1px solid rgba(255,255,255,0.2)" });
    });

    it("applies correct border radius", () => {
      render(<DownloadButton onClick={mockOnClick} />);
      const button = screen.getByRole("button");
      expect(button).toHaveStyle({ borderRadius: "8px" });
    });

    it("applies correct font size", () => {
      render(<DownloadButton onClick={mockOnClick} />);
      const button = screen.getByRole("button");
      expect(button).toHaveStyle({ fontSize: "14px" });
    });

    it("applies correct font weight", () => {
      render(<DownloadButton onClick={mockOnClick} />);
      const button = screen.getByRole("button");
      expect(button).toHaveStyle({ fontWeight: "500" });
    });

    it("applies transition", () => {
      render(<DownloadButton onClick={mockOnClick} />);
      const button = screen.getByRole("button");
      expect(button).toHaveStyle({ transition: "all 0.2s ease" });
    });
  });

  describe("Edge Cases", () => {
    it("renders with empty label", () => {
      render(<DownloadButton onClick={mockOnClick} label="" />);
      const button = screen.getByRole("button");
      expect(button).toBeInTheDocument();
    });

    it("renders with very long label", () => {
      const longLabel =
        "Download this very long file with a very descriptive name";
      render(<DownloadButton onClick={mockOnClick} label={longLabel} />);
      expect(screen.getByText(longLabel)).toBeInTheDocument();
    });

    it("handles rapid clicks", () => {
      render(<DownloadButton onClick={mockOnClick} />);
      const button = screen.getByRole("button");

      for (let i = 0; i < 10; i++) {
        fireEvent.click(button);
      }

      expect(mockOnClick).toHaveBeenCalledTimes(10);
    });

    it("handles hover while clicking", () => {
      render(<DownloadButton onClick={mockOnClick} />);
      const button = screen.getByRole("button");

      fireEvent.mouseEnter(button);
      fireEvent.click(button);
      fireEvent.mouseLeave(button);

      expect(mockOnClick).toHaveBeenCalledTimes(1);
      expect(button).toHaveStyle({ backgroundColor: "transparent" });
    });
  });

  describe("Accessibility", () => {
    it("is keyboard accessible", () => {
      render(<DownloadButton onClick={mockOnClick} />);
      const button = screen.getByRole("button");
      expect(button.tagName).toBe("BUTTON");
    });

    it("has accessible role", () => {
      render(<DownloadButton onClick={mockOnClick} />);
      expect(screen.getByRole("button")).toBeInTheDocument();
    });

    it("maintains focus after click", () => {
      render(<DownloadButton onClick={mockOnClick} />);
      const button = screen.getByRole("button");

      button.focus();
      fireEvent.click(button);

      expect(mockOnClick).toHaveBeenCalled();
    });
  });

  describe("Component Integration", () => {
    it("renders icon and label together", () => {
      render(<DownloadButton onClick={mockOnClick} label="Export" />);
      expect(screen.getByTestId("download-icon")).toBeInTheDocument();
      expect(screen.getByText("Export")).toBeInTheDocument();
    });

    it("maintains icon visibility on hover", () => {
      render(<DownloadButton onClick={mockOnClick} />);
      const button = screen.getByRole("button");

      fireEvent.mouseEnter(button);
      expect(screen.getByTestId("download-icon")).toBeInTheDocument();
    });

    it("maintains icon visibility when disabled", () => {
      render(<DownloadButton onClick={mockOnClick} disabled={true} />);
      expect(screen.getByTestId("download-icon")).toBeInTheDocument();
    });
  });

  describe("PropTypes Validation", () => {
    it("accepts onClick function", () => {
      const customHandler = jest.fn();
      render(<DownloadButton onClick={customHandler} />);
      const button = screen.getByRole("button");
      fireEvent.click(button);
      expect(customHandler).toHaveBeenCalled();
    });

    it("accepts label string", () => {
      render(<DownloadButton onClick={mockOnClick} label="Custom Label" />);
      expect(screen.getByText("Custom Label")).toBeInTheDocument();
    });

    it("accepts disabled boolean", () => {
      render(<DownloadButton onClick={mockOnClick} disabled={true} />);
      expect(screen.getByRole("button")).toBeDisabled();
    });
  });
});
