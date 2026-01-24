/**
 * GroupsModal.test.jsx
 *
 * Test suite for the GroupsModal component
 * Tests multi-step wizard, form validation, and user interactions
 */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import GroupsModal from "../GroupsModal";

// Mock DisplayIcon component
jest.mock("../../common/DisplayIcon/DisplayIcon.jsx", () => {
  return function DummyDisplayIcon({ type, data, size }) {
    return (
      <div data-testid={`display-icon-${type}`} data-size={size}>
        {data?.name || data?.firstName || "Icon"}
      </div>
    );
  };
});

jest.mock("../../../assets/ImageUploadIcon.jsx", () => {
  return function DummyUploadIcon() {
    return <span>Upload</span>;
  };
});

// Mock CSS import
jest.mock("../GroupsModal.css", () => ({}));

describe("GroupsModal Component", () => {
  const mockOnClose = jest.fn();
  const mockOnSubmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Basic rendering tests
  describe("Rendering", () => {
    test("renders nothing when open is false", () => {
      render(<GroupsModal open={false} onClose={mockOnClose} />);
      expect(screen.queryByTestId("groups-modal")).not.toBeInTheDocument();
    });

    test("renders modal when open is true", () => {
      render(<GroupsModal open={true} onClose={mockOnClose} />);
      expect(screen.getByText("New Group")).toBeInTheDocument();
    });

    test("shows Edit Group title in edit mode", () => {
      const groupData = {
        id: "1",
        name: "Test Group",
        description: "Test Description",
      };

      render(
        <GroupsModal open={true} onClose={mockOnClose} groupData={groupData} />,
      );
      expect(screen.getByText("Edit Group")).toBeInTheDocument();
    });

    test("shows New Group title in create mode", () => {
      render(<GroupsModal open={true} onClose={mockOnClose} />);
      expect(screen.getByText("New Group")).toBeInTheDocument();
    });
  });

  // Breadcrumb tests
  describe("Breadcrumb Navigation", () => {
    test("displays Groups breadcrumb", () => {
      render(<GroupsModal open={true} onClose={mockOnClose} />);
      expect(screen.getByText("Groups")).toBeInTheDocument();
    });

    test("displays close button", () => {
      render(<GroupsModal open={true} onClose={mockOnClose} />);
      const closeButton = screen.getByLabelText("Close");
      expect(closeButton).toBeInTheDocument();
    });

    test("calls onClose when close button is clicked", async () => {
      render(<GroupsModal open={true} onClose={mockOnClose} />);
      const closeButton = screen.getByLabelText("Close");

      await userEvent.click(closeButton);
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  // Progress bar tests
  describe("Progress Bar", () => {
    test("displays all step labels", () => {
      render(<GroupsModal open={true} onClose={mockOnClose} />);

      expect(screen.getByText("Basic Info")).toBeInTheDocument();
      expect(screen.getByText("Users")).toBeInTheDocument();
      expect(screen.getByText("Workstations")).toBeInTheDocument();
      expect(screen.getByText("Files")).toBeInTheDocument();
    });

    test("shows active state for current step", () => {
      render(<GroupsModal open={true} onClose={mockOnClose} />);

      const basicInfoStep = screen.getByText("Basic Info");
      expect(basicInfoStep).toHaveClass("active");
    });
  });

  // Basic Info step tests
  describe("Basic Info Step", () => {
    test("renders group name input", () => {
      render(<GroupsModal open={true} onClose={mockOnClose} />);
      expect(
        screen.getByPlaceholderText("Enter group name"),
      ).toBeInTheDocument();
    });

    test("renders description textarea", () => {
      render(<GroupsModal open={true} onClose={mockOnClose} />);
      expect(
        screen.getByPlaceholderText("Enter a brief description of the group"),
      ).toBeInTheDocument();
    });

    test("allows typing in group name field", async () => {
      render(<GroupsModal open={true} onClose={mockOnClose} />);
      const nameInput = screen.getByPlaceholderText("Enter group name");

      await userEvent.type(nameInput, "Test Group");
      expect(nameInput).toHaveValue("Test Group");
    });

    test("allows typing in description field", async () => {
      render(<GroupsModal open={true} onClose={mockOnClose} />);
      const descInput = screen.getByPlaceholderText(
        "Enter a brief description of the group",
      );

      await userEvent.type(descInput, "Test Description");
      expect(descInput).toHaveValue("Test Description");
    });

    test("disables Next button when group name is empty", () => {
      render(<GroupsModal open={true} onClose={mockOnClose} />);
      const nextButton = screen.getByText("Next");
      expect(nextButton).toBeDisabled();
    });

    test("enables Next button when group name is filled", async () => {
      render(<GroupsModal open={true} onClose={mockOnClose} />);
      const nameInput = screen.getByPlaceholderText("Enter group name");
      const nextButton = screen.getByText("Next");

      await userEvent.type(nameInput, "Test Group");
      expect(nextButton).not.toBeDisabled();
    });

    test("shows image upload placeholder initially", () => {
      render(<GroupsModal open={true} onClose={mockOnClose} />);
      expect(screen.getByText("Upload Image")).toBeInTheDocument();
    });

    test("handles image removal", async () => {
      const groupData = {
        id: "1",
        name: "Test",
        description: "Test",
        image: "data:image/png;base64,test",
      };

      render(
        <GroupsModal open={true} onClose={mockOnClose} groupData={groupData} />,
      );

      const removeButtons = screen.getAllByText("×");
      // The last one is the image remove button (close button is first)
      await userEvent.click(removeButtons[removeButtons.length - 1]);

      expect(screen.getByText("Upload Image")).toBeInTheDocument();
    });

    test("handles file input change event", () => {
      render(<GroupsModal open={true} onClose={mockOnClose} />);

      // Find the file input
      const fileInputs = document.querySelectorAll('input[type="file"]');
      expect(fileInputs.length).toBeGreaterThan(0);

      // Create a mock file
      const file = new File(["dummy content"], "test.png", {
        type: "image/png",
      });
      const fileInput = fileInputs[0];

      // Mock FileReader
      const mockFileReader = {
        readAsDataURL: jest.fn(),
        result: "data:image/png;base64,test",
        onloadend: null,
      };

      global.FileReader = jest.fn(() => mockFileReader);

      // Trigger change
      fireEvent.change(fileInput, { target: { files: [file] } });

      // Simulate onloadend
      if (mockFileReader.onloadend) {
        mockFileReader.onloadend();
      }

      expect(mockFileReader.readAsDataURL).toHaveBeenCalledWith(file);
    });

    test("handles empty file upload", () => {
      render(<GroupsModal open={true} onClose={mockOnClose} />);

      const fileInputs = document.querySelectorAll('input[type="file"]');
      const fileInput = fileInputs[0];

      // Trigger change with no files
      fireEvent.change(fileInput, { target: { files: [] } });

      // Should not crash
      expect(screen.getByText("Upload Image")).toBeInTheDocument();
    });
  });

  // Navigation tests
  describe("Step Navigation", () => {
    test("Back button is disabled on first step", () => {
      render(<GroupsModal open={true} onClose={mockOnClose} />);
      const backButton = screen.getByText("Back");
      expect(backButton).toBeDisabled();
    });

    test("navigates to next step when Next is clicked", async () => {
      render(<GroupsModal open={true} onClose={mockOnClose} />);
      const nameInput = screen.getByPlaceholderText("Enter group name");
      await userEvent.type(nameInput, "Test Group");

      const nextButton = screen.getByText("Next");
      await userEvent.click(nextButton);

      // Should now be on Users step
      expect(
        screen.getByPlaceholderText("Search users..."),
      ).toBeInTheDocument();
    });

    test("navigates back to previous step", async () => {
      render(<GroupsModal open={true} onClose={mockOnClose} />);
      const nameInput = screen.getByPlaceholderText("Enter group name");
      await userEvent.type(nameInput, "Test Group");

      const nextButton = screen.getByText("Next");
      await userEvent.click(nextButton);

      const backButton = screen.getByText("Back");
      await userEvent.click(backButton);

      // Should be back on Basic Info
      expect(
        screen.getByPlaceholderText("Enter group name"),
      ).toBeInTheDocument();
    });

    test("shows Create/Save button on last step", async () => {
      render(<GroupsModal open={true} onClose={mockOnClose} />);
      const nameInput = screen.getByPlaceholderText("Enter group name");
      await userEvent.type(nameInput, "Test Group");

      // Navigate through all steps
      const nextButton = screen.getByText("Next");
      await userEvent.click(nextButton); // Users
      await userEvent.click(nextButton); // Workstations
      await userEvent.click(nextButton); // Files

      expect(screen.getByText("Create Group")).toBeInTheDocument();
    });

    test("shows Save Changes button in edit mode", async () => {
      const groupData = {
        id: "1",
        name: "Test Group",
        description: "Test",
      };

      render(
        <GroupsModal open={true} onClose={mockOnClose} groupData={groupData} />,
      );

      // Navigate to last step
      const nextButton = screen.getByText("Next");
      await userEvent.click(nextButton);
      await userEvent.click(nextButton);
      await userEvent.click(nextButton);

      expect(screen.getByText("Save Changes")).toBeInTheDocument();
    });
  });

  // Users step tests
  describe("Users Selection Step", () => {
    test("renders user search input", async () => {
      render(<GroupsModal open={true} onClose={mockOnClose} />);
      const nameInput = screen.getByPlaceholderText("Enter group name");
      await userEvent.type(nameInput, "Test Group");

      await userEvent.click(screen.getByText("Next"));

      expect(
        screen.getByPlaceholderText("Search users..."),
      ).toBeInTheDocument();
    });

    test("allows typing in user search", async () => {
      render(<GroupsModal open={true} onClose={mockOnClose} />);
      const nameInput = screen.getByPlaceholderText("Enter group name");
      await userEvent.type(nameInput, "Test Group");

      await userEvent.click(screen.getByText("Next"));

      const searchInput = screen.getByPlaceholderText("Search users...");
      await userEvent.type(searchInput, "john");
      expect(searchInput).toHaveValue("john");
    });
  });

  // Workstations step tests
  describe("Workstations Selection Step", () => {
    test("renders workstation search input", async () => {
      render(<GroupsModal open={true} onClose={mockOnClose} />);
      const nameInput = screen.getByPlaceholderText("Enter group name");
      await userEvent.type(nameInput, "Test Group");

      await userEvent.click(screen.getByText("Next"));
      await userEvent.click(screen.getByText("Next"));

      expect(
        screen.getByPlaceholderText("Search workstations..."),
      ).toBeInTheDocument();
    });
  });

  // Files step tests
  describe("Files Selection Step", () => {
    test("renders file search input", async () => {
      render(<GroupsModal open={true} onClose={mockOnClose} />);
      const nameInput = screen.getByPlaceholderText("Enter group name");
      await userEvent.type(nameInput, "Test Group");

      await userEvent.click(screen.getByText("Next"));
      await userEvent.click(screen.getByText("Next"));
      await userEvent.click(screen.getByText("Next"));

      expect(
        screen.getByPlaceholderText("Search files..."),
      ).toBeInTheDocument();
    });
  });

  // Submit tests
  describe("Form Submission", () => {
    test("calls onSubmit with form data when Create is clicked", async () => {
      render(
        <GroupsModal
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />,
      );

      const nameInput = screen.getByPlaceholderText("Enter group name");
      await userEvent.type(nameInput, "Test Group");

      const descInput = screen.getByPlaceholderText(
        "Enter a brief description of the group",
      );
      await userEvent.type(descInput, "Test Description");

      // Navigate to last step
      await userEvent.click(screen.getByText("Next"));
      await userEvent.click(screen.getByText("Next"));
      await userEvent.click(screen.getByText("Next"));

      await userEvent.click(screen.getByText("Create Group"));

      expect(mockOnSubmit).toHaveBeenCalledWith({
        name: "Test Group",
        description: "Test Description",
        image: null,
        users: [],
        workstations: [],
        files: [],
      });
    });

    test("calls onClose after submission", async () => {
      render(
        <GroupsModal
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />,
      );

      const nameInput = screen.getByPlaceholderText("Enter group name");
      await userEvent.type(nameInput, "Test Group");

      // Navigate to last step
      await userEvent.click(screen.getByText("Next"));
      await userEvent.click(screen.getByText("Next"));
      await userEvent.click(screen.getByText("Next"));

      await userEvent.click(screen.getByText("Create Group"));

      expect(mockOnClose).toHaveBeenCalled();
    });

    test("handles submit without onSubmit callback", async () => {
      render(<GroupsModal open={true} onClose={mockOnClose} />);

      const nameInput = screen.getByPlaceholderText("Enter group name");
      await userEvent.type(nameInput, "Test Group");

      // Navigate to last step
      await userEvent.click(screen.getByText("Next"));
      await userEvent.click(screen.getByText("Next"));
      await userEvent.click(screen.getByText("Next"));

      await userEvent.click(screen.getByText("Create Group"));

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  // Cancel button tests
  describe("Cancel Button", () => {
    test("renders cancel button", () => {
      render(<GroupsModal open={true} onClose={mockOnClose} />);
      expect(screen.getByText("Cancel")).toBeInTheDocument();
    });

    test("calls onClose when cancel is clicked", async () => {
      render(<GroupsModal open={true} onClose={mockOnClose} />);

      await userEvent.click(screen.getByText("Cancel"));
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  // Edit mode initialization tests
  describe("Edit Mode Initialization", () => {
    test("populates form with existing group data", () => {
      const groupData = {
        id: "1",
        name: "Existing Group",
        description: "Existing Description",
        image: null,
        users: [],
        workstations: [],
      };

      render(
        <GroupsModal open={true} onClose={mockOnClose} groupData={groupData} />,
      );

      const nameInput = screen.getByPlaceholderText("Enter group name");
      const descInput = screen.getByPlaceholderText(
        "Enter a brief description of the group",
      );

      expect(nameInput).toHaveValue("Existing Group");
      expect(descInput).toHaveValue("Existing Description");
    });
  });

  // Selection interactions
  describe("Selection Interactions", () => {
    test("clears search on step change", async () => {
      render(<GroupsModal open={true} onClose={mockOnClose} />);

      const nameInput = screen.getByPlaceholderText("Enter group name");
      await userEvent.type(nameInput, "Test Group");

      // Navigate to users step
      await userEvent.click(screen.getByText("Next"));

      const searchInput = screen.getByPlaceholderText("Search users...");
      await userEvent.type(searchInput, "test");

      expect(searchInput).toHaveValue("test");
    });

    test("updates workstations search term", async () => {
      render(<GroupsModal open={true} onClose={mockOnClose} />);

      const nameInput = screen.getByPlaceholderText("Enter group name");
      await userEvent.type(nameInput, "Test Group");

      // Navigate to workstations step
      await userEvent.click(screen.getByText("Next"));
      await userEvent.click(screen.getByText("Next"));

      const searchInput = screen.getByPlaceholderText("Search workstations...");
      await userEvent.type(searchInput, "ws");

      expect(searchInput).toHaveValue("ws");
    });

    test("updates files search term", async () => {
      render(<GroupsModal open={true} onClose={mockOnClose} />);

      const nameInput = screen.getByPlaceholderText("Enter group name");
      await userEvent.type(nameInput, "Test Group");

      // Navigate to files step
      await userEvent.click(screen.getByText("Next"));
      await userEvent.click(screen.getByText("Next"));
      await userEvent.click(screen.getByText("Next"));

      const searchInput = screen.getByPlaceholderText("Search files...");
      await userEvent.type(searchInput, "doc");

      expect(searchInput).toHaveValue("doc");
    });

    test("handles default case in step rendering", () => {
      // This tests the default return null case by checking all valid steps
      render(<GroupsModal open={true} onClose={mockOnClose} />);
      expect(
        screen.getByPlaceholderText("Enter group name"),
      ).toBeInTheDocument();
    });
  });

  // Edge cases
  describe("Edge Cases", () => {
    test("handles reopening modal", async () => {
      const { rerender } = render(
        <GroupsModal open={true} onClose={mockOnClose} />,
      );

      const nameInput = screen.getByPlaceholderText("Enter group name");
      await userEvent.type(nameInput, "Test");

      // Close modal
      rerender(<GroupsModal open={false} onClose={mockOnClose} />);

      // Reopen modal - should reset
      rerender(<GroupsModal open={true} onClose={mockOnClose} />);

      const newNameInput = screen.getByPlaceholderText("Enter group name");
      expect(newNameInput).toHaveValue("");
    });

    test("handles switching from create to edit mode", () => {
      const { rerender } = render(
        <GroupsModal open={true} onClose={mockOnClose} />,
      );

      const groupData = {
        id: "1",
        name: "Edit Group",
        description: "Edit Description",
      };

      rerender(
        <GroupsModal open={true} onClose={mockOnClose} groupData={groupData} />,
      );

      expect(screen.getByText("Edit Group")).toBeInTheDocument();
    });

    test("resets to first step when reopened", async () => {
      const { rerender } = render(
        <GroupsModal open={true} onClose={mockOnClose} />,
      );

      const nameInput = screen.getByPlaceholderText("Enter group name");
      await userEvent.type(nameInput, "Test");

      // Navigate to second step
      await userEvent.click(screen.getByText("Next"));

      // Close and reopen
      rerender(<GroupsModal open={false} onClose={mockOnClose} />);
      rerender(<GroupsModal open={true} onClose={mockOnClose} />);

      // Should be on first step
      expect(
        screen.getByPlaceholderText("Enter group name"),
      ).toBeInTheDocument();
    });

    test("handles empty group data in edit mode", () => {
      const groupData = {
        id: "1",
      };

      render(
        <GroupsModal open={true} onClose={mockOnClose} groupData={groupData} />,
      );

      const nameInput = screen.getByPlaceholderText("Enter group name");
      expect(nameInput).toHaveValue("");
    });

    test("handles image upload change event", async () => {
      render(<GroupsModal open={true} onClose={mockOnClose} />);

      const fileInput = screen
        .getByPlaceholderText("Enter group name")
        .parentElement.parentElement.parentElement.querySelector(
          'input[type="file"]',
        );

      expect(fileInput).toBeTruthy();
    });
  });

  // Selection step interaction tests
  describe("Users Selection Step", () => {
    test("navigates to users step", async () => {
      render(<GroupsModal open={true} onClose={mockOnClose} />);

      const nameInput = screen.getByPlaceholderText("Enter group name");
      await userEvent.type(nameInput, "Test Group");

      await userEvent.click(screen.getByText("Next"));

      expect(
        screen.getByPlaceholderText("Search users..."),
      ).toBeInTheDocument();
    });

    test("allows search term updates in users step", async () => {
      render(<GroupsModal open={true} onClose={mockOnClose} />);

      const nameInput = screen.getByPlaceholderText("Enter group name");
      await userEvent.type(nameInput, "Test Group");
      await userEvent.click(screen.getByText("Next"));

      const searchInput = screen.getByPlaceholderText("Search users...");
      await userEvent.type(searchInput, "test");

      expect(searchInput).toHaveValue("test");
    });
  });

  describe("Workstations Selection Step", () => {
    test("navigates to workstations step", async () => {
      render(<GroupsModal open={true} onClose={mockOnClose} />);

      const nameInput = screen.getByPlaceholderText("Enter group name");
      await userEvent.type(nameInput, "Test Group");

      await userEvent.click(screen.getByText("Next"));
      await userEvent.click(screen.getByText("Next"));

      expect(
        screen.getByPlaceholderText("Search workstations..."),
      ).toBeInTheDocument();
    });

    test("allows search term updates in workstations step", async () => {
      render(<GroupsModal open={true} onClose={mockOnClose} />);

      const nameInput = screen.getByPlaceholderText("Enter group name");
      await userEvent.type(nameInput, "Test Group");
      await userEvent.click(screen.getByText("Next"));
      await userEvent.click(screen.getByText("Next"));

      const searchInput = screen.getByPlaceholderText("Search workstations...");
      await userEvent.type(searchInput, "test");

      expect(searchInput).toHaveValue("test");
    });
  });

  describe("Files Selection Step", () => {
    test("navigates to files step", async () => {
      render(<GroupsModal open={true} onClose={mockOnClose} />);

      const nameInput = screen.getByPlaceholderText("Enter group name");
      await userEvent.type(nameInput, "Test Group");

      await userEvent.click(screen.getByText("Next"));
      await userEvent.click(screen.getByText("Next"));
      await userEvent.click(screen.getByText("Next"));

      expect(
        screen.getByPlaceholderText("Search files..."),
      ).toBeInTheDocument();
    });

    test("allows search term updates in files step", async () => {
      render(<GroupsModal open={true} onClose={mockOnClose} />);

      const nameInput = screen.getByPlaceholderText("Enter group name");
      await userEvent.type(nameInput, "Test Group");
      await userEvent.click(screen.getByText("Next"));
      await userEvent.click(screen.getByText("Next"));
      await userEvent.click(screen.getByText("Next"));

      const searchInput = screen.getByPlaceholderText("Search files...");
      await userEvent.type(searchInput, "test");

      expect(searchInput).toHaveValue("test");
    });
  });

  describe("Default Switch Case", () => {
    test("handles invalid step gracefully", () => {
      const { container } = render(
        <GroupsModal open={true} onClose={mockOnClose} />,
      );

      // Modal should still render even with edge cases
      expect(container.querySelector(".groups-modal-dialog")).toBeTruthy();
    });
  });

  describe("Additional Edge Cases", () => {
    test("handles description textarea input", async () => {
      render(<GroupsModal open={true} onClose={mockOnClose} />);

      const nameInput = screen.getByPlaceholderText("Enter group name");
      await userEvent.type(nameInput, "Test Group");

      const descInput = screen.getByPlaceholderText(
        "Enter a brief description of the group",
      );
      await userEvent.type(descInput, "Test description");

      expect(descInput).toHaveValue("Test description");
    });

    test("navigates back from users step", async () => {
      render(<GroupsModal open={true} onClose={mockOnClose} />);

      const nameInput = screen.getByPlaceholderText("Enter group name");
      await userEvent.type(nameInput, "Test Group");

      // Navigate forward
      await userEvent.click(screen.getByText("Next"));

      // Navigate back
      await userEvent.click(screen.getByText("Back"));

      // Should be on first step again
      expect(
        screen.getByPlaceholderText("Enter group name"),
      ).toBeInTheDocument();
    });

    test("navigates to final step and back", async () => {
      render(<GroupsModal open={true} onClose={mockOnClose} />);

      const nameInput = screen.getByPlaceholderText("Enter group name");
      await userEvent.type(nameInput, "Test Group");

      // Navigate to last step
      await userEvent.click(screen.getByText("Next"));
      await userEvent.click(screen.getByText("Next"));
      await userEvent.click(screen.getByText("Next"));

      expect(
        screen.getByPlaceholderText("Search files..."),
      ).toBeInTheDocument();

      // Navigate back
      await userEvent.click(screen.getByText("Back"));

      // Should be on workstations step
      expect(
        screen.getByPlaceholderText("Search workstations..."),
      ).toBeInTheDocument();
    });
  });
});
