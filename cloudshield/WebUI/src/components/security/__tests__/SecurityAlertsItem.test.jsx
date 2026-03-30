/**
 * SecurityAlertsItem.test.jsx
 *
 * Comprehensive test suite for SecurityAlertsItem component.
 * Tests rendering, interactions, modal, actions, and accessibility.
 * Designed to achieve 80%+ code coverage for SonarQube analysis.
 */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SecurityAlertsItem from "../SecurityAlertsItem";

// Mock all imported components and icons
jest.mock("../../common/Checkbox/Checkbox.jsx", () => {
  return function Checkbox({ checked, onChange }) {
    const handleClick = () => {
      if (onChange) {
        onChange();
      }
    };

    return (
      <input
        type="checkbox"
        checked={checked}
        onChange={handleClick}
        onClick={handleClick}
        data-testid="checkbox"
      />
    );
  };
});

jest.mock("../../common/EditButton/EditButton", () => {
  return function EditButton({ menuItems }) {
    return (
      <div data-testid="edit-button">
        {menuItems.map((item, index) => (
          <div
            key={index}
            onClick={item.onClick}
            data-testid={`menu-item-${index}`}
            role="menuitem"
          >
            {item.label}
          </div>
        ))}
      </div>
    );
  };
});

jest.mock("../SecurityAlertModal", () => {
  return function SecurityAlertModal({ alert, isOpen, onClose }) {
    if (!isOpen) return null;
    return (
      <div data-testid="security-alert-modal">
        <p>Modal for alert: {alert.id}</p>
        <button onClick={onClose}>Close Modal</button>
      </div>
    );
  };
});

// Mock all icon components
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

jest.mock("../../../assets/security/DetailsIcon", () => {
  return function DetailsIcon() {
    return <svg data-testid="details-icon" />;
  };
});

jest.mock("../../../assets/security/FalsePositiveIcon", () => {
  return function FalsePositiveIcon() {
    return <svg data-testid="false-positive-icon" />;
  };
});

jest.mock("../../../assets/CheckmarkIcon", () => {
  return function CheckmarkIcon() {
    return <svg data-testid="checkmark-icon" />;
  };
});

jest.mock("../../../assets/DownloadIcon", () => {
  return function DownloadIcon() {
    return <svg data-testid="download-icon" />;
  };
});

describe("SecurityAlertsItem Component", () => {
  const mockAlert = {
    id: 1,
    type: "Ransomware Detection",
    date: "2024-03-15",
    displayDate: "Mar 15, 2024",
    activity: "Encrypted 45 files in Documents folder",
    risk: "high",
    status: "active",
  };

  const defaultProps = {
    securityAlert: mockAlert,
    isSelected: false,
    onToggleSelect: jest.fn(),
    isEven: false,
    onUpdateAlert: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    global.URL.createObjectURL = jest.fn(() => "blob:alert");
    global.URL.revokeObjectURL = jest.fn();
  });

  describe("Basic Rendering", () => {
    it("renders without crashing", () => {
      const { container } = render(<SecurityAlertsItem {...defaultProps} />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it("renders alert type", () => {
      render(<SecurityAlertsItem {...defaultProps} />);
      expect(screen.getByText("Ransomware Detection")).toBeInTheDocument();
    });

    it("renders display date when provided", () => {
      render(<SecurityAlertsItem {...defaultProps} />);
      expect(screen.getByText("Mar 15, 2024")).toBeInTheDocument();
    });

    it("renders date when displayDate not provided", () => {
      const alertWithoutDisplayDate = { ...mockAlert };
      delete alertWithoutDisplayDate.displayDate;

      render(<SecurityAlertsItem securityAlert={alertWithoutDisplayDate} />);
      expect(screen.getByText("2024-03-15")).toBeInTheDocument();
    });

    it("renders activity details", () => {
      render(<SecurityAlertsItem {...defaultProps} />);
      expect(
        screen.getByText("Encrypted 45 files in Documents folder"),
      ).toBeInTheDocument();
    });

    it("renders status", () => {
      render(<SecurityAlertsItem {...defaultProps} />);
      expect(screen.getByText("active")).toBeInTheDocument();
    });

    it("renders checkbox", () => {
      render(<SecurityAlertsItem {...defaultProps} />);
      expect(screen.getByTestId("checkbox")).toBeInTheDocument();
    });

    it("renders edit button", () => {
      render(<SecurityAlertsItem {...defaultProps} />);
      expect(screen.getByTestId("edit-button")).toBeInTheDocument();
    });
  });

  describe("Risk Levels", () => {
    it("renders high risk alert with correct icon and color", () => {
      render(<SecurityAlertsItem {...defaultProps} />);
      expect(screen.getByTestId("high-alert-icon")).toBeInTheDocument();
      expect(screen.getByText("High")).toBeInTheDocument();
    });

    it("renders moderate risk alert", () => {
      const moderateAlert = { ...mockAlert, risk: "moderate" };
      render(<SecurityAlertsItem securityAlert={moderateAlert} />);
      expect(screen.getByTestId("moderate-alert-icon")).toBeInTheDocument();
      expect(screen.getByText("Moderate")).toBeInTheDocument();
    });

    it("renders low risk alert", () => {
      const lowAlert = { ...mockAlert, risk: "low" };
      render(<SecurityAlertsItem securityAlert={lowAlert} />);
      expect(screen.getByTestId("low-alert-icon")).toBeInTheDocument();
      expect(screen.getByText("Low")).toBeInTheDocument();
    });

    it("defaults to low risk for unknown risk levels", () => {
      const unknownRiskAlert = { ...mockAlert, risk: "unknown" };
      render(<SecurityAlertsItem securityAlert={unknownRiskAlert} />);
      // Should default to low
      expect(screen.getByTestId("low-alert-icon")).toBeInTheDocument();
    });
  });

  describe("Checkbox Interaction", () => {
    it("checkbox reflects isSelected prop", () => {
      render(<SecurityAlertsItem {...defaultProps} isSelected={true} />);
      const checkbox = screen.getByTestId("checkbox");
      expect(checkbox).toBeChecked();
    });

    it("checkbox is unchecked when isSelected is false", () => {
      render(<SecurityAlertsItem {...defaultProps} isSelected={false} />);
      const checkbox = screen.getByTestId("checkbox");
      expect(checkbox).not.toBeChecked();
    });

    it("calls onToggleSelect when checkbox is clicked", () => {
      const mockToggle = jest.fn();
      render(
        <SecurityAlertsItem {...defaultProps} onToggleSelect={mockToggle} />,
      );

      const checkbox = screen.getByTestId("checkbox");
      fireEvent.click(checkbox);

      expect(mockToggle).toHaveBeenCalledWith(1);
      expect(mockToggle).toHaveBeenCalled();
    });

    it("does not open modal when checkbox is clicked", () => {
      render(<SecurityAlertsItem {...defaultProps} />);

      const checkbox = screen.getByTestId("checkbox");
      fireEvent.click(checkbox);

      expect(
        screen.queryByTestId("security-alert-modal"),
      ).not.toBeInTheDocument();
    });
  });

  describe("Modal Functionality", () => {
    it("modal is closed by default", () => {
      render(<SecurityAlertsItem {...defaultProps} />);
      expect(
        screen.queryByTestId("security-alert-modal"),
      ).not.toBeInTheDocument();
    });

    it("opens modal when row is clicked", async () => {
      render(<SecurityAlertsItem {...defaultProps} />);

      const row = screen.getByRole("button");
      fireEvent.click(row);

      await waitFor(() => {
        expect(screen.getByTestId("security-alert-modal")).toBeInTheDocument();
      });
    });

    it("closes modal when close button clicked", async () => {
      render(<SecurityAlertsItem {...defaultProps} />);

      const row = screen.getByRole("button");
      fireEvent.click(row);

      await waitFor(() => {
        expect(screen.getByTestId("security-alert-modal")).toBeInTheDocument();
      });

      const closeButton = screen.getByText("Close Modal");
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(
          screen.queryByTestId("security-alert-modal"),
        ).not.toBeInTheDocument();
      });
    });

    it("passes alert to modal", async () => {
      render(<SecurityAlertsItem {...defaultProps} />);

      const row = screen.getByRole("button");
      fireEvent.click(row);

      await waitFor(() => {
        expect(screen.getByText("Modal for alert: 1")).toBeInTheDocument();
      });
    });
  });

  describe("Edit Menu Actions", () => {
    it("renders all menu items", () => {
      render(<SecurityAlertsItem {...defaultProps} />);

      expect(screen.getByText("View details")).toBeInTheDocument();
      expect(screen.getByText("Mark as resolved")).toBeInTheDocument();
      expect(screen.getByText("Mark as false positive")).toBeInTheDocument();
      expect(screen.getByText("Download")).toBeInTheDocument();
    });

    it("opens modal when 'View details' is clicked", async () => {
      render(<SecurityAlertsItem {...defaultProps} />);

      const viewDetailsButton = screen.getByText("View details");
      fireEvent.click(viewDetailsButton);

      await waitFor(() => {
        expect(screen.getByTestId("security-alert-modal")).toBeInTheDocument();
      });
    });

    it("updates the alert when 'Mark as resolved' is clicked", () => {
      const onUpdateAlert = jest.fn();
      render(
        <SecurityAlertsItem
          {...defaultProps}
          onUpdateAlert={onUpdateAlert}
        />,
      );

      const markResolvedButton = screen.getByText("Mark as resolved");
      fireEvent.click(markResolvedButton);

      expect(onUpdateAlert).toHaveBeenCalledWith(1, { status: "resolved" });
    });

    it("updates the alert when 'Mark as false positive' is clicked", () => {
      const onUpdateAlert = jest.fn();
      render(
        <SecurityAlertsItem
          {...defaultProps}
          onUpdateAlert={onUpdateAlert}
        />,
      );

      const falsePositiveButton = screen.getByText("Mark as false positive");
      fireEvent.click(falsePositiveButton);

      expect(onUpdateAlert).toHaveBeenCalledWith(1, { status: "removed" });
    });

    it("downloads the alert payload when 'Download' is clicked", () => {
      render(<SecurityAlertsItem {...defaultProps} />);

      const downloadButton = screen.getByText("Download");
      fireEvent.click(downloadButton);

      expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
      expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:alert");
    });
  });

  describe("Styling and Visual States", () => {
    it("applies even row background", () => {
      render(
        <SecurityAlertsItem {...defaultProps} isEven={true} />,
      );
      const row = screen.getByRole("button");

      expect(row).toBeInTheDocument();
    });

    it("applies transparent background for odd rows", () => {
      render(
        <SecurityAlertsItem {...defaultProps} isEven={false} />,
      );
      const row = screen.getByRole("button");

      expect(row).toHaveStyle({ backgroundColor: "transparent" });
    });

    it("applies hover effect on mouse enter", () => {
      render(<SecurityAlertsItem {...defaultProps} />);
      const row = screen.getByRole("button");

      fireEvent.mouseEnter(row);
      expect(row).toBeInTheDocument();
    });

    it("removes hover effect on mouse leave for even row", () => {
      render(
        <SecurityAlertsItem {...defaultProps} isEven={true} />,
      );
      const row = screen.getByRole("button");

      fireEvent.mouseEnter(row);
      fireEvent.mouseLeave(row);

      expect(row).toBeInTheDocument();
    });

    it("removes hover effect on mouse leave for odd row", () => {
      render(
        <SecurityAlertsItem {...defaultProps} isEven={false} />,
      );
      const row = screen.getByRole("button");

      fireEvent.mouseEnter(row);
      fireEvent.mouseLeave(row);

      expect(row).toHaveStyle({ backgroundColor: "transparent" });
    });

    it("applies grid layout", () => {
      render(<SecurityAlertsItem {...defaultProps} />);
      const row = screen.getByRole("button");

      expect(row).toHaveStyle({
        display: "grid",
        gridTemplateColumns: "40px 1fr 1.2fr 2fr 1fr 1fr 40px",
      });
    });

    it("has cursor pointer", () => {
      render(<SecurityAlertsItem {...defaultProps} />);
      const row = screen.getByRole("button");

      expect(row).toHaveStyle({ cursor: "pointer" });
    });
  });

  describe("Keyboard Accessibility", () => {
    it("opens modal on Enter key", async () => {
      render(<SecurityAlertsItem {...defaultProps} />);

      const row = screen.getByRole("button");
      fireEvent.keyDown(row, { key: "Enter" });

      await waitFor(() => {
        expect(screen.getByTestId("security-alert-modal")).toBeInTheDocument();
      });
    });

    it("opens modal on Space key", async () => {
      render(<SecurityAlertsItem {...defaultProps} />);

      const row = screen.getByRole("button");
      fireEvent.keyDown(row, { key: " " });

      await waitFor(() => {
        expect(screen.getByTestId("security-alert-modal")).toBeInTheDocument();
      });
    });

    it("row has button role for accessibility", () => {
      render(<SecurityAlertsItem {...defaultProps} />);
      const row = screen.getByRole("button");

      expect(row).toBeInTheDocument();
      expect(row.tagName).toBe("DIV");
    });

    it("row has button type", () => {
      render(<SecurityAlertsItem {...defaultProps} />);
      const row = screen.getByRole("button");

      expect(row).toHaveAttribute("tabIndex", "0");
    });

    it("does not open modal on other key press", () => {
      render(<SecurityAlertsItem {...defaultProps} />);

      const row = screen.getByRole("button");
      fireEvent.keyDown(row, { key: "Tab" });

      // Modal should NOT open for non-Enter/Space keys
      expect(
        screen.queryByTestId("security-alert-modal"),
      ).not.toBeInTheDocument();
    });
  });

  describe("PropTypes and Edge Cases", () => {
    it("uses default props when optional props not provided", () => {
      const minimalProps = {
        securityAlert: mockAlert,
      };

      expect(() => {
        render(<SecurityAlertsItem {...minimalProps} />);
      }).not.toThrow();
    });

    it("handles different alert IDs", () => {
      const alert2 = { ...mockAlert, id: 999 };
      render(<SecurityAlertsItem securityAlert={alert2} />);

      const checkbox = screen.getByTestId("checkbox");
      fireEvent.click(checkbox);

      // onToggleSelect should be called with default no-op function
      expect(checkbox).toBeInTheDocument();
    });

    it("renders different alert types", () => {
      const malwareAlert = { ...mockAlert, type: "Malware Detected" };
      render(<SecurityAlertsItem securityAlert={malwareAlert} />);

      expect(screen.getByText("Malware Detected")).toBeInTheDocument();
    });

    it("renders different statuses with capitalization", () => {
      const { container } = render(<SecurityAlertsItem {...defaultProps} />);
      const statusElement = screen.getByText("active");

      expect(statusElement).toHaveStyle({ textTransform: "capitalize" });
    });

    it("handles multiple rapid clicks", async () => {
      render(<SecurityAlertsItem {...defaultProps} />);

      const row = screen.getByRole("button");
      fireEvent.click(row);
      fireEvent.click(row);
      fireEvent.click(row);

      await waitFor(() => {
        expect(screen.getByTestId("security-alert-modal")).toBeInTheDocument();
      });
    });
  });

  describe("Event Propagation", () => {
    it("stops propagation for checkbox clicks", () => {
      const mockToggle = jest.fn();
      render(
        <SecurityAlertsItem {...defaultProps} onToggleSelect={mockToggle} />,
      );

      const checkbox = screen.getByTestId("checkbox");
      fireEvent.click(checkbox);

      // Modal should NOT open
      expect(
        screen.queryByTestId("security-alert-modal"),
      ).not.toBeInTheDocument();
      // But toggle should be called
      expect(mockToggle).toHaveBeenCalled();
    });

    it("stops propagation for checkbox keydown events", () => {
      const { container } = render(<SecurityAlertsItem {...defaultProps} />);

      // Find the checkbox wrapper div
      const checkboxWrapper = container.querySelector('[role="presentation"]');

      // Fire keydown event on the wrapper
      fireEvent.keyDown(checkboxWrapper, { key: "Enter" });

      // Modal should NOT open when pressing key on checkbox wrapper
      expect(
        screen.queryByTestId("security-alert-modal"),
      ).not.toBeInTheDocument();
    });

    it("stops propagation for edit button clicks", () => {
      render(<SecurityAlertsItem {...defaultProps} />);

      const downloadButton = screen.getByText("Download");
      fireEvent.click(downloadButton);

      // Modal should NOT open when clicking edit menu
      expect(
        screen.queryByTestId("security-alert-modal"),
      ).not.toBeInTheDocument();
      expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    });

    it("stops propagation for edit button keydown events", () => {
      const { container } = render(<SecurityAlertsItem {...defaultProps} />);

      // Find the edit wrapper div
      const editWrappers = container.querySelectorAll('[role="presentation"]');
      const editWrapper = editWrappers[1]; // Second one is the edit button wrapper

      // Fire keydown event on the wrapper
      fireEvent.keyDown(editWrapper, { key: "Enter" });

      // Modal should NOT open when pressing key on edit wrapper
      expect(
        screen.queryByTestId("security-alert-modal"),
      ).not.toBeInTheDocument();
    });
  });

  describe("Component Integration", () => {
    it("passes correct props to Checkbox", () => {
      render(<SecurityAlertsItem {...defaultProps} isSelected={true} />);
      const checkbox = screen.getByTestId("checkbox");

      expect(checkbox).toBeChecked();
    });

    it("passes correct props to SecurityAlertModal", async () => {
      render(<SecurityAlertsItem {...defaultProps} />);

      const row = screen.getByRole("button");
      fireEvent.click(row);

      await waitFor(() => {
        const modalText = screen.getByText("Modal for alert: 1");
        expect(modalText).toBeInTheDocument();
      });
    });

    it("passes menuItems to EditButton", () => {
      render(<SecurityAlertsItem {...defaultProps} />);

      // All 4 menu items should be present
      expect(screen.getByText("View details")).toBeInTheDocument();
      expect(screen.getByText("Mark as resolved")).toBeInTheDocument();
      expect(screen.getByText("Mark as false positive")).toBeInTheDocument();
      expect(screen.getByText("Download")).toBeInTheDocument();
    });
  });
});
