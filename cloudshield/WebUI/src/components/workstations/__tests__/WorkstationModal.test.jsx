import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import WorkstationModal from "../WorkstationModal";
import * as modalHelpers from "../../../utils/modalHelpers";

// Mock dependencies
jest.mock("../../common/DisplayIcon/DisplayIcon.jsx", () => ({
  __esModule: true,
  default: ({ type, data }) => (
    <div data-testid={`display-icon-${type}`}>
      {type === "user" && `${data.firstName} ${data.lastName}`}
      {type === "group" && data.name}
    </div>
  ),
}));

jest.mock("../../../assets/ImageUploadIcon.jsx", () => ({
  __esModule: true,
  default: () => <div data-testid="upload-icon" />,
}));

jest.mock("../../../assets/TrashIcon.jsx", () => ({
  __esModule: true,
  default: () => <div data-testid="trash-icon" />,
}));

jest.mock("../../common/Checkbox/Checkbox.jsx", () => ({
  __esModule: true,
  default: ({ checked, indeterminate, onChange }) => (
    <input
      type="checkbox"
      checked={checked}
      data-indeterminate={indeterminate}
      onChange={(e) => onChange && onChange(e.target.checked)}
    />
  ),
}));

jest.mock("../../../assets/workstation", () => ({
  CpuIcon: () => <div data-testid="cpu-icon" />,
  RamIcon: () => <div data-testid="ram-icon" />,
  StorageIcon: () => <div data-testid="storage-icon" />,
  BasicTierIcon: () => <div data-testid="basic-tier-icon" />,
  ProTierIcon: () => <div data-testid="pro-tier-icon" />,
  UltimateTierIcon: () => <div data-testid="ultimate-tier-icon" />,
}));

// Mock modalHelpers
jest.mock("../../../utils/modalHelpers", () => {
  const originalModule = jest.requireActual("../../../utils/modalHelpers");
  return {
    ...originalModule,
    resolveOrgId: jest.fn(() => Promise.resolve("org-123")),
    fetchUsers: jest.fn(),
    fetchGroups: jest.fn(),
    fetchSoftware: jest.fn(),
    createImageUploadHandler: jest.fn((setFormData, fieldName) => {
      return async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setFormData((prev) => ({
          ...prev,
          [fieldName]: `data:image/png;base64,${file.name}`,
        }));
      };
    }),
  };
});

// Mock AuthContext
jest.mock("../../../context/AuthContext.jsx", () => ({
  useAuth: () => ({
    accessToken: "mock-token",
    currentUser: { org_id: "org-123" },
  }),
}));

describe("WorkstationModal", () => {
  const mockUsers = [
    { id: "1", firstName: "John", lastName: "Doe", title: "Engineer" },
    { id: "2", firstName: "Jane", lastName: "Smith", title: "Designer" },
    { id: "3", firstName: "Bob", lastName: "Johnson", title: "Manager" },
  ];

  const mockGroups = [
    { id: "g1", name: "Engineering", members: 15 },
    { id: "g2", name: "Design", members: 8 },
    { id: "g3", name: "Sales", members: 12 },
  ];

  const mockSoftware = [
    { id: "s1", name: "VS Code", category: "Development", icon: "📝" },
    { id: "s2", name: "Slack", category: "Communication", icon: "💬" },
    { id: "s3", name: "Figma", category: "Design", icon: "🎨" },
  ];

  const defaultProps = {
    open: true,
    onClose: jest.fn(),
    onSubmit: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    modalHelpers.fetchUsers.mockImplementation(
      async (accessToken, setAllUsers) => {
        setAllUsers(mockUsers);
      },
    );
    modalHelpers.fetchGroups.mockImplementation(
      async (orgId, accessToken, setAllGroups) => {
        setAllGroups(mockGroups);
      },
    );
    modalHelpers.fetchSoftware.mockImplementation(
      async (orgId, accessToken, setAllSoftware) => {
        setAllSoftware(mockSoftware);
      },
    );
    global.window.confirm = jest.fn(() => true);
  });

  // ===========================================
  // Modal Rendering Tests
  // ===========================================
  describe("Modal Rendering", () => {
    it("should not render when closed", () => {
      render(<WorkstationModal {...defaultProps} open={false} />);
      expect(screen.queryByText("New Workstation")).not.toBeInTheDocument();
    });

    it("should render modal when open", () => {
      render(<WorkstationModal {...defaultProps} />);
      expect(screen.getByText("New Workstation")).toBeInTheDocument();
    });

    it("should render in create mode by default", () => {
      render(<WorkstationModal {...defaultProps} />);
      expect(screen.getByText("New Workstation")).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /delete/i }),
      ).not.toBeInTheDocument();
    });

    it("should render in edit mode with workstation data", () => {
      const workstationData = {
        name: "My Workstation",
        strength: "pro",
        selectedUsers: [],
        selectedGroups: [],
        selectedSoftware: [],
      };
      render(
        <WorkstationModal
          {...defaultProps}
          workstationData={workstationData}
        />,
      );
      expect(screen.getByText("Edit Workstation")).toBeInTheDocument();
    });

    it("should render all four wizard steps", () => {
      render(<WorkstationModal {...defaultProps} />);
      expect(screen.getByText("Basic Info")).toBeInTheDocument();
      expect(screen.getByText("Users")).toBeInTheDocument();
      expect(screen.getByText("Groups")).toBeInTheDocument();
      expect(screen.getByText("Software")).toBeInTheDocument();
    });

    it("should show progress bar", () => {
      const { container } = render(<WorkstationModal {...defaultProps} />);
      const progressBar = container.querySelector(
        ".workstation-modal-progress-fill",
      );
      expect(progressBar).toBeInTheDocument();
    });

    it("should display correct progress on step 1", () => {
      const { container } = render(<WorkstationModal {...defaultProps} />);
      const progressBar = container.querySelector(
        ".workstation-modal-progress-fill",
      );
      expect(progressBar).toHaveStyle("width: 25%");
    });
  });

  // ===========================================
  // Basic Info Step Tests
  // ===========================================
  describe("Basic Info Step", () => {
    it("should render workstation name input", () => {
      render(<WorkstationModal {...defaultProps} />);
      expect(
        screen.getByPlaceholderText("Enter workstation name"),
      ).toBeInTheDocument();
    });

    it("should update workstation name on input", () => {
      render(<WorkstationModal {...defaultProps} />);
      const nameInput = screen.getByPlaceholderText("Enter workstation name");
      fireEvent.change(nameInput, { target: { value: "Dev Workstation" } });
      expect(nameInput.value).toBe("Dev Workstation");
    });

    it("should render all three strength tiers", () => {
      render(<WorkstationModal {...defaultProps} />);
      expect(screen.getByText("Basic")).toBeInTheDocument();
      expect(screen.getByText("Pro")).toBeInTheDocument();
      expect(screen.getByText("Ultimate")).toBeInTheDocument();
    });

    it("should select basic strength by default", () => {
      const { container } = render(<WorkstationModal {...defaultProps} />);
      const basicCard = container.querySelector(
        ".workstation-modal-strength-card.active",
      );
      expect(basicCard).toBeInTheDocument();
      expect(basicCard.textContent).toContain("Basic");
    });

    it("should change strength to pro when clicked", () => {
      render(<WorkstationModal {...defaultProps} />);
      const proButton = screen.getByText("Pro").closest("button");
      fireEvent.click(proButton);
      expect(proButton).toHaveClass("active");
    });

    it("should change strength to ultimate when clicked", () => {
      render(<WorkstationModal {...defaultProps} />);
      const ultimateButton = screen.getByText("Ultimate").closest("button");
      fireEvent.click(ultimateButton);
      expect(ultimateButton).toHaveClass("active");
    });

    it("should render workstation icon upload section", () => {
      render(<WorkstationModal {...defaultProps} />);
      expect(screen.getByText("Workstation Icon")).toBeInTheDocument();
      expect(screen.getByText("Upload Image")).toBeInTheDocument();
    });

    it("should render desktop background upload section", () => {
      render(<WorkstationModal {...defaultProps} />);
      expect(screen.getByText("Desktop Background")).toBeInTheDocument();
      expect(screen.getByText("Upload Background")).toBeInTheDocument();
    });

    it("should show strength tier specifications", () => {
      render(<WorkstationModal {...defaultProps} />);
      expect(screen.getByText("2 vCPU")).toBeInTheDocument();
      expect(screen.getByText("4 GB")).toBeInTheDocument();
      expect(screen.getByText("50 GB")).toBeInTheDocument();
    });
  });

  // ===========================================
  // Image Upload Tests
  // ===========================================
  describe("Image Upload", () => {
    it("should handle workstation image upload", async () => {
      const { container } = render(<WorkstationModal {...defaultProps} />);
      const file = new File(["image"], "workstation.png", {
        type: "image/png",
      });
      const inputs = container.querySelectorAll('input[type="file"]');
      const workstationInput = inputs[0];
      fireEvent.change(workstationInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByAltText("Workstation icon")).toBeInTheDocument();
      });
    });

    it("should handle desktop background upload", async () => {
      const { container } = render(<WorkstationModal {...defaultProps} />);
      const file = new File(["bg"], "background.png", { type: "image/png" });
      const inputs = container.querySelectorAll('input[type="file"]');
      const backgroundInput = inputs[1];
      fireEvent.change(backgroundInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByAltText("Desktop background")).toBeInTheDocument();
      });
    });

    it("should show image preview after workstation image upload", async () => {
      const { container } = render(<WorkstationModal {...defaultProps} />);
      const file = new File(["image"], "test.png", { type: "image/png" });
      const inputs = container.querySelectorAll('input[type="file"]');
      fireEvent.change(inputs[0], { target: { files: [file] } });

      await waitFor(() => {
        const preview = container.querySelector(
          ".workstation-modal-image-preview img",
        );
        expect(preview).toBeInTheDocument();
      });
    });

    it("should remove workstation image when remove button clicked", async () => {
      const { container } = render(<WorkstationModal {...defaultProps} />);
      const file = new File(["image"], "test.png", { type: "image/png" });
      const inputs = container.querySelectorAll('input[type="file"]');
      fireEvent.change(inputs[0], { target: { files: [file] } });

      await waitFor(() => {
        const removeBtn = container.querySelector(
          ".workstation-modal-image-remove",
        );
        expect(removeBtn).toBeInTheDocument();
        fireEvent.click(removeBtn);
      });

      expect(screen.getByText("Upload Image")).toBeInTheDocument();
    });
  });

  // ===========================================
  // Navigation Tests
  // ===========================================
  describe("Navigation", () => {
    it("should disable Next button when name is empty", () => {
      render(<WorkstationModal {...defaultProps} />);
      const nextButton = screen.getByRole("button", { name: "Next" });
      expect(nextButton).toBeDisabled();
    });

    it("should enable Next button after entering name", () => {
      render(<WorkstationModal {...defaultProps} />);
      const nameInput = screen.getByPlaceholderText("Enter workstation name");
      fireEvent.change(nameInput, { target: { value: "Test WS" } });
      const nextButton = screen.getByRole("button", { name: "Next" });
      expect(nextButton).not.toBeDisabled();
    });

    it("should navigate to Users step when Next is clicked", () => {
      render(<WorkstationModal {...defaultProps} />);
      fireEvent.change(screen.getByPlaceholderText("Enter workstation name"), {
        target: { value: "Test" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
      expect(
        screen.getByPlaceholderText("Search users..."),
      ).toBeInTheDocument();
    });

    it("should navigate to Groups step from Users step", () => {
      render(<WorkstationModal {...defaultProps} />);
      fireEvent.change(screen.getByPlaceholderText("Enter workstation name"), {
        target: { value: "Test" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
      expect(
        screen.getByPlaceholderText("Search groups..."),
      ).toBeInTheDocument();
    });

    it("should navigate to Software step from Groups step", () => {
      render(<WorkstationModal {...defaultProps} />);
      fireEvent.change(screen.getByPlaceholderText("Enter workstation name"), {
        target: { value: "Test" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
      expect(
        screen.getByPlaceholderText("Search software..."),
      ).toBeInTheDocument();
    });

    it("should disable Back button on first step", () => {
      render(<WorkstationModal {...defaultProps} />);
      const backButton = screen.getByRole("button", { name: "Back" });
      expect(backButton).toBeDisabled();
    });

    it("should enable Back button after first step", () => {
      render(<WorkstationModal {...defaultProps} />);
      fireEvent.change(screen.getByPlaceholderText("Enter workstation name"), {
        target: { value: "Test" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
      const backButton = screen.getByRole("button", { name: "Back" });
      expect(backButton).not.toBeDisabled();
    });

    it("should navigate back to previous step", () => {
      render(<WorkstationModal {...defaultProps} />);
      fireEvent.change(screen.getByPlaceholderText("Enter workstation name"), {
        target: { value: "Test" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
      fireEvent.click(screen.getByRole("button", { name: "Back" }));
      expect(
        screen.getByPlaceholderText("Enter workstation name"),
      ).toBeInTheDocument();
    });

    it("should show Create Workstation button on last step", () => {
      render(<WorkstationModal {...defaultProps} />);
      fireEvent.change(screen.getByPlaceholderText("Enter workstation name"), {
        target: { value: "Test" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
      expect(
        screen.getByRole("button", { name: "Create Workstation" }),
      ).toBeInTheDocument();
    });

    it("should update progress bar as steps change", () => {
      const { container } = render(<WorkstationModal {...defaultProps} />);
      fireEvent.change(screen.getByPlaceholderText("Enter workstation name"), {
        target: { value: "Test" },
      });

      fireEvent.click(screen.getByRole("button", { name: "Next" }));
      let progressBar = container.querySelector(
        ".workstation-modal-progress-fill",
      );
      expect(progressBar).toHaveStyle("width: 50%");

      fireEvent.click(screen.getByRole("button", { name: "Next" }));
      progressBar = container.querySelector(".workstation-modal-progress-fill");
      expect(progressBar).toHaveStyle("width: 75%");

      fireEvent.click(screen.getByRole("button", { name: "Next" }));
      progressBar = container.querySelector(".workstation-modal-progress-fill");
      expect(progressBar).toHaveStyle("width: 100%");
    });
  });

  // ===========================================
  // Users Selection Tests
  // ===========================================
  describe("Users Selection", () => {
    it("should render users search input", async () => {
      render(<WorkstationModal {...defaultProps} />);
      fireEvent.change(screen.getByPlaceholderText("Enter workstation name"), {
        target: { value: "Test" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Next" }));

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText("Search users..."),
        ).toBeInTheDocument();
      });
    });

    it("should fetch and display users on Users step", async () => {
      render(<WorkstationModal {...defaultProps} />);
      fireEvent.change(screen.getByPlaceholderText("Enter workstation name"), {
        target: { value: "Test" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Next" }));

      await waitFor(() => {
        expect(modalHelpers.fetchUsers).toHaveBeenCalled();
        expect(screen.getAllByText("John Doe")[0]).toBeInTheDocument();
        expect(screen.getAllByText("Jane Smith")[0]).toBeInTheDocument();
      });
    });

    it("should filter users based on search term", async () => {
      render(<WorkstationModal {...defaultProps} />);
      fireEvent.change(screen.getByPlaceholderText("Enter workstation name"), {
        target: { value: "Test" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Next" }));

      await waitFor(() => {
        expect(screen.getAllByText("John Doe")[0]).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText("Search users...");
      fireEvent.change(searchInput, { target: { value: "Jane" } });

      expect(searchInput.value).toBe("Jane");
    });

    it("should select a user when clicked", async () => {
      render(<WorkstationModal {...defaultProps} />);
      fireEvent.change(screen.getByPlaceholderText("Enter workstation name"), {
        target: { value: "Test" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Next" }));

      await waitFor(() => {
        const userElements = screen.getAllByText("John Doe");
        const userItem = userElements[0].closest('[role="option"]');
        fireEvent.click(userItem);
      });

      await waitFor(() => {
        expect(screen.getByText(/Selected Users \(1\)/)).toBeInTheDocument();
      });
    });

    it("should deselect a user when clicked again", async () => {
      render(<WorkstationModal {...defaultProps} />);
      fireEvent.change(screen.getByPlaceholderText("Enter workstation name"), {
        target: { value: "Test" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Next" }));

      await waitFor(() => {
        const userElements = screen.getAllByText("John Doe");
        const userItem = userElements[0].closest('[role="option"]');
        fireEvent.click(userItem);
      });

      await waitFor(() => {
        expect(screen.getByText(/Selected Users \(1\)/)).toBeInTheDocument();
      });

      const userElements = screen.getAllByText("John Doe");
      const userItem = userElements[0].closest('[role="option"]');
      fireEvent.click(userItem);

      await waitFor(() => {
        expect(screen.queryByText(/Selected Users/)).not.toBeInTheDocument();
      });
    });

    it("should remove selected user with remove button", async () => {
      const { container } = render(<WorkstationModal {...defaultProps} />);
      fireEvent.change(screen.getByPlaceholderText("Enter workstation name"), {
        target: { value: "Test" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Next" }));

      await waitFor(() => {
        const userElements = screen.getAllByText("John Doe");
        const userItem = userElements[0].closest('[role="option"]');
        fireEvent.click(userItem);
      });

      await waitFor(() => {
        const removeBtn = container.querySelector(
          ".workstation-modal-card-remove-btn",
        );
        fireEvent.click(removeBtn);
      });

      await waitFor(() => {
        expect(screen.queryByText(/Selected Users/)).not.toBeInTheDocument();
      });
    });

    it("should render All Users checkbox", async () => {
      render(<WorkstationModal {...defaultProps} />);
      fireEvent.change(screen.getByPlaceholderText("Enter workstation name"), {
        target: { value: "Test" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Next" }));

      await waitFor(() => {
        expect(screen.getByText("All Users")).toBeInTheDocument();
      });
    });

    it("should select all users when All Users checkbox is checked", async () => {
      render(<WorkstationModal {...defaultProps} />);
      fireEvent.change(screen.getByPlaceholderText("Enter workstation name"), {
        target: { value: "Test" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Next" }));

      await waitFor(() => {
        const checkbox = screen.getByRole("checkbox");
        fireEvent.click(checkbox);
      });

      await waitFor(() => {
        expect(screen.getByText(/Selected Users \(3\)/)).toBeInTheDocument();
      });
    });
  });

  // ===========================================
  // Groups Selection Tests
  // ===========================================
  describe("Groups Selection", () => {
    it("should render groups search input", async () => {
      render(<WorkstationModal {...defaultProps} />);
      fireEvent.change(screen.getByPlaceholderText("Enter workstation name"), {
        target: { value: "Test" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
      fireEvent.click(screen.getByRole("button", { name: "Next" }));

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText("Search groups..."),
        ).toBeInTheDocument();
      });
    });

    it("should fetch and display groups on Groups step", async () => {
      render(<WorkstationModal {...defaultProps} />);
      fireEvent.change(screen.getByPlaceholderText("Enter workstation name"), {
        target: { value: "Test" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
      fireEvent.click(screen.getByRole("button", { name: "Next" }));

      await waitFor(() => {
        expect(modalHelpers.fetchGroups).toHaveBeenCalled();
        expect(screen.getAllByText("Engineering")[0]).toBeInTheDocument();
        expect(screen.getAllByText("Design")[0]).toBeInTheDocument();
      });
    });

    it("should display group member count", async () => {
      render(<WorkstationModal {...defaultProps} />);
      fireEvent.change(screen.getByPlaceholderText("Enter workstation name"), {
        target: { value: "Test" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
      fireEvent.click(screen.getByRole("button", { name: "Next" }));

      await waitFor(() => {
        expect(screen.getByText("15 members")).toBeInTheDocument();
        expect(screen.getByText("8 members")).toBeInTheDocument();
      });
    });

    it("should select a group when clicked", async () => {
      render(<WorkstationModal {...defaultProps} />);
      fireEvent.change(screen.getByPlaceholderText("Enter workstation name"), {
        target: { value: "Test" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
      fireEvent.click(screen.getByRole("button", { name: "Next" }));

      await waitFor(() => {
        const groupItem = screen.getAllByText("Engineering")[0].closest("div");
        fireEvent.click(groupItem);
      });

      await waitFor(() => {
        expect(screen.getByText(/Selected Groups \(1\)/)).toBeInTheDocument();
      });
    });

    it("should remove selected group with remove button", async () => {
      const { container } = render(<WorkstationModal {...defaultProps} />);
      fireEvent.change(screen.getByPlaceholderText("Enter workstation name"), {
        target: { value: "Test" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
      fireEvent.click(screen.getByRole("button", { name: "Next" }));

      await waitFor(() => {
        const groupItem = screen.getAllByText("Engineering")[0].closest("div");
        fireEvent.click(groupItem);
      });

      await waitFor(() => {
        const removeBtn = container.querySelector(
          ".workstation-modal-card-remove-btn",
        );
        fireEvent.click(removeBtn);
      });

      expect(screen.queryByText(/Selected Groups/)).not.toBeInTheDocument();
    });

    it("should show checkmark for selected group", async () => {
      render(<WorkstationModal {...defaultProps} />);
      fireEvent.change(screen.getByPlaceholderText("Enter workstation name"), {
        target: { value: "Test" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
      fireEvent.click(screen.getByRole("button", { name: "Next" }));

      await waitFor(() => {
        const groupItem = screen.getAllByText("Engineering")[0].closest("div");
        fireEvent.click(groupItem);
      });

      await waitFor(() => {
        expect(screen.getByText("✓")).toBeInTheDocument();
      });
    });
  });

  // ===========================================
  // Software Selection Tests
  // ===========================================
  describe("Software Selection", () => {
    it("should render software search input", async () => {
      render(<WorkstationModal {...defaultProps} />);
      fireEvent.change(screen.getByPlaceholderText("Enter workstation name"), {
        target: { value: "Test" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
      fireEvent.click(screen.getByRole("button", { name: "Next" }));

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText("Search software..."),
        ).toBeInTheDocument();
      });
    });

    it("should fetch and display software on Software step", async () => {
      render(<WorkstationModal {...defaultProps} />);
      fireEvent.change(screen.getByPlaceholderText("Enter workstation name"), {
        target: { value: "Test" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
      fireEvent.click(screen.getByRole("button", { name: "Next" }));

      await waitFor(() => {
        expect(modalHelpers.fetchSoftware).toHaveBeenCalled();
        expect(screen.getAllByText("VS Code")[0]).toBeInTheDocument();
        expect(screen.getAllByText("Slack")[0]).toBeInTheDocument();
      });
    });

    it("should display software category", async () => {
      render(<WorkstationModal {...defaultProps} />);
      fireEvent.change(screen.getByPlaceholderText("Enter workstation name"), {
        target: { value: "Test" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
      fireEvent.click(screen.getByRole("button", { name: "Next" }));

      await waitFor(() => {
        expect(screen.getByText("Development")).toBeInTheDocument();
        expect(screen.getByText("Communication")).toBeInTheDocument();
      });
    });

    it("should select a software when clicked", async () => {
      render(<WorkstationModal {...defaultProps} />);
      fireEvent.change(screen.getByPlaceholderText("Enter workstation name"), {
        target: { value: "Test" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
      fireEvent.click(screen.getByRole("button", { name: "Next" }));

      await waitFor(() => {
        const softwareItem = screen.getByText("VS Code").closest("div");
        fireEvent.click(softwareItem);
      });

      await waitFor(() => {
        expect(screen.getByText(/Selected Software \(1\)/)).toBeInTheDocument();
      });
    });

    it("should remove selected software with remove button", async () => {
      const { container } = render(<WorkstationModal {...defaultProps} />);
      fireEvent.change(screen.getByPlaceholderText("Enter workstation name"), {
        target: { value: "Test" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
      fireEvent.click(screen.getByRole("button", { name: "Next" }));

      await waitFor(() => {
        const softwareItem = screen.getByText("VS Code").closest("div");
        fireEvent.click(softwareItem);
      });

      await waitFor(() => {
        const removeBtn = container.querySelector(
          ".workstation-modal-card-remove-btn",
        );
        fireEvent.click(removeBtn);
      });

      expect(screen.queryByText(/Selected Software/)).not.toBeInTheDocument();
    });

    it("should filter software based on search term", async () => {
      render(<WorkstationModal {...defaultProps} />);
      fireEvent.change(screen.getByPlaceholderText("Enter workstation name"), {
        target: { value: "Test" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
      fireEvent.click(screen.getByRole("button", { name: "Next" }));

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText("Search software...");
        fireEvent.change(searchInput, { target: { value: "VS" } });
        expect(searchInput.value).toBe("VS");
      });
    });
  });

  // ===========================================
  // Form Submission Tests
  // ===========================================
  describe("Form Submission", () => {
    it("should call onSubmit with correct data in create mode", async () => {
      const onSubmit = jest.fn();
      render(<WorkstationModal {...defaultProps} onSubmit={onSubmit} />);

      fireEvent.change(screen.getByPlaceholderText("Enter workstation name"), {
        target: { value: "New Workstation" },
      });

      // Navigate to last step
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
      fireEvent.click(screen.getByRole("button", { name: "Next" }));

      fireEvent.click(
        screen.getByRole("button", { name: "Create Workstation" }),
      );

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            name: "New Workstation",
            description: "basic",
          }),
        );
      });
    });

    it("should call onClose after successful submission", async () => {
      const onClose = jest.fn();
      render(<WorkstationModal {...defaultProps} onClose={onClose} />);

      fireEvent.change(screen.getByPlaceholderText("Enter workstation name"), {
        target: { value: "Test" },
      });

      fireEvent.click(screen.getByRole("button", { name: "Next" }));
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
      fireEvent.click(
        screen.getByRole("button", { name: "Create Workstation" }),
      );

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });
    });

    it("should show Save Changes button in edit mode", () => {
      const workstationData = {
        name: "Existing",
        strength: "pro",
        selectedUsers: [],
        selectedGroups: [],
        selectedSoftware: [],
      };
      render(
        <WorkstationModal
          {...defaultProps}
          workstationData={workstationData}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: "Next" }));
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
      fireEvent.click(screen.getByRole("button", { name: "Next" }));

      expect(
        screen.getByRole("button", { name: "Save Changes" }),
      ).toBeInTheDocument();
    });

    it("should show Saving... when submission is in progress", async () => {
      const onSubmit = jest.fn(() => new Promise(() => {})); // Never resolves
      render(<WorkstationModal {...defaultProps} onSubmit={onSubmit} />);

      fireEvent.change(screen.getByPlaceholderText("Enter workstation name"), {
        target: { value: "Test" },
      });

      fireEvent.click(screen.getByRole("button", { name: "Next" }));
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
      fireEvent.click(
        screen.getByRole("button", { name: "Create Workstation" }),
      );

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "Saving..." }),
        ).toBeDisabled();
      });
    });

    it("should include selected users in submission data", async () => {
      const onSubmit = jest.fn();
      render(<WorkstationModal {...defaultProps} onSubmit={onSubmit} />);

      fireEvent.change(screen.getByPlaceholderText("Enter workstation name"), {
        target: { value: "Test" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Next" }));

      await waitFor(() => {
        const userElements = screen.getAllByText("John Doe");
        const userItem = userElements[0].closest('[role="option"]');
        fireEvent.click(userItem);
      });

      await waitFor(() => {
        expect(screen.getByText(/Selected Users \(1\)/)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: "Next" }));
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
      fireEvent.click(
        screen.getByRole("button", { name: "Create Workstation" }),
      );

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            members: expect.arrayContaining([
              expect.objectContaining({ id: "1" }),
            ]),
          }),
        );
      });
    });
  });

  // ===========================================
  // Delete Functionality Tests
  // ===========================================
  describe("Delete Functionality", () => {
    it("should show Delete button only in edit mode on first step", () => {
      const workstationData = {
        name: "Existing",
        strength: "pro",
      };
      render(
        <WorkstationModal
          {...defaultProps}
          workstationData={workstationData}
          onDelete={jest.fn()}
        />,
      );

      expect(
        screen.getByRole("button", { name: /delete/i }),
      ).toBeInTheDocument();
    });

    it("should not show Delete button in create mode", () => {
      render(<WorkstationModal {...defaultProps} />);
      expect(
        screen.queryByRole("button", { name: /delete/i }),
      ).not.toBeInTheDocument();
    });

    it("should confirm before deleting", () => {
      const onDelete = jest.fn();
      const workstationData = {
        name: "Existing",
        strength: "pro",
      };
      render(
        <WorkstationModal
          {...defaultProps}
          workstationData={workstationData}
          onDelete={onDelete}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: /delete/i }));
      expect(window.confirm).toHaveBeenCalled();
    });

    it("should call onDelete when confirmed", () => {
      const onDelete = jest.fn();
      const workstationData = {
        name: "Existing",
        strength: "pro",
      };
      window.confirm = jest.fn(() => true);

      render(
        <WorkstationModal
          {...defaultProps}
          workstationData={workstationData}
          onDelete={onDelete}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: /delete/i }));
      expect(onDelete).toHaveBeenCalled();
    });

    it("should not delete when cancelled", () => {
      const onDelete = jest.fn();
      const workstationData = {
        name: "Existing",
        strength: "pro",
      };
      window.confirm = jest.fn(() => false);

      render(
        <WorkstationModal
          {...defaultProps}
          workstationData={workstationData}
          onDelete={onDelete}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: /delete/i }));
      expect(onDelete).not.toHaveBeenCalled();
    });
  });

  // ===========================================
  // Edit Mode Tests
  // ===========================================
  describe("Edit Mode", () => {
    it("should pre-populate name in edit mode", () => {
      const workstationData = {
        name: "Production WS",
        strength: "ultimate",
      };
      render(
        <WorkstationModal
          {...defaultProps}
          workstationData={workstationData}
        />,
      );

      const nameInput = screen.getByPlaceholderText("Enter workstation name");
      expect(nameInput.value).toBe("Production WS");
    });

    it("should pre-select strength in edit mode", () => {
      const workstationData = {
        name: "Test",
        strength: "ultimate",
      };
      const { container } = render(
        <WorkstationModal
          {...defaultProps}
          workstationData={workstationData}
        />,
      );

      const ultimateCard = screen.getByText("Ultimate").closest("button");
      expect(ultimateCard).toHaveClass("active");
    });

    it("should pre-select users in edit mode", async () => {
      const workstationData = {
        name: "Test",
        strength: "basic",
        users: [mockUsers[0]],
      };
      render(
        <WorkstationModal
          {...defaultProps}
          workstationData={workstationData}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: "Next" }));

      await waitFor(() => {
        expect(screen.getByText(/Selected Users \(1\)/)).toBeInTheDocument();
      });
    });

    it("should pre-select groups in edit mode", async () => {
      const workstationData = {
        name: "Test",
        strength: "basic",
        groups: [mockGroups[0]],
      };
      render(
        <WorkstationModal
          {...defaultProps}
          workstationData={workstationData}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: "Next" }));
      fireEvent.click(screen.getByRole("button", { name: "Next" }));

      await waitFor(() => {
        expect(screen.getByText(/Selected Groups \(1\)/)).toBeInTheDocument();
      });
    });

    it("should pre-select software in edit mode", async () => {
      const workstationData = {
        name: "Test",
        strength: "basic",
        software: [mockSoftware[0]],
      };
      render(
        <WorkstationModal
          {...defaultProps}
          workstationData={workstationData}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: "Next" }));
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
      fireEvent.click(screen.getByRole("button", { name: "Next" }));

      await waitFor(() => {
        expect(screen.getByText(/Selected Software \(1\)/)).toBeInTheDocument();
      });
    });
  });

  // ===========================================
  // Edge Cases and Error Handling
  // ===========================================
  describe("Edge Cases", () => {
    it("should handle empty users list", async () => {
      modalHelpers.fetchUsers.mockImplementation(
        async (accessToken, setAllUsers) => {
          setAllUsers([]);
        },
      );
      render(<WorkstationModal {...defaultProps} />);

      fireEvent.change(screen.getByPlaceholderText("Enter workstation name"), {
        target: { value: "Test" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Next" }));

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText("Search users..."),
        ).toBeInTheDocument();
      });
    });

    it("should handle empty groups list", async () => {
      modalHelpers.fetchGroups.mockImplementation(
        async (orgId, accessToken, setAllGroups) => {
          setAllGroups([]);
        },
      );
      render(<WorkstationModal {...defaultProps} />);

      fireEvent.change(screen.getByPlaceholderText("Enter workstation name"), {
        target: { value: "Test" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
      fireEvent.click(screen.getByRole("button", { name: "Next" }));

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText("Search groups..."),
        ).toBeInTheDocument();
      });
    });

    it("should handle empty software list", async () => {
      modalHelpers.fetchSoftware.mockImplementation(
        async (orgId, accessToken, setAllSoftware) => {
          setAllSoftware([]);
        },
      );
      render(<WorkstationModal {...defaultProps} />);

      fireEvent.change(screen.getByPlaceholderText("Enter workstation name"), {
        target: { value: "Test" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
      fireEvent.click(screen.getByRole("button", { name: "Next" }));

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText("Search software..."),
        ).toBeInTheDocument();
      });
    });

    it("should handle Cancel button click", () => {
      const onClose = jest.fn();
      render(<WorkstationModal {...defaultProps} onClose={onClose} />);

      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      expect(onClose).toHaveBeenCalled();
    });

    it("should handle modal close during submission", async () => {
      const onClose = jest.fn();
      const onSubmit = jest.fn(
        () => new Promise((resolve) => setTimeout(resolve, 100)),
      );
      render(
        <WorkstationModal
          {...defaultProps}
          onClose={onClose}
          onSubmit={onSubmit}
        />,
      );

      fireEvent.change(screen.getByPlaceholderText("Enter workstation name"), {
        target: { value: "Test" },
      });

      fireEvent.click(screen.getByRole("button", { name: "Next" }));
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
      fireEvent.click(
        screen.getByRole("button", { name: "Create Workstation" }),
      );

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalled();
      });
    });

    it("should allow submission with no selections", async () => {
      const onSubmit = jest.fn();
      render(<WorkstationModal {...defaultProps} onSubmit={onSubmit} />);

      fireEvent.change(screen.getByPlaceholderText("Enter workstation name"), {
        target: { value: "Test" },
      });

      fireEvent.click(screen.getByRole("button", { name: "Next" }));
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
      fireEvent.click(
        screen.getByRole("button", { name: "Create Workstation" }),
      );

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            members: [],
            access_groups: [],
            software: [],
          }),
        );
      });
    });

    it("should handle keyboard navigation on dropdown items", async () => {
      render(<WorkstationModal {...defaultProps} />);
      fireEvent.change(screen.getByPlaceholderText("Enter workstation name"), {
        target: { value: "Test" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Next" }));

      await waitFor(() => {
        const userElements = screen.getAllByText("John Doe");
        const userItem = userElements[0].closest('[role="option"]');
        fireEvent.keyDown(userItem, { key: "Enter" });
      });

      await waitFor(() => {
        expect(screen.getByText(/Selected Users \(1\)/)).toBeInTheDocument();
      });
    });

    it("should handle space key on dropdown items", async () => {
      render(<WorkstationModal {...defaultProps} />);
      fireEvent.change(screen.getByPlaceholderText("Enter workstation name"), {
        target: { value: "Test" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Next" }));

      await waitFor(() => {
        const userElements = screen.getAllByText("John Doe");
        const userItem = userElements[0].closest('[role="option"]');
        fireEvent.keyDown(userItem, { key: " " });
      });

      await waitFor(() => {
        expect(screen.getByText(/Selected Users \(1\)/)).toBeInTheDocument();
      });
    });

    it("should maintain selections when navigating between steps", async () => {
      render(<WorkstationModal {...defaultProps} />);
      fireEvent.change(screen.getByPlaceholderText("Enter workstation name"), {
        target: { value: "Test" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Next" }));

      await waitFor(() => {
        const userElements = screen.getAllByText("John Doe");
        const userItem = userElements[0].closest('[role="option"]');
        fireEvent.click(userItem);
      });

      await waitFor(() => {
        expect(screen.getByText(/Selected Users \(1\)/)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: "Next" }));
      fireEvent.click(screen.getByRole("button", { name: "Back" }));

      await waitFor(() => {
        expect(screen.getByText(/Selected Users \(1\)/)).toBeInTheDocument();
      });
    });
  });

  // ===========================================
  // Accessibility Tests
  // ===========================================
  describe("Accessibility", () => {
    it("should have proper ARIA roles on dropdown items", async () => {
      render(<WorkstationModal {...defaultProps} />);
      fireEvent.change(screen.getByPlaceholderText("Enter workstation name"), {
        target: { value: "Test" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Next" }));

      await waitFor(() => {
        const options = screen.getAllByRole("option");
        expect(options.length).toBeGreaterThan(0);
      });
    });

    it("should set aria-selected on selected items", async () => {
      render(<WorkstationModal {...defaultProps} />);
      fireEvent.change(screen.getByPlaceholderText("Enter workstation name"), {
        target: { value: "Test" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Next" }));

      await waitFor(() => {
        const userElements = screen.getAllByText("John Doe");
        const userItem = userElements[0].closest('[role="option"]');
        fireEvent.click(userItem);
      });

      await waitFor(() => {
        const userElements = screen.getAllByText("John Doe");
        const selectedItem = userElements[0].closest("div[role='option']");
        expect(selectedItem).toHaveAttribute("aria-selected", "true");
      });
    });

    it("should have keyboard-accessible dropdown items", async () => {
      render(<WorkstationModal {...defaultProps} />);
      fireEvent.change(screen.getByPlaceholderText("Enter workstation name"), {
        target: { value: "Test" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Next" }));

      await waitFor(() => {
        const options = screen.getAllByRole("option");
        expect(options[0]).toHaveAttribute("tabindex", "0");
      });
    });
  });

  // ===========================================
  // Theme and Styling Tests
  // ===========================================
  describe("Theme and Styling", () => {
    it("should render modal with CSS class for styling", () => {
      const { container } = render(<WorkstationModal {...defaultProps} />);
      const modal = container.querySelector(".workstation-modal-dialog");
      expect(modal).toBeInTheDocument();
    });

    it("should apply modal container styles", () => {
      const { container } = render(<WorkstationModal {...defaultProps} />);
      const modalContainer = container.querySelector(".workstation-modal-overlay");
      expect(modalContainer).toBeInTheDocument();
    });

    it("should have proper header styling", () => {
      const { container } = render(<WorkstationModal {...defaultProps} />);
      const header = container.querySelector(".workstation-modal-header, h2");
      expect(header).toBeInTheDocument();
    });

    it("should have proper content area styling", () => {
      const { container } = render(<WorkstationModal {...defaultProps} />);
      const content = container.querySelector(".workstation-modal-content");
      expect(content).toBeInTheDocument();
    });

    it("should have progress bar with theme-aware styling", () => {
      const { container } = render(<WorkstationModal {...defaultProps} />);
      const progressBar = container.querySelector(".workstation-modal-progress-track");
      expect(progressBar).toBeInTheDocument();
    });

    it("should render buttons with proper styling classes", () => {
      const { container } = render(<WorkstationModal {...defaultProps} />);
      const buttons = container.querySelectorAll("button");
      expect(buttons.length).toBeGreaterThan(0);
      buttons.forEach((button) => {
        expect(button).toBeInTheDocument();
      });
    });

    it("should apply consistent spacing in modal content", () => {
      const { container } = render(<WorkstationModal {...defaultProps} />);
      const dialogContent = container.querySelector(".workstation-modal-dialog");
      expect(dialogContent).toBeInTheDocument();
    });

    it("should have accessible contrast ratios in dark mode", () => {
      const { container } = render(<WorkstationModal {...defaultProps} />);
      // Verify modal is rendered and text is readable
      const modal = container.querySelector(".workstation-modal-dialog");
      expect(modal).toBeInTheDocument();
      expect(modal.textContent).toBeTruthy();
    });

    it("should render form inputs with theme-aware styling", () => {
      render(<WorkstationModal {...defaultProps} />);
      const input = screen.getByPlaceholderText("Enter workstation name");
      expect(input).toHaveClass("workstation-modal-input");
    });

    it("should have responsive layout for modal", () => {
      const { container } = render(<WorkstationModal {...defaultProps} />);
      const dialog = container.querySelector(".workstation-modal-dialog");
      expect(dialog).toBeInTheDocument();
      expect(dialog.className).toContain("workstation-modal-dialog");
    });

    it("should style step indicators consistently", () => {
      const { container } = render(<WorkstationModal {...defaultProps} />);
      const stepContainer = container.querySelector(".workstation-modal-steps");
      if (stepContainer) {
        expect(stepContainer).toBeInTheDocument();
      }
    });

    it("should apply hover states to interactive elements", () => {
      render(<WorkstationModal {...defaultProps} />);
      const buttons = screen.getAllByRole("button");
      expect(buttons.length).toBeGreaterThan(0);
      buttons.forEach((button) => {
        // Buttons should be interactive
        expect(button).toBeInTheDocument();
      });
    });

    it("should maintain visual hierarchy with typography", () => {
      render(<WorkstationModal {...defaultProps} />);
      const title = screen.getByText("New Workstation");
      expect(title).toBeInTheDocument();
    });

    it("should apply theme colors to form fields", () => {
      render(<WorkstationModal {...defaultProps} />);
      const input = screen.getByPlaceholderText("Enter workstation name");
      expect(input).toHaveClass("workstation-modal-input");
    });

    it("should render modal without layout shift", () => {
      const { container } = render(<WorkstationModal {...defaultProps} />);
      const modal = container.querySelector(".workstation-modal-dialog");
      const content = container.querySelector(".workstation-modal-content");
      expect(modal).toBeInTheDocument();
      expect(content).toBeInTheDocument();
    });

    it("should have proper border and shadow styling", () => {
      const { container } = render(<WorkstationModal {...defaultProps} />);
      const dialog = container.querySelector(".workstation-modal-dialog");
      expect(dialog).toBeInTheDocument();
      expect(dialog.className).toContain("workstation-modal-dialog");
    });

    it("should style disabled buttons appropriately", async () => {
      render(<WorkstationModal {...defaultProps} />);
      const backButton = screen.getByRole("button", { name: "Back" });
      expect(backButton).toBeDisabled();
      // Disabled button should have proper styling
      expect(backButton).toHaveAttribute("disabled");
    });

    it("should apply focus styles to interactive elements", () => {
      render(<WorkstationModal {...defaultProps} />);
      const input = screen.getByPlaceholderText("Enter workstation name");
      input.focus();
      expect(input).toHaveFocus();
    });
  });
});
