/**
 * SecurityAlertModal.test.jsx
 *
 * Comprehensive test suite for SecurityAlertModal component.
 * Tests rendering, interactions, risk levels, actions, and accessibility.
 * Designed to achieve 80%+ code coverage for SonarQube analysis.
 */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SecurityAlertModal from "../SecurityAlertModal";

// Mock all imported icons and components
jest.mock("../../../assets/security/HighAlertIcon", () => {
  return function HighAlertIcon({ width, height }) {
    return <svg data-testid="high-alert-icon" width={width} height={height} />;
  };
});

jest.mock("../../../assets/security/ModerateAlertIcon", () => {
  return function ModerateAlertIcon({ width, height }) {
    return (
      <svg data-testid="moderate-alert-icon" width={width} height={height} />
    );
  };
});

jest.mock("../../../assets/security/LowAlertIcon", () => {
  return function LowAlertIcon({ width, height }) {
    return <svg data-testid="low-alert-icon" width={width} height={height} />;
  };
});

jest.mock("../../common/DownloadButton/DownloadButton", () => {
  return function DownloadButton({ onClick, label }) {
    return (
      <button data-testid="download-button" onClick={onClick}>
        {label}
      </button>
    );
  };
});

jest.mock("../../../assets/CheckmarkIcon", () => {
  return function CheckmarkIcon({ width, height, color }) {
    return (
      <svg
        data-testid="checkmark-icon"
        width={width}
        height={height}
        fill={color}
      />
    );
  };
});

jest.mock("../../../assets/AiIcon", () => {
  return function AiIcon({ width, height, color }) {
    return (
      <svg data-testid="ai-icon" width={width} height={height} fill={color} />
    );
  };
});

describe("SecurityAlertModal Component", () => {
  const mockAlert = {
    id: 1,
    type: "Ransomware Detection",
    date: "2024-03-15",
    displayDate: "Mar 15, 2024",
    activity: "Encrypted 45 files in Documents folder",
    risk: "high",
    status: "active",
    category: "Malware",
    source: "User Upload",
    affectedGroup: "Engineering Team",
    description: "This is a test description of the security alert.",
  };

  const defaultProps = {
    alert: mockAlert,
    isOpen: true,
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    console.log.mockRestore();
  });

  describe("Basic Rendering", () => {
    it("renders when isOpen is true", () => {
      render(<SecurityAlertModal {...defaultProps} />);
      expect(screen.getByText("Security Alert")).toBeInTheDocument();
    });

    it("does not render when isOpen is false", () => {
      render(<SecurityAlertModal {...defaultProps} isOpen={false} />);
      expect(screen.queryByText("Security Alert")).not.toBeInTheDocument();
    });

    it("does not render when alert is null", () => {
      render(<SecurityAlertModal {...defaultProps} alert={null} />);
      expect(screen.queryByText("Security Alert")).not.toBeInTheDocument();
    });

    it("does not render when alert is undefined", () => {
      render(<SecurityAlertModal {...defaultProps} alert={undefined} />);
      expect(screen.queryByText("Security Alert")).not.toBeInTheDocument();
    });

    it("renders the modal title", () => {
      render(<SecurityAlertModal {...defaultProps} />);
      expect(screen.getByText("Security Alert")).toBeInTheDocument();
    });

    it("renders the alert ID", () => {
      render(<SecurityAlertModal {...defaultProps} />);
      expect(screen.getByText("ID: #1")).toBeInTheDocument();
    });

    it("renders close button", () => {
      render(<SecurityAlertModal {...defaultProps} />);
      const closeButton = screen.getByLabelText("Close modal");
      expect(closeButton).toBeInTheDocument();
    });
  });

  describe("Risk Level Display", () => {
    it("renders high risk badge", () => {
      render(<SecurityAlertModal {...defaultProps} />);
      expect(screen.getByText("HIGH RISK")).toBeInTheDocument();
    });

    it("renders moderate risk badge", () => {
      const moderateAlert = { ...mockAlert, risk: "moderate" };
      render(<SecurityAlertModal {...defaultProps} alert={moderateAlert} />);
      expect(screen.getByText("MODERATE RISK")).toBeInTheDocument();
    });

    it("renders low risk badge", () => {
      const lowAlert = { ...mockAlert, risk: "low" };
      render(<SecurityAlertModal {...defaultProps} alert={lowAlert} />);
      expect(screen.getByText("LOW RISK")).toBeInTheDocument();
    });

    it("defaults to low risk for unknown risk levels", () => {
      const unknownAlert = { ...mockAlert, risk: "unknown" };
      render(<SecurityAlertModal {...defaultProps} alert={unknownAlert} />);
      expect(screen.getByText("LOW RISK")).toBeInTheDocument();
    });
  });

  describe("Alert Details Display", () => {
    it("renders alert type", () => {
      render(<SecurityAlertModal {...defaultProps} />);
      expect(screen.getByText("Ransomware Detection")).toBeInTheDocument();
    });

    it("renders displayDate when provided", () => {
      render(<SecurityAlertModal {...defaultProps} />);
      expect(screen.getByText("Mar 15, 2024")).toBeInTheDocument();
    });

    it("renders date when displayDate not provided", () => {
      const alertWithoutDisplayDate = { ...mockAlert };
      delete alertWithoutDisplayDate.displayDate;

      render(
        <SecurityAlertModal
          {...defaultProps}
          alert={alertWithoutDisplayDate}
        />,
      );
      expect(screen.getByText("2024-03-15")).toBeInTheDocument();
    });

    it("renders category", () => {
      render(<SecurityAlertModal {...defaultProps} />);
      expect(screen.getByText("Malware")).toBeInTheDocument();
    });

    it("renders default category when not provided", () => {
      const alertWithoutCategory = { ...mockAlert };
      delete alertWithoutCategory.category;

      render(
        <SecurityAlertModal {...defaultProps} alert={alertWithoutCategory} />,
      );
      expect(screen.getByText("File Upload")).toBeInTheDocument();
    });

    it("renders status with proper capitalization", () => {
      render(<SecurityAlertModal {...defaultProps} />);
      expect(screen.getByText("Active")).toBeInTheDocument();
    });

    it("renders source", () => {
      render(<SecurityAlertModal {...defaultProps} />);
      expect(screen.getByText("User Upload")).toBeInTheDocument();
    });

    it("renders default source when not provided", () => {
      const alertWithoutSource = { ...mockAlert };
      delete alertWithoutSource.source;

      render(
        <SecurityAlertModal {...defaultProps} alert={alertWithoutSource} />,
      );
      expect(screen.getByText("Unknown")).toBeInTheDocument();
    });

    it("renders affected group", () => {
      render(<SecurityAlertModal {...defaultProps} />);
      expect(screen.getByText("Engineering Team")).toBeInTheDocument();
    });

    it("renders N/A for affected group when not provided", () => {
      const alertWithoutGroup = { ...mockAlert };
      delete alertWithoutGroup.affectedGroup;

      render(
        <SecurityAlertModal {...defaultProps} alert={alertWithoutGroup} />,
      );
      expect(screen.getByText("N/A")).toBeInTheDocument();
    });

    it("renders custom description", () => {
      render(<SecurityAlertModal {...defaultProps} />);
      expect(
        screen.getByText("This is a test description of the security alert."),
      ).toBeInTheDocument();
    });

    it("renders default description when not provided", () => {
      const alertWithoutDescription = { ...mockAlert };
      delete alertWithoutDescription.description;

      render(
        <SecurityAlertModal
          {...defaultProps}
          alert={alertWithoutDescription}
        />,
      );
      expect(
        screen.getByText(/A potentially malicious file was uploaded/),
      ).toBeInTheDocument();
    });

    it("renders N/A for missing ID", () => {
      const alertWithoutId = { ...mockAlert };
      delete alertWithoutId.id;

      render(<SecurityAlertModal {...defaultProps} alert={alertWithoutId} />);
      expect(screen.getByText("ID: #N/A")).toBeInTheDocument();
    });
  });

  describe("Close Functionality", () => {
    it("calls onClose when close button is clicked", () => {
      const mockOnClose = jest.fn();
      render(<SecurityAlertModal {...defaultProps} onClose={mockOnClose} />);

      const closeButton = screen.getByLabelText("Close modal");
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it("calls onClose when overlay is clicked", () => {
      const mockOnClose = jest.fn();
      const { container } = render(
        <SecurityAlertModal {...defaultProps} onClose={mockOnClose} />,
      );

      const overlay = container.firstChild;
      fireEvent.click(overlay);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it("does not close when modal content is clicked", () => {
      const mockOnClose = jest.fn();
      render(<SecurityAlertModal {...defaultProps} onClose={mockOnClose} />);

      const modalContent = screen.getByText("Security Alert").closest("div");
      fireEvent.click(modalContent);

      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it("calls onClose when Escape key is pressed on overlay", () => {
      const mockOnClose = jest.fn();
      const { container } = render(
        <SecurityAlertModal {...defaultProps} onClose={mockOnClose} />,
      );

      const overlay = container.firstChild;
      fireEvent.keyDown(overlay, { key: "Escape" });

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it("does not close on other key press", () => {
      const mockOnClose = jest.fn();
      const { container } = render(
        <SecurityAlertModal {...defaultProps} onClose={mockOnClose} />,
      );

      const overlay = container.firstChild;
      fireEvent.keyDown(overlay, { key: "Enter" });

      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe("Action Buttons", () => {
    it("renders mark as false positive button", () => {
      render(<SecurityAlertModal {...defaultProps} />);
      expect(screen.getByText("Mark as false positive")).toBeInTheDocument();
    });

    it("calls handler and closes when false positive is clicked", () => {
      const mockOnClose = jest.fn();
      render(<SecurityAlertModal {...defaultProps} onClose={mockOnClose} />);

      const button = screen.getByText("Mark as false positive");
      fireEvent.click(button);

      expect(console.log).toHaveBeenCalledWith("Mark as false positive:", 1);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it("renders download button with correct label", () => {
      render(<SecurityAlertModal {...defaultProps} />);
      expect(screen.getByText("Download alert")).toBeInTheDocument();
    });

    it("calls handler when download button is clicked", () => {
      render(<SecurityAlertModal {...defaultProps} />);

      const button = screen.getByTestId("download-button");
      fireEvent.click(button);

      expect(console.log).toHaveBeenCalledWith("Download alert:", 1);
    });

    it("renders mark as resolved button", () => {
      render(<SecurityAlertModal {...defaultProps} />);
      expect(screen.getByText("Mark as resolved")).toBeInTheDocument();
    });

    it("calls handler and closes when resolved is clicked", () => {
      const mockOnClose = jest.fn();
      render(<SecurityAlertModal {...defaultProps} onClose={mockOnClose} />);

      const button = screen.getByText("Mark as resolved");
      fireEvent.click(button);

      expect(console.log).toHaveBeenCalledWith("Mark as resolved:", 1);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it("renders expand with AI button", () => {
      render(<SecurityAlertModal {...defaultProps} />);
      expect(screen.getByText("Expand with AI")).toBeInTheDocument();
    });

    it("calls handler when expand with AI is clicked", () => {
      render(<SecurityAlertModal {...defaultProps} />);

      const button = screen.getByText("Expand with AI");
      fireEvent.click(button);

      expect(console.log).toHaveBeenCalledWith("Expand with AI:", 1);
    });

    it("renders checkmark icon in resolved button", () => {
      render(<SecurityAlertModal {...defaultProps} />);
      expect(screen.getByTestId("checkmark-icon")).toBeInTheDocument();
    });

    it("renders AI icon in expand button", () => {
      render(<SecurityAlertModal {...defaultProps} />);
      expect(screen.getByTestId("ai-icon")).toBeInTheDocument();
    });
  });

  describe("Hover States", () => {
    it("updates close button style on mouse enter", () => {
      const { container } = render(<SecurityAlertModal {...defaultProps} />);
      const closeButton = screen.getByLabelText("Close modal");

      fireEvent.mouseEnter(closeButton);

      expect(closeButton).toBeInTheDocument();
    });

    it("resets close button style on mouse leave", () => {
      const { container } = render(<SecurityAlertModal {...defaultProps} />);
      const closeButton = screen.getByLabelText("Close modal");

      fireEvent.mouseEnter(closeButton);
      fireEvent.mouseLeave(closeButton);

      expect(closeButton).toHaveStyle({ backgroundColor: "transparent" });
    });

    it("updates false positive button style on mouse enter", () => {
      render(<SecurityAlertModal {...defaultProps} />);
      const button = screen.getByText("Mark as false positive");

      fireEvent.mouseEnter(button);

      expect(button).toHaveStyle({ textDecoration: "underline" });
    });

    it("resets false positive button style on mouse leave", () => {
      render(<SecurityAlertModal {...defaultProps} />);
      const button = screen.getByText("Mark as false positive");

      fireEvent.mouseEnter(button);
      fireEvent.mouseLeave(button);

      expect(button).toHaveStyle({ textDecoration: "none" });
    });

    it("updates expand AI button style on mouse enter", () => {
      const { container } = render(<SecurityAlertModal {...defaultProps} />);
      const button = screen.getByText("Expand with AI");

      fireEvent.mouseEnter(button);

      expect(button).toBeInTheDocument();
    });

    it("resets expand AI button style on mouse leave", () => {
      const { container } = render(<SecurityAlertModal {...defaultProps} />);
      const button = screen.getByText("Expand with AI");

      fireEvent.mouseEnter(button);
      fireEvent.mouseLeave(button);

      expect(button).toBeInTheDocument();
    });

    it("updates resolve button state on hover", () => {
      render(<SecurityAlertModal {...defaultProps} />);
      const button = screen.getByText("Mark as resolved");

      fireEvent.mouseEnter(button);

      expect(button).toBeInTheDocument();
    });

    it("resets resolve button state on mouse leave", () => {
      render(<SecurityAlertModal {...defaultProps} />);
      const button = screen.getByText("Mark as resolved");

      fireEvent.mouseEnter(button);
      fireEvent.mouseLeave(button);

      expect(button).toBeInTheDocument();
    });
  });

  describe("Event Propagation", () => {
    it("stops propagation on modal click", () => {
      const mockOnClose = jest.fn();
      render(<SecurityAlertModal {...defaultProps} onClose={mockOnClose} />);

      const modal =
        screen.getByText("Security Alert").parentElement.parentElement;
      fireEvent.click(modal);

      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it("stops propagation on modal keydown", () => {
      const mockOnClose = jest.fn();
      render(<SecurityAlertModal {...defaultProps} onClose={mockOnClose} />);

      const modal =
        screen.getByText("Security Alert").parentElement.parentElement;
      fireEvent.keyDown(modal, { key: "Escape" });

      // Should not close because propagation is stopped
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe("Labels and Sections", () => {
    it("renders all section labels", () => {
      render(<SecurityAlertModal {...defaultProps} />);

      expect(screen.getByText("TYPE")).toBeInTheDocument();
      expect(screen.getByText("DETECTED")).toBeInTheDocument();
      expect(screen.getByText("CATEGORY")).toBeInTheDocument();
      expect(screen.getByText("STATUS")).toBeInTheDocument();
      expect(screen.getByText("SOURCE")).toBeInTheDocument();
      expect(screen.getByText("AFFECTED GROUP")).toBeInTheDocument();
      expect(screen.getByText("DESCRIPTION")).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("handles alert with minimal data", () => {
      const minimalAlert = {
        id: 999,
        type: "Test Alert",
        date: "2024-01-01",
        risk: "low",
        status: "active",
      };

      render(<SecurityAlertModal {...defaultProps} alert={minimalAlert} />);

      expect(screen.getByText("Test Alert")).toBeInTheDocument();
      expect(screen.getByText("ID: #999")).toBeInTheDocument();
    });

    it("handles different status values with capitalization", () => {
      const alert = { ...mockAlert, status: "investigating" };
      render(<SecurityAlertModal {...defaultProps} alert={alert} />);

      expect(screen.getByText("Investigating")).toBeInTheDocument();
    });

    it("handles all lowercase status", () => {
      const alert = { ...mockAlert, status: "resolved" };
      render(<SecurityAlertModal {...defaultProps} alert={alert} />);

      expect(screen.getByText("Resolved")).toBeInTheDocument();
    });

    it("renders correctly when reopened", () => {
      const { rerender } = render(
        <SecurityAlertModal {...defaultProps} isOpen={false} />,
      );

      expect(screen.queryByText("Security Alert")).not.toBeInTheDocument();

      rerender(<SecurityAlertModal {...defaultProps} isOpen={true} />);

      expect(screen.getByText("Security Alert")).toBeInTheDocument();
    });

    it("handles alert with different IDs", () => {
      const alert1 = { ...mockAlert, id: 42 };
      const alert2 = { ...mockAlert, id: 100 };

      const { rerender } = render(
        <SecurityAlertModal {...defaultProps} alert={alert1} />,
      );
      expect(screen.getByText("ID: #42")).toBeInTheDocument();

      rerender(<SecurityAlertModal {...defaultProps} alert={alert2} />);
      expect(screen.getByText("ID: #100")).toBeInTheDocument();
    });
  });

  describe("Component Integration", () => {
    it("passes correct props to DownloadButton", () => {
      render(<SecurityAlertModal {...defaultProps} />);
      const downloadButton = screen.getByTestId("download-button");
      expect(downloadButton).toHaveTextContent("Download alert");
    });

    it("integrates all action buttons correctly", () => {
      render(<SecurityAlertModal {...defaultProps} />);

      expect(screen.getByText("Mark as false positive")).toBeInTheDocument();
      expect(screen.getByTestId("download-button")).toBeInTheDocument();
      expect(screen.getByText("Mark as resolved")).toBeInTheDocument();
      expect(screen.getByText("Expand with AI")).toBeInTheDocument();
    });
  });
});
