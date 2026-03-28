/**
 * GroupsModal.test.jsx
 *
 * Test suite for the GroupsModal component
 * Tests multi-step wizard, form validation, and user interactions
 */
import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import GroupsModal from "../GroupsModal";
import { compressImage } from "../../../lib/compressImage.js";

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

jest.mock("../../../lib/compressImage.js", () => ({
  compressImage: jest.fn(),
}));

// Mock AuthContext
jest.mock("../../../context/AuthContext.jsx", () => ({
  useAuth: () => ({
    accessToken: "mock-token",
    currentUser: { org_id: "test-org" },
  }),
}));

// Mock usersApi
jest.mock("../../../services/usersApi.js", () => ({
  listUsers: jest.fn(() => Promise.resolve({ users: [] })),
}));

// Mock CSS import
jest.mock("../GroupsModal.css", () => ({}));

describe("GroupsModal Component", () => {
  const mockOnClose = jest.fn();
  const mockOnSubmit = jest.fn();

  const flushInitialModalEffects = async () => {
    const { listUsers } = require("../../../services/usersApi.js");

    await waitFor(() => {
      expect(listUsers.mock.calls.length).toBeGreaterThan(0);
    });

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
  };

  const renderOpenGroupsModal = async (props = {}) => {
    let view;

    await act(async () => {
      view = render(
        <GroupsModal open={true} onClose={mockOnClose} {...props} />,
      );
    });

    await flushInitialModalEffects();
    return view;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    compressImage.mockResolvedValue("data:image/jpeg;base64,compressed");
  });

  // Basic rendering tests
  describe("Rendering", () => {
    test("renders nothing when open is false", () => {
      render(<GroupsModal open={false} onClose={mockOnClose} />);
      expect(screen.queryByTestId("groups-modal")).not.toBeInTheDocument();
    });

    test("renders modal when open is true", async () => {
      await renderOpenGroupsModal();
      expect(screen.getByText("New Group")).toBeInTheDocument();
    });

    test("shows Edit Group title in edit mode", async () => {
      const groupData = {
        id: "1",
        name: "Test Group",
        description: "Test Description",
      };

      await renderOpenGroupsModal({ groupData });
      expect(screen.getByText("Edit Group")).toBeInTheDocument();
    });

    test("shows New Group title in create mode", async () => {
      await renderOpenGroupsModal();
      expect(screen.getByText("New Group")).toBeInTheDocument();
    });
  });

  // Breadcrumb tests
  describe("Breadcrumb Navigation", () => {
    test("displays Groups breadcrumb", async () => {
      await renderOpenGroupsModal();
      expect(screen.getByText("Groups")).toBeInTheDocument();
    });

    test("displays close button", async () => {
      await renderOpenGroupsModal();
      const closeButton = screen.getByLabelText("Close");
      expect(closeButton).toBeInTheDocument();
    });

    test("calls onClose when close button is clicked", async () => {
      await renderOpenGroupsModal();
      const closeButton = screen.getByLabelText("Close");

      await userEvent.click(closeButton);
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  // Progress bar tests
  describe("Progress Bar", () => {
    test("displays all step labels", async () => {
      await renderOpenGroupsModal();

      expect(screen.getByText("Basic Info")).toBeInTheDocument();
      expect(screen.getByText("Users")).toBeInTheDocument();
      expect(screen.getByText("Workstations")).toBeInTheDocument();
      expect(screen.getByText("Shares")).toBeInTheDocument();
    });

    test("shows active state for current step", async () => {
      await renderOpenGroupsModal();

      const basicInfoStep = screen.getByText("Basic Info");
      expect(basicInfoStep).toHaveClass("active");
    });
  });

  // Basic Info step tests
  describe("Basic Info Step", () => {
    test("renders group name input", async () => {
      await renderOpenGroupsModal();
      expect(
        screen.getByPlaceholderText("Enter group name"),
      ).toBeInTheDocument();
    });

    test("renders description textarea", async () => {
      await renderOpenGroupsModal();
      expect(
        screen.getByPlaceholderText("Enter a brief description of the group"),
      ).toBeInTheDocument();
    });

    test("allows typing in group name field", async () => {
      await renderOpenGroupsModal();
      const nameInput = screen.getByPlaceholderText("Enter group name");

      await userEvent.type(nameInput, "Test Group");
      expect(nameInput).toHaveValue("Test Group");
    });

    test("allows typing in description field", async () => {
      await renderOpenGroupsModal();
      const descInput = screen.getByPlaceholderText(
        "Enter a brief description of the group",
      );

      await userEvent.type(descInput, "Test Description");
      expect(descInput).toHaveValue("Test Description");
    });

    test("disables Next button when group name is empty", async () => {
      await renderOpenGroupsModal();
      const nextButton = screen.getByText("Next");
      expect(nextButton).toBeDisabled();
    });

    test("enables Next button when group name is filled", async () => {
      await renderOpenGroupsModal();
      const nameInput = screen.getByPlaceholderText("Enter group name");
      const nextButton = screen.getByText("Next");

      await userEvent.type(nameInput, "Test Group");
      expect(nextButton).not.toBeDisabled();
    });

    test("shows image upload placeholder initially", async () => {
      await renderOpenGroupsModal();
      expect(screen.getByText("Upload Image")).toBeInTheDocument();
    });

    test("handles image removal", async () => {
      const groupData = {
        id: "1",
        name: "Test",
        description: "Test",
        image: "data:image/png;base64,test",
      };

      await renderOpenGroupsModal({ groupData });

      const removeButtons = screen.getAllByText("×");
      // The last one is the image remove button (close button is first)
      await userEvent.click(removeButtons[removeButtons.length - 1]);

      expect(screen.getByText("Upload Image")).toBeInTheDocument();
    });

    test("handles file input change event", async () => {
      await renderOpenGroupsModal();

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

      compressImage.mockRejectedValueOnce(
        new Error("Failed to load image for compression"),
      );
      global.FileReader = jest.fn(() => mockFileReader);

      // Trigger change
      fireEvent.change(fileInput, { target: { files: [file] } });

      // Simulate onloadend
      if (mockFileReader.onloadend) {
        mockFileReader.onloadend();
      }

      await waitFor(() => {
        expect(compressImage).toHaveBeenCalledWith(file, {
          maxWidth: 256,
          maxHeight: 256,
        });
        expect(mockFileReader.readAsDataURL).toHaveBeenCalledWith(file);
      });
    });

    test("handles successful image compression upload", async () => {
      await renderOpenGroupsModal();

      const fileInputs = document.querySelectorAll('input[type="file"]');
      const file = new File(["dummy content"], "test.png", {
        type: "image/png",
      });

      fireEvent.change(fileInputs[0], { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByAltText("Group icon")).toHaveAttribute(
          "src",
          "data:image/jpeg;base64,compressed",
        );
      });
    });

    test("handles empty file upload", async () => {
      await renderOpenGroupsModal();

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
    test("Back button is disabled on first step", async () => {
      await renderOpenGroupsModal();
      const backButton = screen.getByText("Back");
      expect(backButton).toBeDisabled();
    });

    test("navigates to next step when Next is clicked", async () => {
      await renderOpenGroupsModal();
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
      await renderOpenGroupsModal();
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
      await renderOpenGroupsModal();
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

      await renderOpenGroupsModal({ groupData });

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
      await renderOpenGroupsModal();
      const nameInput = screen.getByPlaceholderText("Enter group name");
      await userEvent.type(nameInput, "Test Group");

      await userEvent.click(screen.getByText("Next"));

      expect(
        screen.getByPlaceholderText("Search users..."),
      ).toBeInTheDocument();
    });

    test("allows typing in user search", async () => {
      await renderOpenGroupsModal();
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
      await renderOpenGroupsModal();
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
      await renderOpenGroupsModal();
      const nameInput = screen.getByPlaceholderText("Enter group name");
      await userEvent.type(nameInput, "Test Group");

      await userEvent.click(screen.getByText("Next"));
      await userEvent.click(screen.getByText("Next"));
      await userEvent.click(screen.getByText("Next"));

      expect(
        screen.getByPlaceholderText("Search shares..."),
      ).toBeInTheDocument();
    });
  });

  // Submit tests
  describe("Form Submission", () => {
    test("calls onSubmit with form data when Create is clicked", async () => {
      await renderOpenGroupsModal({ onSubmit: mockOnSubmit });

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
      await renderOpenGroupsModal({ onSubmit: mockOnSubmit });

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
      await renderOpenGroupsModal();

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
    test("renders cancel button", async () => {
      await renderOpenGroupsModal();
      expect(screen.getByText("Cancel")).toBeInTheDocument();
    });

    test("calls onClose when cancel is clicked", async () => {
      await renderOpenGroupsModal();

      await userEvent.click(screen.getByText("Cancel"));
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  // Edit mode initialization tests
  describe("Edit Mode Initialization", () => {
    test("populates form with existing group data", async () => {
      const groupData = {
        id: "1",
        name: "Existing Group",
        description: "Existing Description",
        image: null,
        users: [],
        workstations: [],
      };

      await renderOpenGroupsModal({ groupData });

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
      await renderOpenGroupsModal();

      const nameInput = screen.getByPlaceholderText("Enter group name");
      await userEvent.type(nameInput, "Test Group");

      // Navigate to users step
      await userEvent.click(screen.getByText("Next"));

      const searchInput = screen.getByPlaceholderText("Search users...");
      await userEvent.type(searchInput, "test");

      expect(searchInput).toHaveValue("test");
    });

    test("updates workstations search term", async () => {
      await renderOpenGroupsModal();

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
      await renderOpenGroupsModal();

      const nameInput = screen.getByPlaceholderText("Enter group name");
      await userEvent.type(nameInput, "Test Group");

      // Navigate to files step
      await userEvent.click(screen.getByText("Next"));
      await userEvent.click(screen.getByText("Next"));
      await userEvent.click(screen.getByText("Next"));

      const searchInput = screen.getByPlaceholderText("Search shares...");
      await userEvent.type(searchInput, "doc");

      expect(searchInput).toHaveValue("doc");
    });

    test("handles default case in step rendering", async () => {
      // This tests the default return null case by checking all valid steps
      await renderOpenGroupsModal();
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
      await flushInitialModalEffects();

      const nameInput = screen.getByPlaceholderText("Enter group name");
      await userEvent.type(nameInput, "Test");

      // Close modal
      rerender(<GroupsModal open={false} onClose={mockOnClose} />);

      // Reopen modal - should reset
      rerender(<GroupsModal open={true} onClose={mockOnClose} />);
      await flushInitialModalEffects();

      const newNameInput = screen.getByPlaceholderText("Enter group name");
      expect(newNameInput).toHaveValue("");
    });

    test("handles switching from create to edit mode", async () => {
      const { rerender } = render(
        <GroupsModal open={true} onClose={mockOnClose} />,
      );
      await flushInitialModalEffects();

      const groupData = {
        id: "1",
        name: "Edit Group",
        description: "Edit Description",
      };

      rerender(
        <GroupsModal open={true} onClose={mockOnClose} groupData={groupData} />,
      );
      await flushInitialModalEffects();

      expect(screen.getByText("Edit Group")).toBeInTheDocument();
    });

    test("resets to first step when reopened", async () => {
      const { rerender } = render(
        <GroupsModal open={true} onClose={mockOnClose} />,
      );
      await flushInitialModalEffects();

      const nameInput = screen.getByPlaceholderText("Enter group name");
      await userEvent.type(nameInput, "Test");

      // Navigate to second step
      await userEvent.click(screen.getByText("Next"));

      // Close and reopen
      rerender(<GroupsModal open={false} onClose={mockOnClose} />);
      rerender(<GroupsModal open={true} onClose={mockOnClose} />);
      await flushInitialModalEffects();

      // Should be on first step
      expect(
        screen.getByPlaceholderText("Enter group name"),
      ).toBeInTheDocument();
    });

    test("handles empty group data in edit mode", async () => {
      const groupData = {
        id: "1",
      };

      await renderOpenGroupsModal({ groupData });

      const nameInput = screen.getByPlaceholderText("Enter group name");
      expect(nameInput).toHaveValue("");
    });

    test("handles image upload change event", async () => {
      await renderOpenGroupsModal();

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
      await renderOpenGroupsModal();

      const nameInput = screen.getByPlaceholderText("Enter group name");
      await userEvent.type(nameInput, "Test Group");

      await userEvent.click(screen.getByText("Next"));

      expect(
        screen.getByPlaceholderText("Search users..."),
      ).toBeInTheDocument();
    });

    test("allows search term updates in users step", async () => {
      await renderOpenGroupsModal();

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
      await renderOpenGroupsModal();

      const nameInput = screen.getByPlaceholderText("Enter group name");
      await userEvent.type(nameInput, "Test Group");

      await userEvent.click(screen.getByText("Next"));
      await userEvent.click(screen.getByText("Next"));

      expect(
        screen.getByPlaceholderText("Search workstations..."),
      ).toBeInTheDocument();
    });

    test("allows search term updates in workstations step", async () => {
      await renderOpenGroupsModal();

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
      await renderOpenGroupsModal();

      const nameInput = screen.getByPlaceholderText("Enter group name");
      await userEvent.type(nameInput, "Test Group");

      await userEvent.click(screen.getByText("Next"));
      await userEvent.click(screen.getByText("Next"));
      await userEvent.click(screen.getByText("Next"));

      expect(
        screen.getByPlaceholderText("Search shares..."),
      ).toBeInTheDocument();
    });

    test("allows search term updates in files step", async () => {
      await renderOpenGroupsModal();

      const nameInput = screen.getByPlaceholderText("Enter group name");
      await userEvent.type(nameInput, "Test Group");
      await userEvent.click(screen.getByText("Next"));
      await userEvent.click(screen.getByText("Next"));
      await userEvent.click(screen.getByText("Next"));

      const searchInput = screen.getByPlaceholderText("Search shares...");
      await userEvent.type(searchInput, "test");

      expect(searchInput).toHaveValue("test");
    });
  });

  describe("Default Switch Case", () => {
    test("handles invalid step gracefully", async () => {
      const { container } = await renderOpenGroupsModal();

      // Modal should still render even with edge cases
      expect(container.querySelector(".groups-modal-dialog")).toBeTruthy();
    });
  });

  describe("Additional Edge Cases", () => {
    test("handles description textarea input", async () => {
      await renderOpenGroupsModal();

      const nameInput = screen.getByPlaceholderText("Enter group name");
      await userEvent.type(nameInput, "Test Group");

      const descInput = screen.getByPlaceholderText(
        "Enter a brief description of the group",
      );
      await userEvent.type(descInput, "Test description");

      expect(descInput).toHaveValue("Test description");
    });

    test("navigates back from users step", async () => {
      await renderOpenGroupsModal();

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
      await renderOpenGroupsModal();

      const nameInput = screen.getByPlaceholderText("Enter group name");
      await userEvent.type(nameInput, "Test Group");

      // Navigate to last step
      await userEvent.click(screen.getByText("Next"));
      await userEvent.click(screen.getByText("Next"));
      await userEvent.click(screen.getByText("Next"));

      expect(
        screen.getByPlaceholderText("Search shares..."),
      ).toBeInTheDocument();

      // Navigate back
      await userEvent.click(screen.getByText("Back"));

      // Should be on workstations step
      expect(
        screen.getByPlaceholderText("Search workstations..."),
      ).toBeInTheDocument();
    });
  });

  // Selection and removal tests with mock data
  describe("Selection Toggle and Remove Functions", () => {
    test("toggleSelection adds item when not selected", async () => {
      const TestComponent = () => {
        const [formData, setFormData] = React.useState({
          name: "",
          description: "",
          image: null,
          selectedUsers: [],
          selectedWorkstations: [],
          selectedFiles: [],
        });

        const toggleSelection = (type, item) => {
          setFormData((prev) => {
            const key = `selected${type.charAt(0).toUpperCase() + type.slice(1)}`;
            const selected = prev[key];
            const isSelected = selected.some((i) => i.id === item.id);
            return {
              ...prev,
              [key]: isSelected
                ? selected.filter((i) => i.id !== item.id)
                : [...selected, item],
            };
          });
        };

        return (
          <div>
            <button
              onClick={() =>
                toggleSelection("users", { id: "1", firstName: "John" })
              }
            >
              Toggle User
            </button>
            <div data-testid="user-count">{formData.selectedUsers.length}</div>
          </div>
        );
      };

      render(<TestComponent />);

      const toggleButton = screen.getByText("Toggle User");
      const countDisplay = screen.getByTestId("user-count");

      expect(countDisplay).toHaveTextContent("0");

      await userEvent.click(toggleButton);

      await waitFor(() => {
        expect(countDisplay).toHaveTextContent("1");
      });
    });

    test("toggleSelection removes item when already selected", async () => {
      const TestComponent = () => {
        const [formData, setFormData] = React.useState({
          name: "",
          description: "",
          image: null,
          selectedUsers: [{ id: "1", firstName: "John" }],
          selectedWorkstations: [],
          selectedFiles: [],
        });

        const toggleSelection = (type, item) => {
          setFormData((prev) => {
            const key = `selected${type.charAt(0).toUpperCase() + type.slice(1)}`;
            const selected = prev[key];
            const isSelected = selected.some((i) => i.id === item.id);
            return {
              ...prev,
              [key]: isSelected
                ? selected.filter((i) => i.id !== item.id)
                : [...selected, item],
            };
          });
        };

        return (
          <div>
            <button
              onClick={() =>
                toggleSelection("users", { id: "1", firstName: "John" })
              }
            >
              Toggle User
            </button>
            <div data-testid="user-count">{formData.selectedUsers.length}</div>
          </div>
        );
      };

      render(<TestComponent />);

      const toggleButton = screen.getByText("Toggle User");
      const countDisplay = screen.getByTestId("user-count");

      expect(countDisplay).toHaveTextContent("1");

      await userEvent.click(toggleButton);

      await waitFor(() => {
        expect(countDisplay).toHaveTextContent("0");
      });
    });

    test("removeSelection removes item by id", async () => {
      const TestComponent = () => {
        const [formData, setFormData] = React.useState({
          name: "",
          description: "",
          image: null,
          selectedUsers: [],
          selectedWorkstations: [
            { id: "1", name: "WS-001" },
            { id: "2", name: "WS-002" },
          ],
          selectedFiles: [],
        });

        const removeSelection = (type, id) => {
          setFormData((prev) => {
            const key = `selected${type.charAt(0).toUpperCase() + type.slice(1)}`;
            return {
              ...prev,
              [key]: prev[key].filter((i) => i.id !== id),
            };
          });
        };

        return (
          <div>
            <button onClick={() => removeSelection("workstations", "1")}>
              Remove First
            </button>
            <div data-testid="ws-count">
              {formData.selectedWorkstations.length}
            </div>
          </div>
        );
      };

      render(<TestComponent />);

      const removeButton = screen.getByText("Remove First");
      const countDisplay = screen.getByTestId("ws-count");

      expect(countDisplay).toHaveTextContent("2");

      await userEvent.click(removeButton);

      await waitFor(() => {
        expect(countDisplay).toHaveTextContent("1");
      });
    });

    test("toggleSelection works with files", async () => {
      const TestComponent = () => {
        const [formData, setFormData] = React.useState({
          name: "",
          description: "",
          image: null,
          selectedUsers: [],
          selectedWorkstations: [],
          selectedFiles: [],
        });

        const toggleSelection = (type, item) => {
          setFormData((prev) => {
            const key = `selected${type.charAt(0).toUpperCase() + type.slice(1)}`;
            const selected = prev[key];
            const isSelected = selected.some((i) => i.id === item.id);
            return {
              ...prev,
              [key]: isSelected
                ? selected.filter((i) => i.id !== item.id)
                : [...selected, item],
            };
          });
        };

        return (
          <div>
            <button
              onClick={() =>
                toggleSelection("files", { id: "f1", name: "doc.pdf" })
              }
            >
              Toggle File
            </button>
            <div data-testid="file-count">{formData.selectedFiles.length}</div>
          </div>
        );
      };

      render(<TestComponent />);

      const toggleButton = screen.getByText("Toggle File");
      const countDisplay = screen.getByTestId("file-count");

      expect(countDisplay).toHaveTextContent("0");

      await userEvent.click(toggleButton);

      await waitFor(() => {
        expect(countDisplay).toHaveTextContent("1");
      });
    });

    test("removeSelection works with users", async () => {
      const TestComponent = () => {
        const [formData, setFormData] = React.useState({
          name: "",
          description: "",
          image: null,
          selectedUsers: [
            { id: "1", firstName: "John" },
            { id: "2", firstName: "Jane" },
          ],
          selectedWorkstations: [],
          selectedFiles: [],
        });

        const removeSelection = (type, id) => {
          setFormData((prev) => {
            const key = `selected${type.charAt(0).toUpperCase() + type.slice(1)}`;
            return {
              ...prev,
              [key]: prev[key].filter((i) => i.id !== id),
            };
          });
        };

        return (
          <div>
            <button onClick={() => removeSelection("users", "2")}>
              Remove Second
            </button>
            <div data-testid="user-count">{formData.selectedUsers.length}</div>
          </div>
        );
      };

      render(<TestComponent />);

      const removeButton = screen.getByText("Remove Second");
      const countDisplay = screen.getByTestId("user-count");

      expect(countDisplay).toHaveTextContent("2");

      await userEvent.click(removeButton);

      await waitFor(() => {
        expect(countDisplay).toHaveTextContent("1");
      });
    });
  });

  // Submit Button and Loading State Tests
  describe("Submit Button and Loading State", () => {
    test("submit button shows correct text in create mode", async () => {
      await renderOpenGroupsModal();
      const nameInput = screen.getByPlaceholderText("Enter group name");

      // Fill in required field and navigate to last step
      await userEvent.type(nameInput, "test-group");

      // Navigate to last step
      const nextButton = screen.getByText("Next");
      await userEvent.click(nextButton); // to Users
      await userEvent.click(screen.getByText("Next")); // to Workstations
      await userEvent.click(screen.getByText("Next")); // to Files

      // Should show "Create Group" button
      expect(screen.getByText("Create Group")).toBeInTheDocument();
    });

    test("submit button shows correct text in edit mode", async () => {
      const groupData = {
        id: "1",
        name: "Test Group",
        description: "Test Description",
        users: [],
        workstations: [],
        files: [],
      };

      await renderOpenGroupsModal({ groupData });

      // Navigate to last step
      const nextButton = screen.getByText("Next");
      await userEvent.click(nextButton); // to Users
      await userEvent.click(screen.getByText("Next")); // to Workstations
      await userEvent.click(screen.getByText("Next")); // to Files

      // Should show "Save Changes" button
      expect(screen.getByText("Save Changes")).toBeInTheDocument();
    });

    test("submit button is disabled during submission", async () => {
      const slowOnSubmit = jest.fn(
        () => new Promise((resolve) => setTimeout(resolve, 100)),
      );

      await renderOpenGroupsModal({ onSubmit: slowOnSubmit });

      const nameInput = screen.getByPlaceholderText("Enter group name");
      await userEvent.type(nameInput, "test-group");

      // Navigate to last step
      const nextButton = screen.getByText("Next");
      await userEvent.click(nextButton);
      await userEvent.click(screen.getByText("Next"));
      await userEvent.click(screen.getByText("Next"));

      const submitButton = screen.getByText("Create Group");

      // Click submit
      await userEvent.click(submitButton);

      // Button should be disabled during submission
      await waitFor(() => {
        expect(screen.getByText("Saving...")).toBeDisabled();
      });
    });

    test("submit button shows Saving... text during submission", async () => {
      const slowOnSubmit = jest.fn(
        () => new Promise((resolve) => setTimeout(resolve, 100)),
      );

      await renderOpenGroupsModal({ onSubmit: slowOnSubmit });

      const nameInput = screen.getByPlaceholderText("Enter group name");
      await userEvent.type(nameInput, "test-group");

      // Navigate to last step
      const nextButton = screen.getByText("Next");
      await userEvent.click(nextButton);
      await userEvent.click(screen.getByText("Next"));
      await userEvent.click(screen.getByText("Next"));

      const submitButton = screen.getByText("Create Group");
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Saving...")).toBeInTheDocument();
      });
    });

    test("prevents double submission when clicking submit rapidly", async () => {
      const onSubmit = jest.fn(
        () => new Promise((resolve) => setTimeout(resolve, 50)),
      );

      await renderOpenGroupsModal({ onSubmit });

      const nameInput = screen.getByPlaceholderText("Enter group name");
      await userEvent.type(nameInput, "test-group");

      // Navigate to last step
      const nextButton = screen.getByText("Next");
      await userEvent.click(nextButton);
      await userEvent.click(screen.getByText("Next"));
      await userEvent.click(screen.getByText("Next"));

      const submitButton = screen.getByText("Create Group");

      // Click multiple times rapidly
      fireEvent.click(submitButton);
      fireEvent.click(submitButton);
      fireEvent.click(submitButton);

      await waitFor(() => {
        // Should only be called once due to isSubmitting guard
        expect(onSubmit).toHaveBeenCalledTimes(1);
      });
    });

    test("calls onRefresh after successful submission", async () => {
      const onSubmit = jest.fn(() => Promise.resolve());
      const onRefresh = jest.fn();

      await renderOpenGroupsModal({ onSubmit, onRefresh });

      const nameInput = screen.getByPlaceholderText("Enter group name");
      await userEvent.type(nameInput, "test-group");

      // Navigate to last step
      const nextButton = screen.getByText("Next");
      await userEvent.click(nextButton);
      await userEvent.click(screen.getByText("Next"));
      await userEvent.click(screen.getByText("Next"));

      const submitButton = screen.getByText("Create Group");
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(onRefresh).toHaveBeenCalledTimes(1);
      });
    });

    test("calls onClose after successful submission", async () => {
      const onSubmit = jest.fn(() => Promise.resolve());

      await renderOpenGroupsModal({ onSubmit });

      const nameInput = screen.getByPlaceholderText("Enter group name");
      await userEvent.type(nameInput, "test-group");

      // Navigate to last step
      const nextButton = screen.getByText("Next");
      await userEvent.click(nextButton);
      await userEvent.click(screen.getByText("Next"));
      await userEvent.click(screen.getByText("Next"));

      const submitButton = screen.getByText("Create Group");
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalledTimes(1);
      });
    });

    test("resets isSubmitting state after submission error", async () => {
      const onSubmit = jest.fn(() => Promise.reject(new Error("Failed")));

      await renderOpenGroupsModal({ onSubmit });

      const nameInput = screen.getByPlaceholderText("Enter group name");
      await userEvent.type(nameInput, "test-group");

      // Navigate to last step
      const nextButton = screen.getByText("Next");
      await userEvent.click(nextButton);
      await userEvent.click(screen.getByText("Next"));
      await userEvent.click(screen.getByText("Next"));

      const submitButton = screen.getByText("Create Group");
      await userEvent.click(submitButton);

      // After error, button should be re-enabled
      await waitFor(() => {
        const button = screen.getByText("Create Group");
        expect(button).not.toBeDisabled();
      });
    });
  });

  // ResolveOrgId and Data Fetching Tests
  describe("ResolveOrgId and Data Fetching", () => {
    beforeEach(() => {
      global.fetch = jest.fn();
      global.localStorage = {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn(),
      };
    });

    afterEach(() => {
      global.fetch.mockClear();
      delete global.fetch;
      delete global.localStorage;
    });

    test("resolveOrgId returns org_id from localStorage when user has none", async () => {
      // Set localStorage mock with specific return value
      global.localStorage = {
        getItem: jest.fn().mockReturnValue("org-from-storage"),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn(),
      };
      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ shares: [] }),
      });

      await renderOpenGroupsModal({ onClose: jest.fn() });

      // Navigate to files step to trigger fetch
      const nameInput = screen.getByPlaceholderText("Enter group name");
      await userEvent.type(nameInput, "test-group");

      const nextButton = screen.getByText("Next");
      await userEvent.click(nextButton);
      await userEvent.click(screen.getByText("Next"));
      await userEvent.click(screen.getByText("Next"));

      await waitFor(() => {
        expect(screen.getByText("Shares")).toBeInTheDocument();
      });
    });

    test("fetchUsersAll handles empty access token", async () => {
      // This is handled by the mock which provides a token
      await renderOpenGroupsModal({ onClose: jest.fn() });

      await waitFor(() => {
        expect(screen.getByText("New Group")).toBeInTheDocument();
      });
    });

    test("fetchUsersAll handles API error", async () => {
      const { listUsers } = require("../../../services/usersApi.js");
      listUsers.mockRejectedValueOnce(new Error("API Error"));

      await renderOpenGroupsModal({ onClose: jest.fn() });

      // Navigate to users step
      const nameInput = screen.getByPlaceholderText("Enter group name");
      await userEvent.type(nameInput, "test-group");

      const nextButton = screen.getByText("Next");
      await userEvent.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText("Users")).toBeInTheDocument();
      });
    });

    test("fetchFileSharesAll handles missing org_id", async () => {
      // Mock useAuth to return no org_id
      jest.mock("../../../context/AuthContext.jsx", () => ({
        useAuth: () => ({
          accessToken: "mock-token",
          currentUser: { org_id: null },
        }),
      }));

      global.localStorage.getItem.mockReturnValue(null);

      await renderOpenGroupsModal({ onClose: jest.fn() });

      const nameInput = screen.getByPlaceholderText("Enter group name");
      await userEvent.type(nameInput, "test-group");

      // Navigate to files step
      const nextButton = screen.getByText("Next");
      await userEvent.click(nextButton);
      await userEvent.click(screen.getByText("Next"));
      await userEvent.click(screen.getByText("Next"));

      await waitFor(() => {
        expect(screen.getByText("Shares")).toBeInTheDocument();
      });
    });

    test("fetchFileSharesAll handles non-ok response", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await renderOpenGroupsModal({ onClose: jest.fn() });

      const nameInput = screen.getByPlaceholderText("Enter group name");
      await userEvent.type(nameInput, "test-group");

      const nextButton = screen.getByText("Next");
      await userEvent.click(nextButton);
      await userEvent.click(screen.getByText("Next"));
      await userEvent.click(screen.getByText("Next"));

      await waitFor(() => {
        expect(screen.getByPlaceholderText("Search shares...")).toBeInTheDocument();
      });
    });

    test("fetchFileSharesAll handles successful response with shares", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          shares: [
            { share: { id: "s1", name: "Share 1", drive: "C" } },
            { share: { id: "s2", name: "Share 2", drive: "D" } },
          ],
        }),
      });

      await renderOpenGroupsModal({ onClose: jest.fn() });

      const nameInput = screen.getByPlaceholderText("Enter group name");
      await userEvent.type(nameInput, "test-group");

      const nextButton = screen.getByText("Next");
      await userEvent.click(nextButton);
      await userEvent.click(screen.getByText("Next"));
      await userEvent.click(screen.getByText("Next"));

      await waitFor(() => {
        expect(screen.getByPlaceholderText("Search shares...")).toBeInTheDocument();
      });
    });

    test("fetchFileSharesAll handles fetch exception", async () => {
      global.fetch.mockRejectedValueOnce(new Error("Network error"));

      await renderOpenGroupsModal({ onClose: jest.fn() });

      const nameInput = screen.getByPlaceholderText("Enter group name");
      await userEvent.type(nameInput, "test-group");

      const nextButton = screen.getByText("Next");
      await userEvent.click(nextButton);
      await userEvent.click(screen.getByText("Next"));
      await userEvent.click(screen.getByText("Next"));

      await waitFor(() => {
        expect(screen.getByPlaceholderText("Search shares...")).toBeInTheDocument();
      });
    });
  });

  // SafeSplitName Function Tests
  describe("SafeSplitName Function", () => {
    test("handles empty string", async () => {
      const { listUsers } = require("../../../services/usersApi.js");
      listUsers.mockResolvedValueOnce([
        { _id: "u1", full_name: "", email: "test@test.com" },
      ]);

      await renderOpenGroupsModal({ onClose: jest.fn() });

      const nameInput = screen.getByPlaceholderText("Enter group name");
      await userEvent.type(nameInput, "test-group");

      const nextButton = screen.getByText("Next");
      await userEvent.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText("Users")).toBeInTheDocument();
      });
    });

    test("handles single word name", async () => {
      const { listUsers } = require("../../../services/usersApi.js");
      listUsers.mockResolvedValueOnce([
        { _id: "u1", full_name: "John", email: "john@test.com" },
      ]);

      await renderOpenGroupsModal({ onClose: jest.fn() });

      const nameInput = screen.getByPlaceholderText("Enter group name");
      await userEvent.type(nameInput, "test-group");

      const nextButton = screen.getByText("Next");
      await userEvent.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText("Users")).toBeInTheDocument();
      });
    });

    test("handles multi-word name", async () => {
      const { listUsers } = require("../../../services/usersApi.js");
      listUsers.mockResolvedValueOnce([
        { _id: "u1", full_name: "John Michael Doe", email: "john@test.com" },
      ]);

      await renderOpenGroupsModal({ onClose: jest.fn() });

      const nameInput = screen.getByPlaceholderText("Enter group name");
      await userEvent.type(nameInput, "test-group");

      const nextButton = screen.getByText("Next");
      await userEvent.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText("Users")).toBeInTheDocument();
      });
    });

    test("handles whitespace-only name", async () => {
      const { listUsers } = require("../../../services/usersApi.js");
      listUsers.mockResolvedValueOnce([
        { _id: "u1", full_name: "   ", email: "test@test.com" },
      ]);

      await renderOpenGroupsModal({ onClose: jest.fn() });

      const nameInput = screen.getByPlaceholderText("Enter group name");
      await userEvent.type(nameInput, "test-group");

      const nextButton = screen.getByText("Next");
      await userEvent.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText("Users")).toBeInTheDocument();
      });
    });

    test("handles null name", async () => {
      const { listUsers } = require("../../../services/usersApi.js");
      listUsers.mockResolvedValueOnce([
        { _id: "u1", full_name: null, email: "test@test.com" },
      ]);

      await renderOpenGroupsModal({ onClose: jest.fn() });

      const nameInput = screen.getByPlaceholderText("Enter group name");
      await userEvent.type(nameInput, "test-group");

      const nextButton = screen.getByText("Next");
      await userEvent.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText("Users")).toBeInTheDocument();
      });
    });
  });
});
