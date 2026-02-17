import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import UserCreationProgressModal from "../UserCreationProgressModal";

describe("UserCreationProgressModal", () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ===== VISIBILITY TESTS =====
  describe("Visibility", () => {
    test("should not render anything when open is false", () => {
      const { container } = render(
        <UserCreationProgressModal open={false} onClose={mockOnClose} />
      );
      expect(container.firstChild).toBeNull();
    });

    test("should render modal when open is true", () => {
      render(
        <UserCreationProgressModal
          open={true}
          status="idle"
          onClose={mockOnClose}
        />
      );
      expect(screen.getByText("Creating User")).toBeInTheDocument();
    });

    test("should render overlay and container with correct classes", () => {
      const { container } = render(
        <UserCreationProgressModal open={true} onClose={mockOnClose} />
      );
      expect(
        container.querySelector(".user-creation-modal-overlay")
      ).toBeInTheDocument();
      expect(
        container.querySelector(".user-creation-modal-container")
      ).toBeInTheDocument();
    });
  });

  // ===== HEADER TESTS =====
  describe("Header", () => {
    test("should display 'Creating User' header", () => {
      render(
        <UserCreationProgressModal
          open={true}
          status="idle"
          onClose={mockOnClose}
        />
      );
      expect(screen.getByText("Creating User")).toBeInTheDocument();
    });

    test("should display close button when status is idle", () => {
      render(
        <UserCreationProgressModal
          open={true}
          status="idle"
          onClose={mockOnClose}
        />
      );
      const closeButton = screen.getByText("×");
      expect(closeButton).toBeInTheDocument();
      expect(closeButton).not.toBeDisabled();
    });

    test("should display close button when status is succeeded", () => {
      render(
        <UserCreationProgressModal
          open={true}
          status="succeeded"
          onClose={mockOnClose}
        />
      );
      const closeButton = screen.getByText("×");
      expect(closeButton).toBeInTheDocument();
      expect(closeButton).not.toBeDisabled();
    });

    test("should disable close button when status is running", () => {
      render(
        <UserCreationProgressModal
          open={true}
          status="running"
          onClose={mockOnClose}
        />
      );
      const closeButton = screen.getByText("×");
      expect(closeButton).toBeDisabled();
      expect(closeButton).toHaveAttribute(
        "title",
        "Wait for creation to complete"
      );
    });

    test("should hide close button when status is failed", () => {
      const { container } = render(
        <UserCreationProgressModal
          open={true}
          status="failed"
          onClose={mockOnClose}
        />
      );
      const closeButton = container.querySelector(".user-creation-modal-close");
      expect(closeButton).not.toBeInTheDocument();
    });

    test("should display correct title for close button when not running", () => {
      render(
        <UserCreationProgressModal
          open={true}
          status="idle"
          onClose={mockOnClose}
        />
      );
      const closeButton = screen.getByText("×");
      expect(closeButton).toHaveAttribute("title", "Close");
    });
  });

  // ===== PROGRESS BAR TESTS =====
  describe("Progress Bar", () => {
    test("should display 0% progress when progress prop is 0", () => {
      render(
        <UserCreationProgressModal
          open={true}
          progress={0}
          onClose={mockOnClose}
        />
      );
      expect(screen.getByText("0%")).toBeInTheDocument();
    });

    test("should display correct progress percentage", () => {
      render(
        <UserCreationProgressModal
          open={true}
          progress={75}
          onClose={mockOnClose}
        />
      );
      expect(screen.getByText("75%")).toBeInTheDocument();
    });

    test("should clamp progress to 100% maximum", () => {
      render(
        <UserCreationProgressModal
          open={true}
          progress={150}
          onClose={mockOnClose}
        />
      );
      expect(screen.getByText("100%")).toBeInTheDocument();
    });

    test("should clamp progress to 0% minimum", () => {
      render(
        <UserCreationProgressModal
          open={true}
          progress={-50}
          onClose={mockOnClose}
        />
      );
      expect(screen.getByText("0%")).toBeInTheDocument();
    });

    test("should display 50% progress when status is running without explicit progress", () => {
      render(
        <UserCreationProgressModal
          open={true}
          status="running"
          onClose={mockOnClose}
        />
      );
      expect(screen.getByText("50%")).toBeInTheDocument();
    });

    test("should display 100% progress when status is succeeded", () => {
      render(
        <UserCreationProgressModal
          open={true}
          status="succeeded"
          onClose={mockOnClose}
        />
      );
      expect(screen.getByText("100%")).toBeInTheDocument();
    });

    test("should apply correct width style to progress fill", () => {
      const { container } = render(
        <UserCreationProgressModal
          open={true}
          progress={65}
          onClose={mockOnClose}
        />
      );
      const progressFill = container.querySelector(".user-creation-progress-fill");
      expect(progressFill).toHaveStyle("width: 65%");
    });

    test("should handle string progress values", () => {
      render(
        <UserCreationProgressModal
          open={true}
          progress="45"
          onClose={mockOnClose}
        />
      );
      // String progress should result in 0% since it's not a number
      expect(screen.getByText("0%")).toBeInTheDocument();
    });
  });

  // ===== STATUS DISPLAY TESTS =====
  describe("Status Display", () => {
    test("should show 'Initializing...' for idle status", () => {
      render(
        <UserCreationProgressModal
          open={true}
          status="idle"
          onClose={mockOnClose}
        />
      );
      expect(screen.getByText("Initializing...")).toBeInTheDocument();
    });

    test("should show 'Creating User...' for running status", () => {
      render(
        <UserCreationProgressModal
          open={true}
          status="running"
          onClose={mockOnClose}
        />
      );
      expect(screen.getByText("Creating User...")).toBeInTheDocument();
    });

    test("should show 'User Created Successfully!' for succeeded status", () => {
      render(
        <UserCreationProgressModal
          open={true}
          status="succeeded"
          onClose={mockOnClose}
        />
      );
      expect(screen.getByText("User Created Successfully!")).toBeInTheDocument();
    });

    test("should show 'User Creation Failed' for failed status", () => {
      render(
        <UserCreationProgressModal
          open={true}
          status="failed"
          onClose={mockOnClose}
        />
      );
      expect(screen.getByText("User Creation Failed")).toBeInTheDocument();
    });

    test("should display spinner icon when status is running", () => {
      const { container } = render(
        <UserCreationProgressModal
          open={true}
          status="running"
          onClose={mockOnClose}
        />
      );
      expect(container.querySelector(".user-creation-spinner")).toBeInTheDocument();
    });

    test("should display checkmark icon when status is succeeded", () => {
      render(
        <UserCreationProgressModal
          open={true}
          status="succeeded"
          onClose={mockOnClose}
        />
      );
      expect(screen.getByText("✓")).toBeInTheDocument();
    });

    test("should display error mark when status is failed", () => {
      render(
        <UserCreationProgressModal
          open={true}
          status="failed"
          onClose={mockOnClose}
        />
      );
      expect(screen.getByText("✕")).toBeInTheDocument();
    });

    test("should apply correct color for idle status", () => {
      const { container } = render(
        <UserCreationProgressModal
          open={true}
          status="idle"
          onClose={mockOnClose}
        />
      );
      const indicator = container.querySelector(".user-creation-status-indicator");
      expect(indicator).toHaveStyle("backgroundColor: #6B7280");
    });

    test("should apply correct color for running status", () => {
      const { container } = render(
        <UserCreationProgressModal
          open={true}
          status="running"
          onClose={mockOnClose}
        />
      );
      const indicator = container.querySelector(".user-creation-status-indicator");
      expect(indicator).toHaveStyle("backgroundColor: #3B82F6");
    });

    test("should apply correct color for succeeded status", () => {
      const { container } = render(
        <UserCreationProgressModal
          open={true}
          status="succeeded"
          onClose={mockOnClose}
        />
      );
      const indicator = container.querySelector(".user-creation-status-indicator");
      expect(indicator).toHaveStyle("backgroundColor: #10B981");
    });

    test("should apply correct color for failed status", () => {
      const { container } = render(
        <UserCreationProgressModal
          open={true}
          status="failed"
          onClose={mockOnClose}
        />
      );
      const indicator = container.querySelector(".user-creation-status-indicator");
      expect(indicator).toHaveStyle("backgroundColor: #EF4444");
    });

    test("should apply progress bar color based on status", () => {
      const { container } = render(
        <UserCreationProgressModal
          open={true}
          status="running"
          progress={50}
          onClose={mockOnClose}
        />
      );
      const progressFill = container.querySelector(".user-creation-progress-fill");
      expect(progressFill).toHaveStyle("backgroundColor: #3B82F6");
    });
  });

  // ===== MESSAGE TESTS =====
  describe("Message Display", () => {
    test("should not display message section when message prop is empty", () => {
      const { container } = render(
        <UserCreationProgressModal
          open={true}
          message=""
          onClose={mockOnClose}
        />
      );
      expect(
        container.querySelector(".user-creation-message-section")
      ).not.toBeInTheDocument();
    });

    test("should display message section when message prop is provided", () => {
      render(
        <UserCreationProgressModal
          open={true}
          message="Adding user to groups..."
          onClose={mockOnClose}
        />
      );
      expect(screen.getByText("Adding user to groups...")).toBeInTheDocument();
    });

    test("should display custom error message on failure", () => {
      render(
        <UserCreationProgressModal
          open={true}
          status="failed"
          message="Domain connection failed"
          onClose={mockOnClose}
        />
      );
      expect(screen.getByText("Domain connection failed")).toBeInTheDocument();
    });

    test("should display custom success message on completion", () => {
      render(
        <UserCreationProgressModal
          open={true}
          status="succeeded"
          message="User successfully created in Active Directory"
          onClose={mockOnClose}
        />
      );
      expect(
        screen.getByText("User successfully created in Active Directory")
      ).toBeInTheDocument();
    });

    test("should update message when message prop changes", () => {
      const { rerender } = render(
        <UserCreationProgressModal
          open={true}
          message="Step 1: Creating user..."
          onClose={mockOnClose}
        />
      );
      expect(screen.getByText("Step 1: Creating user...")).toBeInTheDocument();

      rerender(
        <UserCreationProgressModal
          open={true}
          message="Step 2: Adding to groups..."
          onClose={mockOnClose}
        />
      );
      expect(screen.getByText("Step 2: Adding to groups...")).toBeInTheDocument();
      expect(screen.queryByText("Step 1: Creating user...")).not.toBeInTheDocument();
    });
  });

  // ===== FOOTER TESTS =====
  describe("Footer Actions", () => {
    test("should display 'Close' button when status is failed", () => {
      render(
        <UserCreationProgressModal
          open={true}
          status="failed"
          onClose={mockOnClose}
        />
      );
      const closeButton = screen.getByRole("button", { name: "Close" });
      expect(closeButton).toBeInTheDocument();
    });

    test("should display 'Done' button when status is succeeded", () => {
      render(
        <UserCreationProgressModal
          open={true}
          status="succeeded"
          onClose={mockOnClose}
        />
      );
      const doneButton = screen.getByRole("button", { name: "Done" });
      expect(doneButton).toBeInTheDocument();
    });

    test("should display waiting text when status is running", () => {
      render(
        <UserCreationProgressModal
          open={true}
          status="running"
          onClose={mockOnClose}
        />
      );
      expect(
        screen.getByText("Please wait while the user is being created on the domain...")
      ).toBeInTheDocument();
    });

    test("should not display waiting text when not running", () => {
      render(
        <UserCreationProgressModal
          open={true}
          status="succeeded"
          onClose={mockOnClose}
        />
      );
      expect(
        screen.queryByText("Please wait while the user is being created on the domain...")
      ).not.toBeInTheDocument();
    });

    test("should not display any footer button when status is idle", () => {
      render(
        <UserCreationProgressModal
          open={true}
          status="idle"
          onClose={mockOnClose}
        />
      );
      // Only the close button in header should exist
      const buttons = screen.queryAllByRole("button");
      expect(buttons.length).toBe(1); // Only header close button
    });
  });

  // ===== CLICK HANDLER TESTS =====
  describe("Click Handlers", () => {
    test("should call onClose when header close button is clicked (not running)", () => {
      render(
        <UserCreationProgressModal
          open={true}
          status="idle"
          onClose={mockOnClose}
        />
      );
      const closeButton = screen.getByText("×");
      fireEvent.click(closeButton);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    test("should not call onClose when header close button is disabled (running)", () => {
      render(
        <UserCreationProgressModal
          open={true}
          status="running"
          onClose={mockOnClose}
        />
      );
      const closeButton = screen.getByText("×");
      fireEvent.click(closeButton);
      // Button is disabled, click should not trigger onClose
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    test("should call onClose when footer 'Close' button is clicked (failed)", () => {
      render(
        <UserCreationProgressModal
          open={true}
          status="failed"
          onClose={mockOnClose}
        />
      );
      const closeButton = screen.getByRole("button", { name: "Close" });
      fireEvent.click(closeButton);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    test("should call onClose when footer 'Done' button is clicked (succeeded)", () => {
      render(
        <UserCreationProgressModal
          open={true}
          status="succeeded"
          onClose={mockOnClose}
        />
      );
      const doneButton = screen.getByRole("button", { name: "Done" });
      fireEvent.click(doneButton);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    test("should call onClose exactly once per click", () => {
      render(
        <UserCreationProgressModal
          open={true}
          status="succeeded"
          onClose={mockOnClose}
        />
      );
      const doneButton = screen.getByRole("button", { name: "Done" });
      fireEvent.click(doneButton);
      fireEvent.click(doneButton);
      fireEvent.click(doneButton);
      expect(mockOnClose).toHaveBeenCalledTimes(3);
    });
  });

  // ===== DEFAULT PROPS TESTS =====
  describe("Default Props", () => {
    test("should use default open value of false", () => {
      const { container } = render(
        <UserCreationProgressModal onClose={mockOnClose} />
      );
      expect(container.firstChild).toBeNull();
    });

    test("should use default status value of idle", () => {
      render(<UserCreationProgressModal open={true} onClose={mockOnClose} />);
      expect(screen.getByText("Initializing...")).toBeInTheDocument();
    });

    test("should use default message value of empty string", () => {
      const { container } = render(
        <UserCreationProgressModal open={true} onClose={mockOnClose} />
      );
      expect(
        container.querySelector(".user-creation-message-section")
      ).not.toBeInTheDocument();
    });

    test("should use default progress value of 0", () => {
      render(<UserCreationProgressModal open={true} onClose={mockOnClose} />);
      expect(screen.getByText("0%")).toBeInTheDocument();
    });
  });

  // ===== PROP VARIATIONS TESTS =====
  describe("Prop Variations", () => {
    test("should handle all status values: idle, running, succeeded, failed", () => {
      const statuses = ["idle", "running", "succeeded", "failed"];
      const expectedTexts = [
        "Initializing...",
        "Creating User...",
        "User Created Successfully!",
        "User Creation Failed",
      ];

      statuses.forEach((status, index) => {
        const { unmount } = render(
          <UserCreationProgressModal
            open={true}
            status={status}
            onClose={mockOnClose}
          />
        );
        expect(screen.getByText(expectedTexts[index])).toBeInTheDocument();
        unmount();
      });
    });

    test("should handle progress values from 0 to 100", () => {
      const testValues = [0, 25, 50, 75, 100];

      testValues.forEach((progress) => {
        const { unmount } = render(
          <UserCreationProgressModal
            open={true}
            progress={progress}
            onClose={mockOnClose}
          />
        );
        expect(screen.getByText(`${progress}%`)).toBeInTheDocument();
        unmount();
      });
    });

    test("should handle long messages", () => {
      const longMessage = "This is a very long message that describes the current step in user creation process with detailed information about what is happening".repeat(
        2
      );
      render(
        <UserCreationProgressModal
          open={true}
          message={longMessage}
          onClose={mockOnClose}
        />
      );
      expect(screen.getByText(longMessage)).toBeInTheDocument();
    });

    test("should handle special characters in message", () => {
      const specialMessage = 'Creating user: admin@example.com [C:\\Users\\test]';
      render(
        <UserCreationProgressModal
          open={true}
          message={specialMessage}
          onClose={mockOnClose}
        />
      );
      expect(screen.getByText(specialMessage)).toBeInTheDocument();
    });
  });

  // ===== STATE TRANSITIONS TESTS =====
  describe("State Transitions", () => {
    test("should transition from running to succeeded", () => {
      const { rerender } = render(
        <UserCreationProgressModal
          open={true}
          status="running"
          progress={50}
          onClose={mockOnClose}
        />
      );
      expect(screen.getByText("Creating User...")).toBeInTheDocument();
      expect(screen.getByText("50%")).toBeInTheDocument();

      rerender(
        <UserCreationProgressModal
          open={true}
          status="succeeded"
          progress={100}
          onClose={mockOnClose}
        />
      );
      expect(screen.getByText("User Created Successfully!")).toBeInTheDocument();
      expect(screen.getByText("100%")).toBeInTheDocument();
    });

    test("should transition from running to failed", () => {
      const { rerender } = render(
        <UserCreationProgressModal
          open={true}
          status="running"
          progress={75}
          message="Adding user to group..."
          onClose={mockOnClose}
        />
      );
      expect(screen.getByText("Creating User...")).toBeInTheDocument();

      rerender(
        <UserCreationProgressModal
          open={true}
          status="failed"
          message="Network timeout"
          onClose={mockOnClose}
        />
      );
      expect(screen.getByText("User Creation Failed")).toBeInTheDocument();
      expect(screen.getByText("Network timeout")).toBeInTheDocument();
    });

    test("should handle modal reopening after close", () => {
      const { rerender } = render(
        <UserCreationProgressModal
          open={false}
          onClose={mockOnClose}
        />
      );
      expect(screen.queryByText("Creating User")).not.toBeInTheDocument();

      rerender(
        <UserCreationProgressModal
          open={true}
          status="running"
          onClose={mockOnClose}
        />
      );
      expect(screen.getByText("Creating User")).toBeInTheDocument();
    });
  });

  // ===== CSS CLASS TESTS =====
  describe("CSS Classes", () => {
    test("should apply correct CSS classes to all elements", () => {
      const { container } = render(
        <UserCreationProgressModal
          open={true}
          status="running"
          onClose={mockOnClose}
        />
      );
      expect(
        container.querySelector(".user-creation-modal-overlay")
      ).toBeInTheDocument();
      expect(
        container.querySelector(".user-creation-modal-container")
      ).toBeInTheDocument();
      expect(
        container.querySelector(".user-creation-modal-header")
      ).toBeInTheDocument();
      expect(
        container.querySelector(".user-creation-modal-content")
      ).toBeInTheDocument();
      expect(
        container.querySelector(".user-creation-modal-footer")
      ).toBeInTheDocument();
    });

    test("should apply progress section classes", () => {
      const { container } = render(
        <UserCreationProgressModal
          open={true}
          progress={50}
          onClose={mockOnClose}
        />
      );
      expect(
        container.querySelector(".user-creation-progress-section")
      ).toBeInTheDocument();
      expect(
        container.querySelector(".user-creation-progress-track")
      ).toBeInTheDocument();
      expect(
        container.querySelector(".user-creation-progress-fill")
      ).toBeInTheDocument();
      expect(
        container.querySelector(".user-creation-progress-text")
      ).toBeInTheDocument();
    });

    test("should apply status section classes", () => {
      const { container } = render(
        <UserCreationProgressModal
          open={true}
          status="running"
          onClose={mockOnClose}
        />
      );
      expect(
        container.querySelector(".user-creation-status-section")
      ).toBeInTheDocument();
      expect(
        container.querySelector(".user-creation-status-indicator")
      ).toBeInTheDocument();
      expect(
        container.querySelector(".user-creation-status-text")
      ).toBeInTheDocument();
    });

    test("should apply button classes", () => {
      const { container } = render(
        <UserCreationProgressModal
          open={true}
          status="succeeded"
          onClose={mockOnClose}
        />
      );
      const button = container.querySelector(".user-creation-btn");
      expect(button).toHaveClass("user-creation-btn-close");
    });
  });

  // ===== EDGE CASES TESTS =====
  describe("Edge Cases", () => {
    test("should handle null message gracefully", () => {
      render(
        <UserCreationProgressModal
          open={true}
          message={null}
          onClose={mockOnClose}
        />
      );
      const messageSection = screen.queryByText(".user-creation-message-section");
      expect(messageSection).not.toBeInTheDocument();
    });

    test("should handle undefined message gracefully", () => {
      render(
        <UserCreationProgressModal
          open={true}
          message={undefined}
          onClose={mockOnClose}
        />
      );
      const messageSection = screen.queryByText(".user-creation-message-section");
      expect(messageSection).not.toBeInTheDocument();
    });

    test("should handle very high progress values", () => {
      render(
        <UserCreationProgressModal
          open={true}
          progress={9999}
          onClose={mockOnClose}
        />
      );
      expect(screen.getByText("100%")).toBeInTheDocument();
    });

    test("should handle very low progress values", () => {
      render(
        <UserCreationProgressModal
          open={true}
          progress={-9999}
          onClose={mockOnClose}
        />
      );
      expect(screen.getByText("0%")).toBeInTheDocument();
    });

    test("should handle rapid status changes", () => {
      const { rerender } = render(
        <UserCreationProgressModal
          open={true}
          status="idle"
          onClose={mockOnClose}
        />
      );

      rerender(
        <UserCreationProgressModal
          open={true}
          status="running"
          onClose={mockOnClose}
        />
      );
      expect(screen.getByText("Creating User...")).toBeInTheDocument();

      rerender(
        <UserCreationProgressModal
          open={true}
          status="succeeded"
          onClose={mockOnClose}
        />
      );
      expect(screen.getByText("User Created Successfully!")).toBeInTheDocument();

      rerender(
        <UserCreationProgressModal
          open={true}
          status="failed"
          onClose={mockOnClose}
        />
      );
      expect(screen.getByText("User Creation Failed")).toBeInTheDocument();
    });

    test("should handle onClose being called multiple times", () => {
      const { rerender } = render(
        <UserCreationProgressModal
          open={true}
          status="succeeded"
          onClose={mockOnClose}
        />
      );
      const doneButton = screen.getByRole("button", { name: "Done" });
      fireEvent.click(doneButton);

      rerender(
        <UserCreationProgressModal
          open={true}
          status="running"
          onClose={mockOnClose}
        />
      );
      const closeHeaderButton = screen.getByText("×");
      fireEvent.click(closeHeaderButton);

      expect(mockOnClose).toHaveBeenCalledTimes(2);
    });
  });

  // ===== INTEGRATION TESTS =====
  describe("Integration Tests", () => {
    test("should display complete UI for running status", () => {
      const { container } = render(
        <UserCreationProgressModal
          open={true}
          status="running"
          progress={45}
          message="Configuring Active Directory..."
          onClose={mockOnClose}
        />
      );

      // All key elements should be present
      expect(screen.getByText("Creating User")).toBeInTheDocument();
      expect(screen.getByText("Creating User...")).toBeInTheDocument();
      expect(screen.getByText("45%")).toBeInTheDocument();
      expect(screen.getByText("Configuring Active Directory...")).toBeInTheDocument();
      expect(
        screen.getByText("Please wait while the user is being created on the domain...")
      ).toBeInTheDocument();
      expect(container.querySelector(".user-creation-spinner")).toBeInTheDocument();
    });

    test("should display complete UI for succeeded status", () => {
      const { container } = render(
        <UserCreationProgressModal
          open={true}
          status="succeeded"
          message="User john.doe created successfully"
          onClose={mockOnClose}
        />
      );

      // All key elements should be present
      expect(screen.getByText("Creating User")).toBeInTheDocument();
      expect(screen.getByText("User Created Successfully!")).toBeInTheDocument();
      expect(screen.getByText("100%")).toBeInTheDocument();
      expect(screen.getByText("User john.doe created successfully")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Done" })).toBeInTheDocument();
      expect(screen.getByText("✓")).toBeInTheDocument();
    });

    test("should display complete UI for failed status", () => {
      const { container } = render(
        <UserCreationProgressModal
          open={true}
          status="failed"
          message="Failed to connect to domain controller"
          onClose={mockOnClose}
        />
      );

      // All key elements should be present
      expect(screen.getByText("Creating User")).toBeInTheDocument();
      expect(screen.getByText("User Creation Failed")).toBeInTheDocument();
      expect(screen.getByText("Failed to connect to domain controller")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
      expect(screen.getByText("✕")).toBeInTheDocument();
      expect(
        container.querySelector(".user-creation-modal-close")
      ).not.toBeInTheDocument();
    });

    test("complete user flow: idle -> running -> succeeded", () => {
      const { rerender } = render(
        <UserCreationProgressModal
          open={true}
          status="idle"
          onClose={mockOnClose}
        />
      );
      expect(screen.getByText("Initializing...")).toBeInTheDocument();

      rerender(
        <UserCreationProgressModal
          open={true}
          status="running"
          progress={30}
          message="Creating user account..."
          onClose={mockOnClose}
        />
      );
      expect(screen.getByText("Creating User...")).toBeInTheDocument();
      expect(screen.getByText("30%")).toBeInTheDocument();

      rerender(
        <UserCreationProgressModal
          open={true}
          status="running"
          progress={60}
          message="Adding to security groups..."
          onClose={mockOnClose}
        />
      );
      expect(screen.getByText("60%")).toBeInTheDocument();
      expect(screen.getByText("Adding to security groups...")).toBeInTheDocument();

      rerender(
        <UserCreationProgressModal
          open={true}
          status="succeeded"
          message="User successfully created!"
          onClose={mockOnClose}
        />
      );
      expect(screen.getByText("User Created Successfully!")).toBeInTheDocument();
      expect(screen.getByText("100%")).toBeInTheDocument();

      const doneButton = screen.getByRole("button", { name: "Done" });
      fireEvent.click(doneButton);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  // ===== ACCESSIBILITY TESTS =====
  describe("Accessibility", () => {
    test("should have proper semantic HTML structure", () => {
      const { container } = render(
        <UserCreationProgressModal
          open={true}
          status="running"
          onClose={mockOnClose}
        />
      );
      expect(container.querySelector("header")).toBeInTheDocument();
      expect(container.querySelector("footer")).toBeInTheDocument();
    });

    test("buttons should be interactive elements", () => {
      render(
        <UserCreationProgressModal
          open={true}
          status="succeeded"
          onClose={mockOnClose}
        />
      );
      const button = screen.getByRole("button", { name: "Done" });
      expect(button).toBeInTheDocument();
      expect(button.tagName).toBe("BUTTON");
    });

    test("should have descriptive button labels", () => {
      const { rerender } = render(
        <UserCreationProgressModal
          open={true}
          status="succeeded"
          onClose={mockOnClose}
        />
      );
      expect(screen.getByRole("button", { name: "Done" })).toBeInTheDocument();

      rerender(
        <UserCreationProgressModal
          open={true}
          status="failed"
          onClose={mockOnClose}
        />
      );
      expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
    });

    test("disabled button should have proper attributes", () => {
      render(
        <UserCreationProgressModal
          open={true}
          status="running"
          onClose={mockOnClose}
        />
      );
      const closeButton = screen.getByText("×");
      expect(closeButton).toBeDisabled();
    });
  });
});
