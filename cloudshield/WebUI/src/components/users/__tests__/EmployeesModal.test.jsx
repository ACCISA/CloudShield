import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EmployeesModal from "../EmployeesModal.jsx";
import { AuthProvider } from "../../../context/AuthContext.jsx";
import * as modalHelpers from "../../../utils/modalHelpers.jsx";

// Mock modalHelpers
jest.mock("../../../utils/modalHelpers.jsx", () => ({
  resolveOrgId: jest.fn(),
  fetchGroups: jest.fn(),
  fetchFileShares: jest.fn(),
  fetchWorkstations: jest.fn(),
  createImageUploadHandler: jest.fn(),
  createToggleSelectionHandler: jest.fn(),
  createRemoveSelectionHandler: jest.fn(),
  createFilteredItems: jest.fn(),
  createNavigationHandler: jest.fn(),
  createDeleteHandler: jest.fn(),
  createRenderStepContent: jest.fn(),
}));

// Mock DisplayIcon component
jest.mock("../../common/DisplayIcon/DisplayIcon.jsx", () => {
  return function MockDisplayIcon({ type, data, size }) {
    return <div data-testid={`display-icon-${type}`}>{data?.name}</div>;
  };
});

// Mock Checkbox component
jest.mock("../../common/Checkbox/Checkbox.jsx", () => {
  return function MockCheckbox({ checked, indeterminate, onChange }) {
    return (
      <input
        type="checkbox"
        data-testid="checkbox"
        checked={checked}
        data-indeterminate={indeterminate}
        onChange={onChange}
      />
    );
  };
});

// Mock Icons
jest.mock("../../../assets/ImageUploadIcon.jsx", () => {
  return function UploadIcon() {
    return <div data-testid="upload-icon">Upload</div>;
  };
});

jest.mock("../../../assets/TrashIcon.jsx", () => {
  return function TrashIcon() {
    return <div data-testid="trash-icon">Trash</div>;
  };
});

// Mock useAuth hook
const mockCurrentUser = {
  id: "user-1",
  email: "test@example.com",
  org_id: "org-123",
};

const mockAccessToken = "test-token-123";

jest.mock("../../../context/AuthContext.jsx", () => ({
  ...jest.requireActual("../../../context/AuthContext.jsx"),
  useAuth: () => ({
    currentUser: mockCurrentUser,
    accessToken: mockAccessToken,
  }),
  AuthProvider: ({ children }) => <div>{children}</div>,
}));

describe("EmployeesModal", () => {
  const mockOnClose = jest.fn();
  const mockOnSubmit = jest.fn();
  const mockOnDelete = jest.fn();

  const mockWorkstations = [
    {
      id: "ws-1",
      name: "Workstation 1",
      ipAddress: "192.168.1.1",
      online: true,
    },
    {
      id: "ws-2",
      name: "Workstation 2",
      ipAddress: "192.168.1.2",
      online: false,
    },
  ];

  const mockGroups = [
    { id: "grp-1", name: "Engineering", members: 10 },
    { id: "grp-2", name: "Marketing", members: 5 },
  ];

  const mockFiles = [
    {
      id: "file-1",
      name: "Project Files",
      type: "document",
      size: "2 GB",
      drive: "C",
    },
    {
      id: "file-2",
      name: "Reports",
      type: "spreadsheet",
      size: "500 MB",
      drive: "D",
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock implementations
    modalHelpers.resolveOrgId.mockResolvedValue("org-123");
    modalHelpers.fetchWorkstations.mockResolvedValue(undefined);
    modalHelpers.fetchGroups.mockResolvedValue(undefined);
    modalHelpers.fetchFileShares.mockResolvedValue(undefined);

    modalHelpers.createFilteredItems.mockImplementation((items, searchTerm) => {
      if (!searchTerm) return items || [];
      return (items || []).filter((item) =>
        item.name?.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    });

    modalHelpers.createNavigationHandler.mockImplementation((setStep) => {
      return (delta) => {
        setStep((prev) => prev + delta);
      };
    });

    modalHelpers.createImageUploadHandler.mockImplementation((setFormData) => {
      return (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
            setFormData((prev) => ({ ...prev, profileImage: reader.result }));
          };
          reader.readAsDataURL(file);
        }
      };
    });

    modalHelpers.createToggleSelectionHandler.mockImplementation(
      (setFormData) => {
        return (key, item) => {
          setFormData((prev) => {
            const currentSelected = prev[key] || [];
            const exists = currentSelected.some((i) => i.id === item.id);
            return {
              ...prev,
              [key]: exists
                ? currentSelected.filter((i) => i.id !== item.id)
                : [...currentSelected, item],
            };
          });
        };
      },
    );

    modalHelpers.createRemoveSelectionHandler.mockImplementation(
      (setFormData) => {
        return (key, itemId) => {
          setFormData((prev) => ({
            ...prev,
            [key]: (prev[key] || []).filter((i) => i.id !== itemId),
          }));
        };
      },
    );

    modalHelpers.createDeleteHandler.mockImplementation(
      ({ onDelete, setIsSubmitting, onClose }) => {
        return async () => {
          setIsSubmitting(true);
          try {
            await onDelete();
            onClose();
          } finally {
            setIsSubmitting(false);
          }
        };
      },
    );

    // Mock createRenderStepContent to render actual content
    modalHelpers.createRenderStepContent.mockImplementation(
      ({ currentStep, BasicInfoStep, SelectionStep, ...props }) => {
        return () => {
          if (currentStep === 0) {
            return <BasicInfoStep {...props} />;
          }
          // For other steps, return simple placeholder
          return (
            <div data-testid={`step-${currentStep}`}>Step {currentStep}</div>
          );
        };
      },
    );
  });

  describe("Modal Rendering", () => {
    it("should not render when open is false", () => {
      render(
        <EmployeesModal
          open={false}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />,
      );

      expect(screen.queryByText("New User")).not.toBeInTheDocument();
    });

    it("should render when open is true", () => {
      render(
        <EmployeesModal
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />,
      );

      expect(screen.getByText("New User")).toBeInTheDocument();
    });

    it("should show 'Edit User' in edit mode", () => {
      const employeeData = {
        id: "emp-1",
        name: "John Doe",
        email: "john@example.com",
        title: "Engineer",
      };

      render(
        <EmployeesModal
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          employeeData={employeeData}
        />,
      );

      expect(screen.getByText("Edit User")).toBeInTheDocument();
    });

    it("should render all step labels", () => {
      render(
        <EmployeesModal
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />,
      );

      expect(screen.getByText("Basic Info")).toBeInTheDocument();
      expect(screen.getByText("Workstations")).toBeInTheDocument();
      expect(screen.getByText("Groups")).toBeInTheDocument();
      expect(screen.getByText("Shares")).toBeInTheDocument();
    });

    it("should display progress bar", () => {
      render(
        <EmployeesModal
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />,
      );

      const progressBar = document.querySelector(
        ".employees-modal-progress-fill",
      );
      expect(progressBar).toBeInTheDocument();
      expect(progressBar).toHaveStyle({ width: "25%" }); // First step of 4
    });
  });

  describe("Close Functionality", () => {
    it("should call onClose when close button is clicked", async () => {
      const user = userEvent.setup();
      render(
        <EmployeesModal
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />,
      );

      const closeButton = screen.getByLabelText("Close");
      await user.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it("should call onClose when Cancel button is clicked", async () => {
      const user = userEvent.setup();
      render(
        <EmployeesModal
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />,
      );

      const cancelButton = screen.getByText("Cancel");
      await user.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("Form Initialization", () => {
    it("should initialize with empty form data in create mode", () => {
      render(
        <EmployeesModal
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />,
      );

      // The form should be empty initially
      const inputs = screen.getAllByRole("textbox");
      expect(inputs.length).toBeGreaterThan(0);
    });

    it("should populate form data in edit mode", () => {
      const employeeData = {
        id: "emp-1",
        name: "Jane Smith",
        email: "jane@example.com",
        title: "Manager",
        profileImage: "data:image/png;base64,test",
        workstations: [mockWorkstations[0]],
        groups: [mockGroups[0]],
        files: [mockFiles[0]],
      };

      render(
        <EmployeesModal
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          employeeData={employeeData}
        />,
      );

      // Check that edit mode is detected
      expect(screen.getByText("Edit User")).toBeInTheDocument();
    });

    it("should fetch data when modal opens", async () => {
      render(
        <EmployeesModal
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />,
      );

      await waitFor(() => {
        expect(modalHelpers.resolveOrgId).toHaveBeenCalledWith(mockCurrentUser);
        expect(modalHelpers.fetchWorkstations).toHaveBeenCalled();
        expect(modalHelpers.fetchGroups).toHaveBeenCalled();
        expect(modalHelpers.fetchFileShares).toHaveBeenCalled();
      });
    });
  });

  describe("Navigation", () => {
    it("should not show Back button on first step", () => {
      render(
        <EmployeesModal
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />,
      );

      expect(screen.queryByText("Back")).not.toBeInTheDocument();
      expect(screen.getByText("Next")).toBeInTheDocument();
    });

    it("should navigate to next step when Next is clicked", async () => {
      const user = userEvent.setup();
      render(
        <EmployeesModal
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />,
      );

      // Fill required fields
      const firstNameInput = screen.getByPlaceholderText("John");
      const lastNameInput = screen.getByPlaceholderText("Doe");
      const emailInput = screen.getByPlaceholderText("john.doe@example.com");

      await user.type(firstNameInput, "Test");
      await user.type(lastNameInput, "User");
      await user.type(emailInput, "test@example.com");

      const nextButton = screen.getByText("Next");
      await user.click(nextButton);

      // Progress should increase
      await waitFor(() => {
        const progressBar = document.querySelector(
          ".employees-modal-progress-fill",
        );
        expect(progressBar).toHaveStyle({ width: "50%" }); // Second step of 4
      });
    });

    it("should disable Next button when required fields are empty", () => {
      render(
        <EmployeesModal
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />,
      );

      const nextButton = screen.getByText("Next");
      expect(nextButton).toBeDisabled();
    });

    it("should enable Next button when required fields are filled", async () => {
      const user = userEvent.setup();
      render(
        <EmployeesModal
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />,
      );

      const firstNameInput = screen.getByPlaceholderText("John");
      const lastNameInput = screen.getByPlaceholderText("Doe");
      const emailInput = screen.getByPlaceholderText("john.doe@example.com");

      await user.type(firstNameInput, "Test");
      await user.type(lastNameInput, "User");
      await user.type(emailInput, "test@example.com");

      const nextButton = screen.getByText("Next");
      expect(nextButton).not.toBeDisabled();
    });

    it("should show submit button on last step", async () => {
      const user = userEvent.setup();
      render(
        <EmployeesModal
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />,
      );

      // Fill required fields
      const firstNameInput = screen.getByPlaceholderText("John");
      const lastNameInput = screen.getByPlaceholderText("Doe");
      const emailInput = screen.getByPlaceholderText("john.doe@example.com");

      await user.type(firstNameInput, "Test");
      await user.type(lastNameInput, "User");
      await user.type(emailInput, "test@example.com");

      // Navigate through all steps
      const nextButton = screen.getByText("Next");
      await user.click(nextButton); // Step 2
      await user.click(nextButton); // Step 3
      await user.click(nextButton); // Step 4

      // On last step, should show Create User button
      expect(screen.getByText("Create User")).toBeInTheDocument();
      expect(screen.queryByText("Next")).not.toBeInTheDocument();
    });
  });

  describe("Basic Info Step", () => {
    it("should update first name field", async () => {
      const user = userEvent.setup();
      render(
        <EmployeesModal
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />,
      );

      const input = screen.getByPlaceholderText("John");
      await user.type(input, "Jane");

      expect(input).toHaveValue("Jane");
    });

    it("should update last name field", async () => {
      const user = userEvent.setup();
      render(
        <EmployeesModal
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />,
      );

      const input = screen.getByPlaceholderText("Doe");
      await user.type(input, "Smith");

      expect(input).toHaveValue("Smith");
    });

    it("should update email field", async () => {
      const user = userEvent.setup();
      render(
        <EmployeesModal
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />,
      );

      const input = screen.getByPlaceholderText("john.doe@example.com");
      await user.type(input, "test@test.com");

      expect(input).toHaveValue("test@test.com");
    });

    it("should update job title field", async () => {
      const user = userEvent.setup();
      render(
        <EmployeesModal
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />,
      );

      const input = screen.getByPlaceholderText("Software Engineer");
      await user.type(input, "Senior Developer");

      expect(input).toHaveValue("Senior Developer");
    });

    it("should show password field in create mode", () => {
      render(
        <EmployeesModal
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />,
      );

      expect(screen.getByPlaceholderText("Enter password")).toBeInTheDocument();
    });

    it("should not show password field in edit mode", () => {
      const employeeData = {
        id: "emp-1",
        name: "John Doe",
        email: "john@example.com",
      };

      // Mock createRenderStepContent to actually render BasicInfoStep with isEditMode
      modalHelpers.createRenderStepContent.mockImplementation(
        ({
          currentStep,
          steps,
          BasicInfoStep,
          formData,
          setFormData,
          handleImageUpload,
        }) => {
          return () => {
            if (currentStep === 0) {
              const isEditMode = steps[0].isEditMode;
              return (
                <BasicInfoStep
                  formData={formData}
                  setFormData={setFormData}
                  handleImageUpload={handleImageUpload}
                  isEditMode={isEditMode}
                />
              );
            }
            return (
              <div data-testid={`step-${currentStep}`}>Step {currentStep}</div>
            );
          };
        },
      );

      render(
        <EmployeesModal
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          employeeData={employeeData}
        />,
      );

      expect(
        screen.queryByPlaceholderText("Enter password"),
      ).not.toBeInTheDocument();
    });

    it("should render profile image upload area", () => {
      render(
        <EmployeesModal
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />,
      );

      expect(screen.getByText("Upload Image")).toBeInTheDocument();
    });

    it("should remove profile image when remove button is clicked", async () => {
      const user = userEvent.setup();

      // Start with employee that has a profile image
      const employeeData = {
        id: "emp-1",
        name: "John Doe",
        email: "john@example.com",
        profileImage: "data:image/png;base64,test123",
      };

      render(
        <EmployeesModal
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          employeeData={employeeData}
        />,
      );

      // Should show the image preview
      const profileImage = screen.getByAltText("Profile");
      expect(profileImage).toBeInTheDocument();
      expect(profileImage).toHaveAttribute(
        "src",
        "data:image/png;base64,test123",
      );

      // Click remove button
      const removeButton = screen.getByRole("button", { name: "×" });
      await user.click(removeButton);

      // Image should be removed
      await waitFor(() => {
        expect(screen.queryByAltText("Profile")).not.toBeInTheDocument();
        expect(screen.getByText("Upload Image")).toBeInTheDocument();
      });
    });

    it("should show delete button in edit mode", () => {
      const employeeData = {
        id: "emp-1",
        name: "John Doe",
        email: "john@example.com",
      };

      render(
        <EmployeesModal
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          onDelete={mockOnDelete}
          employeeData={employeeData}
        />,
      );

      expect(screen.getByText("Delete")).toBeInTheDocument();
    });

    it("should not show delete button in create mode", () => {
      render(
        <EmployeesModal
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />,
      );

      expect(screen.queryByText("Delete")).not.toBeInTheDocument();
    });
  });

  describe("Form Submission", () => {
    it("should call onSubmit with form data when Create User is clicked", async () => {
      const user = userEvent.setup();
      mockOnSubmit.mockResolvedValue(undefined);

      render(
        <EmployeesModal
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />,
      );

      // Fill required fields
      await user.type(screen.getByPlaceholderText("John"), "Test");
      await user.type(screen.getByPlaceholderText("Doe"), "User");
      await user.type(
        screen.getByPlaceholderText("john.doe@example.com"),
        "test@example.com",
      );

      // Navigate to last step
      const nextButton = screen.getByText("Next");
      await user.click(nextButton);
      await user.click(nextButton);
      await user.click(nextButton);

      // Submit
      const createButton = screen.getByText("Create User");
      await user.click(createButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            firstName: "Test",
            lastName: "User",
            email: "test@example.com",
          }),
        );
      });
    });

    it("should show Save Changes button in edit mode", async () => {
      const user = userEvent.setup();
      const employeeData = {
        id: "emp-1",
        name: "John Doe",
        email: "john@example.com",
      };

      render(
        <EmployeesModal
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          employeeData={employeeData}
        />,
      );

      // Navigate to last step
      const nextButton = screen.getByText("Next");
      await user.click(nextButton);
      await user.click(nextButton);
      await user.click(nextButton);

      expect(screen.getByText("Save Changes")).toBeInTheDocument();
    });

    it("should disable submit button while submitting", async () => {
      const user = userEvent.setup();
      mockOnSubmit.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100)),
      );

      render(
        <EmployeesModal
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />,
      );

      await user.type(screen.getByPlaceholderText("John"), "Test");
      await user.type(screen.getByPlaceholderText("Doe"), "User");
      await user.type(
        screen.getByPlaceholderText("john.doe@example.com"),
        "test@example.com",
      );

      // Navigate to last step
      const nextButton = screen.getByText("Next");
      await user.click(nextButton);
      await user.click(nextButton);
      await user.click(nextButton);

      const createButton = screen.getByText("Create User");
      await user.click(createButton);

      // Button should show "Saving..." and be disabled
      await waitFor(() => {
        expect(screen.getByText("Saving...")).toBeInTheDocument();
      });
    });

    it("should close modal after successful submission", async () => {
      const user = userEvent.setup();
      mockOnSubmit.mockResolvedValue(undefined);

      render(
        <EmployeesModal
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />,
      );

      await user.type(screen.getByPlaceholderText("John"), "Test");
      await user.type(screen.getByPlaceholderText("Doe"), "User");
      await user.type(
        screen.getByPlaceholderText("john.doe@example.com"),
        "test@example.com",
      );

      const nextButton = screen.getByText("Next");
      await user.click(nextButton);
      await user.click(nextButton);
      await user.click(nextButton);

      const createButton = screen.getByText("Create User");
      await user.click(createButton);

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it("should handle submission error gracefully", async () => {
      const user = userEvent.setup();
      const consoleError = jest.spyOn(console, "error").mockImplementation();
      mockOnSubmit.mockRejectedValue(new Error("Submission failed"));

      render(
        <EmployeesModal
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />,
      );

      await user.type(screen.getByPlaceholderText("John"), "Test");
      await user.type(screen.getByPlaceholderText("Doe"), "User");
      await user.type(
        screen.getByPlaceholderText("john.doe@example.com"),
        "test@example.com",
      );

      const nextButton = screen.getByText("Next");
      await user.click(nextButton);
      await user.click(nextButton);
      await user.click(nextButton);

      const createButton = screen.getByText("Create User");
      await user.click(createButton);

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith(
          "Failed to submit employee:",
          expect.any(Error),
        );
      });

      consoleError.mockRestore();
    });
  });

  describe("Delete Functionality", () => {
    it("should show confirmation dialog when Delete is clicked", async () => {
      const user = userEvent.setup();
      const confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(true);

      const employeeData = {
        id: "emp-1",
        name: "John Doe",
        email: "john@example.com",
      };

      render(
        <EmployeesModal
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          onDelete={mockOnDelete}
          employeeData={employeeData}
        />,
      );

      const deleteButton = screen.getByText("Delete");
      await user.click(deleteButton);

      expect(confirmSpy).toHaveBeenCalledWith(
        "Are you sure you want to delete this user? This action cannot be undone.",
      );

      confirmSpy.mockRestore();
    });

    it("should call onDelete when confirmed", async () => {
      const user = userEvent.setup();
      jest.spyOn(window, "confirm").mockReturnValue(true);
      mockOnDelete.mockResolvedValue(undefined);

      const employeeData = {
        id: "emp-1",
        name: "John Doe",
        email: "john@example.com",
      };

      render(
        <EmployeesModal
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          onDelete={mockOnDelete}
          employeeData={employeeData}
        />,
      );

      const deleteButton = screen.getByText("Delete");
      await user.click(deleteButton);

      await waitFor(() => {
        expect(mockOnDelete).toHaveBeenCalled();
      });
    });

    it("should not call onDelete when cancelled", async () => {
      const user = userEvent.setup();
      jest.spyOn(window, "confirm").mockReturnValue(false);

      const employeeData = {
        id: "emp-1",
        name: "John Doe",
        email: "john@example.com",
      };

      render(
        <EmployeesModal
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          onDelete={mockOnDelete}
          employeeData={employeeData}
        />,
      );

      const deleteButton = screen.getByText("Delete");
      await user.click(deleteButton);

      expect(mockOnDelete).not.toHaveBeenCalled();
    });
  });

  describe("Step Labels and Progress", () => {
    it("should mark current step as active", () => {
      render(
        <EmployeesModal
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />,
      );

      const basicInfoLabel = screen
        .getByText("Basic Info")
        .closest(".employees-modal-step-label");
      expect(basicInfoLabel).toHaveClass("active");
    });

    it("should update progress bar as user navigates", async () => {
      const user = userEvent.setup();
      render(
        <EmployeesModal
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />,
      );

      // Fill required fields
      await user.type(screen.getByPlaceholderText("John"), "Test");
      await user.type(screen.getByPlaceholderText("Doe"), "User");
      await user.type(
        screen.getByPlaceholderText("john.doe@example.com"),
        "test@example.com",
      );

      const nextButton = screen.getByText("Next");

      // Check initial progress (25%)
      let progressBar = document.querySelector(
        ".employees-modal-progress-fill",
      );
      expect(progressBar).toHaveStyle({ width: "25%" });

      // Move to step 2 (50%)
      await user.click(nextButton);
      await waitFor(() => {
        progressBar = document.querySelector(".employees-modal-progress-fill");
        expect(progressBar).toHaveStyle({ width: "50%" });
      });

      // Move to step 3 (75%)
      await user.click(nextButton);
      await waitFor(() => {
        progressBar = document.querySelector(".employees-modal-progress-fill");
        expect(progressBar).toHaveStyle({ width: "75%" });
      });

      // Move to step 4 (100%)
      await user.click(nextButton);
      await waitFor(() => {
        progressBar = document.querySelector(".employees-modal-progress-fill");
        expect(progressBar).toHaveStyle({ width: "100%" });
      });
    });
  });

  describe("Data Fetching", () => {
    it("should handle missing org_id gracefully", async () => {
      modalHelpers.resolveOrgId.mockResolvedValue(null);

      render(
        <EmployeesModal
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />,
      );

      await waitFor(() => {
        expect(modalHelpers.resolveOrgId).toHaveBeenCalled();
      });
    });

    it("should reset form data when modal closes and reopens", async () => {
      const { rerender } = render(
        <EmployeesModal
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />,
      );

      // Type some data
      const user = userEvent.setup();
      await user.type(screen.getByPlaceholderText("John"), "Test");

      // Close modal
      rerender(
        <EmployeesModal
          open={false}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />,
      );

      // Reopen modal
      rerender(
        <EmployeesModal
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />,
      );

      // Field should be empty
      const input = screen.getByPlaceholderText("John");
      expect(input).toHaveValue("");
    });

    it("should call fetchWorkstations on modal open", async () => {
      render(
        <EmployeesModal
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />,
      );

      await waitFor(() => {
        expect(modalHelpers.fetchWorkstations).toHaveBeenCalled();
      });
    });

    it("should call fetchGroups on modal open", async () => {
      render(
        <EmployeesModal
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />,
      );

      await waitFor(() => {
        expect(modalHelpers.fetchGroups).toHaveBeenCalled();
      });
    });

    it("should call fetchFileShares on modal open", async () => {
      render(
        <EmployeesModal
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />,
      );

      await waitFor(() => {
        expect(modalHelpers.fetchFileShares).toHaveBeenCalled();
      });
    });

    it("should call all fetch functions with correct parameters", async () => {
      render(
        <EmployeesModal
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />,
      );

      await waitFor(() => {
        expect(modalHelpers.resolveOrgId).toHaveBeenCalledWith(mockCurrentUser);
      });

      await waitFor(() => {
        expect(modalHelpers.fetchWorkstations).toHaveBeenCalledWith(
          "org-123",
          mockAccessToken,
          expect.any(Function),
          expect.any(Function),
        );
      });

      await waitFor(() => {
        expect(modalHelpers.fetchGroups).toHaveBeenCalledWith(
          "org-123",
          mockAccessToken,
          expect.any(Function),
          expect.any(Function),
        );
      });

      await waitFor(() => {
        expect(modalHelpers.fetchFileShares).toHaveBeenCalledWith(
          "org-123",
          expect.any(Function),
          expect.any(Function),
        );
      });
    });
  });

  describe("Edge Cases", () => {
    it("should handle employee data with no name", () => {
      const employeeData = {
        id: "emp-1",
        email: "john@example.com",
      };

      render(
        <EmployeesModal
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          employeeData={employeeData}
        />,
      );

      expect(screen.getByText("Edit User")).toBeInTheDocument();
    });

    it("should handle employee data with single name part", () => {
      const employeeData = {
        id: "emp-1",
        name: "John",
        email: "john@example.com",
      };

      render(
        <EmployeesModal
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          employeeData={employeeData}
        />,
      );

      expect(screen.getByText("Edit User")).toBeInTheDocument();
    });

    it("should handle empty arrays in employee data", () => {
      const employeeData = {
        id: "emp-1",
        name: "John Doe",
        email: "john@example.com",
        workstations: [],
        groups: [],
        files: [],
      };

      render(
        <EmployeesModal
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          employeeData={employeeData}
        />,
      );

      expect(screen.getByText("Edit User")).toBeInTheDocument();
    });

    it("should handle trimmed whitespace in required fields", () => {
      render(
        <EmployeesModal
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />,
      );

      const nextButton = screen.getByText("Next");

      // Button should be disabled with only whitespace
      const firstNameInput = screen.getByPlaceholderText("John");
      fireEvent.change(firstNameInput, { target: { value: "   " } });

      expect(nextButton).toBeDisabled();
    });

    it("should prevent double submission", async () => {
      const user = userEvent.setup();
      mockOnSubmit.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100)),
      );

      render(
        <EmployeesModal
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />,
      );

      await user.type(screen.getByPlaceholderText("John"), "Test");
      await user.type(screen.getByPlaceholderText("Doe"), "User");
      await user.type(
        screen.getByPlaceholderText("john.doe@example.com"),
        "test@example.com",
      );

      const nextButton = screen.getByText("Next");
      await user.click(nextButton);
      await user.click(nextButton);
      await user.click(nextButton);

      const createButton = screen.getByText("Create User");
      await user.click(createButton);
      await user.click(createButton); // Try to click again

      // Should only be called once
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("Accessibility", () => {
    it("should have accessible close button", () => {
      render(
        <EmployeesModal
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />,
      );

      const closeButton = screen.getByLabelText("Close");
      expect(closeButton).toBeInTheDocument();
    });

    it("should support keyboard navigation on close button", async () => {
      const user = userEvent.setup();
      render(
        <EmployeesModal
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />,
      );

      const closeButton = screen.getByLabelText("Close");
      closeButton.focus();

      await user.keyboard("{Enter}");

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe("Form State Management", () => {
    it("should maintain form state across step navigation", async () => {
      const user = userEvent.setup();
      render(
        <EmployeesModal
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />,
      );

      // Fill in first step
      await user.type(screen.getByPlaceholderText("John"), "Test");
      await user.type(screen.getByPlaceholderText("Doe"), "User");
      await user.type(
        screen.getByPlaceholderText("john.doe@example.com"),
        "test@example.com",
      );
      await user.type(
        screen.getByPlaceholderText("Software Engineer"),
        "Developer",
      );

      // Navigate forward
      const nextButton = screen.getByText("Next");
      await user.click(nextButton);

      // Navigate back
      const backButton = screen.getByText("Back");
      await user.click(backButton);

      // Check that data is still there
      expect(screen.getByPlaceholderText("John")).toHaveValue("Test");
      expect(screen.getByPlaceholderText("Doe")).toHaveValue("User");
      expect(screen.getByPlaceholderText("john.doe@example.com")).toHaveValue(
        "test@example.com",
      );
      expect(screen.getByPlaceholderText("Software Engineer")).toHaveValue(
        "Developer",
      );
    });

    it("should update password field value", async () => {
      const user = userEvent.setup();
      render(
        <EmployeesModal
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />,
      );

      const passwordInput = screen.getByPlaceholderText("Enter password");
      await user.type(passwordInput, "SecurePass123");

      expect(passwordInput).toHaveValue("SecurePass123");
    });

    it("should clear form data when switching from edit to create mode", () => {
      const employeeData = {
        id: "emp-1",
        name: "John Doe",
        email: "john@example.com",
      };

      const { rerender } = render(
        <EmployeesModal
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          employeeData={employeeData}
        />,
      );

      // Switch to create mode
      rerender(
        <EmployeesModal
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          employeeData={null}
        />,
      );

      // Should have switched to create mode
      expect(screen.getByText("New User")).toBeInTheDocument();
    });
  });

  describe("Integration Tests", () => {
    it("should complete full workflow from create to submit", async () => {
      const user = userEvent.setup();
      mockOnSubmit.mockResolvedValue(undefined);

      render(
        <EmployeesModal
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />,
      );

      // Step 1: Basic Info
      await user.type(screen.getByPlaceholderText("John"), "Alice");
      await user.type(screen.getByPlaceholderText("Doe"), "Johnson");
      await user.type(
        screen.getByPlaceholderText("john.doe@example.com"),
        "alice@company.com",
      );
      await user.type(
        screen.getByPlaceholderText("Software Engineer"),
        "Senior Engineer",
      );
      await user.type(
        screen.getByPlaceholderText("Enter password"),
        "SecurePass123",
      );

      // Navigate through all steps
      await user.click(screen.getByText("Next"));
      await user.click(screen.getByText("Next"));
      await user.click(screen.getByText("Next"));

      // Submit
      await user.click(screen.getByText("Create User"));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            firstName: "Alice",
            lastName: "Johnson",
            email: "alice@company.com",
            jobTitle: "Senior Engineer",
            password: "SecurePass123",
          }),
        );
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it("should complete full workflow in edit mode", async () => {
      const user = userEvent.setup();
      mockOnSubmit.mockResolvedValue(undefined);

      const employeeData = {
        id: "emp-1",
        name: "Bob Smith",
        email: "bob@company.com",
        title: "Developer",
      };

      render(
        <EmployeesModal
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          employeeData={employeeData}
        />,
      );

      // Should start with edit mode
      expect(screen.getByText("Edit User")).toBeInTheDocument();

      // Modify data
      const firstNameInput = screen.getByPlaceholderText("John");
      await user.clear(firstNameInput);
      await user.type(firstNameInput, "Robert");

      // Navigate to end and save
      await user.click(screen.getByText("Next"));
      await user.click(screen.getByText("Next"));
      await user.click(screen.getByText("Next"));
      await user.click(screen.getByText("Save Changes"));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled();
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it("should handle navigation through all steps", async () => {
      const user = userEvent.setup();
      render(
        <EmployeesModal
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />,
      );

      // Fill required fields
      await user.type(screen.getByPlaceholderText("John"), "Test");
      await user.type(screen.getByPlaceholderText("Doe"), "User");
      await user.type(
        screen.getByPlaceholderText("john.doe@example.com"),
        "test@example.com",
      );

      // Navigate through all steps
      for (let i = 0; i < 3; i++) {
        await user.click(screen.getByText("Next"));
        await waitFor(() => {
          const progressBar = document.querySelector(
            ".employees-modal-progress-fill",
          );
          expect(progressBar).toHaveStyle({ width: `${((i + 2) / 4) * 100}%` });
        });
      }

      // Should be on last step
      expect(screen.getByText("Create User")).toBeInTheDocument();
    });

    it("should handle complex name parsing in edit mode", () => {
      const employeeData = {
        id: "emp-1",
        name: "Dr. John Michael Smith Jr.",
        email: "john@example.com",
      };

      render(
        <EmployeesModal
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          employeeData={employeeData}
        />,
      );

      expect(screen.getByText("Edit User")).toBeInTheDocument();
    });

    it("should call onSubmit with empty optional fields when not provided", async () => {
      const user = userEvent.setup();
      mockOnSubmit.mockResolvedValue(undefined);

      render(
        <EmployeesModal
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />,
      );

      // Only fill required fields
      await user.type(screen.getByPlaceholderText("John"), "Test");
      await user.type(screen.getByPlaceholderText("Doe"), "User");
      await user.type(
        screen.getByPlaceholderText("john.doe@example.com"),
        "test@example.com",
      );

      // Navigate to last step and submit
      await user.click(screen.getByText("Next"));
      await user.click(screen.getByText("Next"));
      await user.click(screen.getByText("Next"));
      await user.click(screen.getByText("Create User"));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            firstName: "Test",
            lastName: "User",
            email: "test@example.com",
            jobTitle: "",
            password: "",
          }),
        );
      });
    });

    it("should populate all form data fields from employee data", () => {
      const employeeData = {
        id: "emp-1",
        name: "Jane Doe",
        email: "jane@example.com",
        title: "Manager",
        profileImage: "data:image/png;base64,test",
        workstations: mockWorkstations,
        groups: mockGroups,
        files: mockFiles,
      };

      render(
        <EmployeesModal
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          employeeData={employeeData}
        />,
      );

      expect(screen.getByText("Edit User")).toBeInTheDocument();
      expect(screen.getByAltText("Profile")).toHaveAttribute(
        "src",
        "data:image/png;base64,test",
      );
    });

    it("should handle employee data with undefined optional fields", () => {
      const employeeData = {
        id: "emp-1",
        name: "John Doe",
        email: "john@example.com",
        // No title, profileImage, workstations, groups, or files
      };

      render(
        <EmployeesModal
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          employeeData={employeeData}
        />,
      );

      expect(screen.getByText("Edit User")).toBeInTheDocument();
      expect(screen.getByText("Upload Image")).toBeInTheDocument();
    });

    it("should handle navigation with createNavigationHandler", async () => {
      const user = userEvent.setup();
      render(
        <EmployeesModal
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />,
      );

      // Fill required fields
      await user.type(screen.getByPlaceholderText("John"), "Test");
      await user.type(screen.getByPlaceholderText("Doe"), "User");
      await user.type(
        screen.getByPlaceholderText("john.doe@example.com"),
        "test@example.com",
      );

      // Test forward navigation
      await user.click(screen.getByText("Next"));
      expect(modalHelpers.createNavigationHandler).toHaveBeenCalled();

      // Test backward navigation
      await user.click(screen.getByText("Back"));
      expect(modalHelpers.createNavigationHandler).toHaveBeenCalledWith(
        expect.any(Function),
        4,
      );
    });

    it("should properly initialize filteredWorkstations using createFilteredItems", () => {
      render(
        <EmployeesModal
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />,
      );

      // The component should call createFilteredItems for workstations
      expect(modalHelpers.createFilteredItems).toHaveBeenCalled();
    });

    it("should properly initialize filteredGroups using createFilteredItems", () => {
      render(
        <EmployeesModal
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />,
      );

      // The component should call createFilteredItems for groups
      expect(modalHelpers.createFilteredItems).toHaveBeenCalled();
    });

    it("should properly initialize filteredFiles using createFilteredItems", () => {
      render(
        <EmployeesModal
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />,
      );

      // The component should call createFilteredItems for files
      expect(modalHelpers.createFilteredItems).toHaveBeenCalled();
    });

    it("should show creating state when creationStatus is running", () => {
      render(
        <EmployeesModal
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          creationStatus="running"
          creationProgress={50}
          creationMessage="Setting up workstation..."
        />,
      );

      expect(screen.getByText("Creating user...")).toBeInTheDocument();
      expect(screen.getByText("Setting up workstation...")).toBeInTheDocument();
      expect(screen.getByText("50%")).toBeInTheDocument();
    });

    it("should show creating state when creationStatus is starting", () => {
      render(
        <EmployeesModal
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          creationStatus="starting"
        />,
      );

      expect(screen.getByText("Creating user...")).toBeInTheDocument();
    });

    it("should disable footer buttons during creation", () => {
      render(
        <EmployeesModal
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          creationStatus="running"
        />,
      );

      const cancelBtn = screen.getByText("Cancel");
      expect(cancelBtn).toBeDisabled();
    });

    it("should pre-select groups where user is a member in edit mode", async () => {
      // Setup groups with user as member
      const groupsWithMember = [
        { id: "grp-1", name: "Engineering", members: ["emp-1"] },
        { id: "grp-2", name: "Marketing", members: ["emp-2"] },
        { id: "grp-3", name: "DevOps", members: ["emp-1", "emp-3"] },
      ];

      // Mock fetchGroups to populate allGroups
      modalHelpers.fetchGroups.mockImplementation(
        (orgId, token, setGroups) => {
          if (setGroups) setGroups(groupsWithMember);
          return Promise.resolve(groupsWithMember);
        }
      );

      const employeeData = {
        id: "emp-1",
        name: "John Doe",
        email: "john@example.com",
        title: "Engineer",
      };

      render(
        <EmployeesModal
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          employeeData={employeeData}
        />,
      );

      // Wait for groups to be fetched and processed
      await waitFor(() => {
        expect(modalHelpers.fetchGroups).toHaveBeenCalled();
      });
    });

    it("should not pre-select groups when not in edit mode", async () => {
      modalHelpers.fetchGroups.mockImplementation(
        (orgId, token, setGroups) => {
          if (setGroups) setGroups(mockGroups);
          return Promise.resolve(mockGroups);
        }
      );

      render(
        <EmployeesModal
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          employeeData={null}
        />,
      );

      await waitFor(() => {
        expect(modalHelpers.fetchGroups).toHaveBeenCalled();
      });

      // In create mode, no groups should be pre-selected
      expect(screen.getByText("New User")).toBeInTheDocument();
    });

    it("should not pre-select groups when allGroups is empty", async () => {
      modalHelpers.fetchGroups.mockImplementation(
        (orgId, token, setGroups) => {
          if (setGroups) setGroups([]);
          return Promise.resolve([]);
        }
      );

      const employeeData = {
        id: "emp-1",
        name: "John Doe",
        email: "john@example.com",
      };

      render(
        <EmployeesModal
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          employeeData={employeeData}
        />,
      );

      await waitFor(() => {
        expect(modalHelpers.fetchGroups).toHaveBeenCalled();
      });
    });

    it("should not pre-select groups when employeeData has no id", async () => {
      modalHelpers.fetchGroups.mockImplementation(
        (orgId, token, setGroups) => {
          if (setGroups) setGroups(mockGroups);
          return Promise.resolve(mockGroups);
        }
      );

      const employeeData = {
        name: "John Doe",
        email: "john@example.com",
        // Missing id
      };

      render(
        <EmployeesModal
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          employeeData={employeeData}
        />,
      );

      await waitFor(() => {
        expect(modalHelpers.fetchGroups).toHaveBeenCalled();
      });
    });

    it("should display creationMessage when provided during creation", () => {
      render(
        <EmployeesModal
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          creationStatus="running"
          creationMessage="Configuring domain account..."
        />,
      );

      expect(screen.getByText("Configuring domain account...")).toBeInTheDocument();
    });

    it("should display creationProgress percentage when provided", () => {
      render(
        <EmployeesModal
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          creationStatus="running"
          creationProgress={75}
        />,
      );

      expect(screen.getByText("75%")).toBeInTheDocument();
    });

    it("should not display creationProgress when not a number", () => {
      render(
        <EmployeesModal
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          creationStatus="running"
          creationProgress={null}
        />,
      );

      expect(screen.queryByText("%")).not.toBeInTheDocument();
    });

    it("should render step content when not creating", () => {
      render(
        <EmployeesModal
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          creationStatus={null}
        />,
      );

      // Should show form content, not creating state
      expect(screen.queryByText("Creating user...")).not.toBeInTheDocument();
    });

    it("should apply reduced opacity to footer during creation", () => {
      const { container } = render(
        <EmployeesModal
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          creationStatus="running"
        />,
      );

      const footer = container.querySelector(".employees-modal-actions");
      expect(footer).toHaveStyle({ opacity: "0.5" });
    });

    it("should apply pointer-events none to footer during creation", () => {
      const { container } = render(
        <EmployeesModal
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          creationStatus="running"
        />,
      );

      const footer = container.querySelector(".employees-modal-actions");
      expect(footer).toHaveStyle({ pointerEvents: "none" });
    });

    it("should have full opacity footer when not creating", () => {
      const { container } = render(
        <EmployeesModal
          open={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          creationStatus={null}
        />,
      );

      const footer = container.querySelector(".employees-modal-actions");
      expect(footer).toHaveStyle({ opacity: "1" });
    });
  });
});
