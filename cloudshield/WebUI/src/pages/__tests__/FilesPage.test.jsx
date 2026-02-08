import React from "react";
import {
  render,
  screen,
  waitFor,
  fireEvent,
  act,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import FilesPage from "../FilesPage";
import * as filesApi from "../../api/filesApi";

// Mock the analytics
jest.mock("../../lib/analytics", () => ({
  trackButton: jest.fn(),
}));

// Mock useClickLogger
jest.mock("../../hooks/useClickLogger", () => ({
  useClickLogger: () => (config) => (fn) => fn,
}));

// Mock AuthContext
const mockCurrentUser = {
  id: "user-1",
  email: "test@example.com",
  org_id: "test-org-123",
};

jest.mock("../../context/AuthContext", () => ({
  useAuth: () => ({
    currentUser: mockCurrentUser,
    accessToken: "test-token",
  }),
}));

// Mock the files API
jest.mock("../../api/filesApi", () => ({
  createFileShare: jest.fn(),
  updateFileShare: jest.fn(),
  deleteFileShare: jest.fn(),
  fetchUsers: jest.fn(),
  fetchGroups: jest.fn(),
}));

// Mock components
jest.mock("../../components/common/SearchField/SearchField", () => ({
  __esModule: true,
  default: ({ value, onChange, placeholder }) => (
    <input
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      data-testid="search-field"
    />
  ),
}));

jest.mock("../../components/common/DisplayButton/DisplayButton", () => ({
  __esModule: true,
  default: ({ layout, onLayoutChange }) => (
    <button
      onClick={() => onLayoutChange(layout === "list" ? "icons" : "list")}
      data-testid="display-button"
    >
      {layout}
    </button>
  ),
}));

jest.mock("../../components/common/RefreshButton/RefreshButton", () => ({
  __esModule: true,
  default: ({ onClick }) => (
    <button onClick={onClick} data-testid="refresh-button">
      Refresh
    </button>
  ),
}));

jest.mock("../../components/common/CreateButton/CreateButton", () => ({
  __esModule: true,
  default: ({ buttonText, onClick, icon }) => (
    <button onClick={onClick} data-testid="create-button">
      {buttonText}
    </button>
  ),
}));

jest.mock("../../components/common/Checkbox/Checkbox", () => ({
  __esModule: true,
  default: ({ checked, onChange, indeterminate }) => (
    <input
      type="checkbox"
      checked={checked}
      data-indeterminate={indeterminate}
      onChange={(e) => onChange(e)}
      data-testid="checkbox"
    />
  ),
}));

jest.mock("../../components/common/EditButton/EditButton", () => ({
  __esModule: true,
  default: ({ menuItems }) => (
    <div data-testid="edit-button">
      {menuItems?.map((item, index) => (
        <button
          key={index}
          data-testid={`edit-menu-${index}`}
          onClick={item.onClick}
          style={{ color: item.color }}
        >
          {item.label}
        </button>
      ))}
    </div>
  ),
}));

jest.mock("../../components/files/FileShareWizardModal", () => ({
  __esModule: true,
  default: ({ isOpen, onClose, onSubmit, onDelete, file }) => {
    if (!isOpen) return null;
    return (
      <div data-testid={file ? "edit-modal" : "create-modal"}>
        <h2>{file ? "Edit Share" : "Create Share"}</h2>
        <button onClick={onClose} data-testid="modal-close">
          Close
        </button>
        <button
          onClick={() =>
            onSubmit({
              shareName: "Test Share",
              users: ["user1"],
              groups: ["group1"],
              description: "Test description",
              maxSize: 100,
            })
          }
          data-testid="modal-submit"
        >
          Submit
        </button>
        {onDelete && (
          <button onClick={onDelete} data-testid="modal-delete">
            Delete
          </button>
        )}
      </div>
    );
  },
}));

jest.mock("../../components/files/AvatarPill", () => ({
  __esModule: true,
  default: ({ items, type, maxVisible }) => (
    <div data-testid={`avatar-pill-${type}`}>
      {items?.slice(0, maxVisible).map((item, i) => (
        <span key={i}>{item.username || item.name || item.id}</span>
      ))}
    </div>
  ),
}));

jest.mock("@mui/material/Tooltip", () => ({
  __esModule: true,
  default: ({ children, title }) => <div title={title}>{children}</div>,
}));

jest.mock("@mui/material/CircularProgress", () => ({
  __esModule: true,
  default: ({ size, style }) => (
    <div data-testid="circular-progress" style={style}>
      Loading...
    </div>
  ),
}));

jest.mock("../../assets/FolderPlusIcon", () => ({
  __esModule: true,
  default: () => <div data-testid="folder-plus-icon">+</div>,
}));

describe("FilesPage", () => {
  const mockShares = [
    {
      id: "share-1",
      name: "Sales Docs",
      kind: "folder",
      users: ["user1@example.com", "user2@example.com"],
      groups: ["Sales Team", "Managers"],
      updated_at: "2024-01-15T10:00:00Z",
      current_size: 45,
      max_size: 100,
      description: "Sales documents folder",
    },
    {
      id: "share-2",
      name: "Marketing",
      kind: "folder",
      users: ["user3@example.com"],
      groups: ["Marketing"],
      updated_at: "2024-01-16T14:30:00Z",
      current_size: 30,
      max_size: 50,
    },
  ];

  const mockUsers = [
    {
      _id: "u1",
      email: "user1@example.com",
      full_name: "User One",
      role: "admin",
      active: true,
    },
    {
      _id: "u2",
      email: "user2@example.com",
      full_name: "User Two",
      role: "user",
      active: true,
    },
  ];

  const mockGroups = [
    {
      _id: "g1",
      name: "Sales Team",
      group_name: "Sales Team",
      description: "Sales team group",
      members: ["u1", "u2"],
    },
    {
      _id: "g2",
      name: "Marketing",
      group_name: "Marketing",
      members: ["u3"],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
    localStorage.clear();

    // Mock fetch for file shares
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ shares: mockShares.map((share) => ({ share })) }),
    });

    // Mock API calls
    filesApi.fetchUsers.mockResolvedValue(mockUsers);
    filesApi.fetchGroups.mockResolvedValue(mockGroups);
    filesApi.createFileShare.mockResolvedValue({ job_id: "job-123" });
    filesApi.updateFileShare.mockResolvedValue({ success: true });
    filesApi.deleteFileShare.mockResolvedValue({ job_id: "job-456" });

    // Mock window.confirm and alert
    global.confirm = jest.fn(() => true);
    global.alert = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const renderWithRouter = (component, initialEntries = ["/files"]) => {
    return render(
      <MemoryRouter initialEntries={initialEntries}>{component}</MemoryRouter>,
    );
  };

  describe("Initialization and Data Fetching", () => {
    it("should render the page successfully", async () => {
      renderWithRouter(<FilesPage />);

      await waitFor(() => {
        expect(screen.getByTestId("search-field")).toBeInTheDocument();
      });
    });

    it("should fetch file shares on mount", async () => {
      renderWithRouter(<FilesPage />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining("api/file_shares?org_id=test-org-123"),
        );
      });
    });

    it("should fetch users for lookup on mount", async () => {
      renderWithRouter(<FilesPage />);

      await waitFor(() => {
        expect(filesApi.fetchUsers).toHaveBeenCalledWith("test-org-123");
      });
    });

    it("should fetch groups for lookup on mount", async () => {
      renderWithRouter(<FilesPage />);

      await waitFor(() => {
        expect(filesApi.fetchGroups).toHaveBeenCalledWith("test-org-123");
      });
    });

    it("should use localStorage org_id when currentUser org_id is not available", async () => {
      localStorage.setItem("org_id", "stored-org-123");

      const mockAuth = {
        currentUser: null,
        accessToken: "test-token",
      };

      jest
        .spyOn(require("../../context/AuthContext"), "useAuth")
        .mockReturnValue(mockAuth);

      renderWithRouter(<FilesPage />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining("org_id=stored-org-123"),
        );
      });
    });

    it("should handle fetch errors gracefully", async () => {
      global.fetch.mockRejectedValue(new Error("Network error"));
      const consoleError = jest.spyOn(console, "error").mockImplementation();

      renderWithRouter(<FilesPage />);

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith(
          expect.stringContaining("Failed to fetch files"),
          expect.any(Error),
        );
      });

      consoleError.mockRestore();
    });

    it("should handle users fetch errors gracefully", async () => {
      filesApi.fetchUsers.mockRejectedValue(new Error("Users fetch failed"));
      const consoleError = jest.spyOn(console, "error").mockImplementation();

      renderWithRouter(<FilesPage />);

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith(
          expect.stringContaining("Failed to load users"),
          expect.any(Error),
        );
      });

      consoleError.mockRestore();
    });

    it("should handle groups fetch errors gracefully", async () => {
      filesApi.fetchGroups.mockRejectedValue(new Error("Groups fetch failed"));
      const consoleError = jest.spyOn(console, "error").mockImplementation();

      renderWithRouter(<FilesPage />);

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith(
          expect.stringContaining("Failed to load groups"),
          expect.any(Error),
        );
      });

      consoleError.mockRestore();
    });
  });

  describe("Layout Switching", () => {
    it("should start in list layout by default", async () => {
      renderWithRouter(<FilesPage />);

      await waitFor(() => {
        const displayButton = screen.getByTestId("display-button");
        expect(displayButton).toHaveTextContent("list");
      });
    });

    it("should switch to icons layout when display button is clicked", async () => {
      const user = userEvent.setup();
      renderWithRouter(<FilesPage />);

      await waitFor(() => {
        expect(screen.getByTestId("display-button")).toBeInTheDocument();
      });

      const displayButton = screen.getByTestId("display-button");
      await user.click(displayButton);

      await waitFor(() => {
        expect(displayButton).toHaveTextContent("icons");
      });
    });

    it("should render list view with table headers", async () => {
      renderWithRouter(<FilesPage />);

      await waitFor(() => {
        expect(screen.getByText("Name")).toBeInTheDocument();
        expect(screen.getByText("Date Modified")).toBeInTheDocument();
        expect(screen.getByText("Storage")).toBeInTheDocument();
        expect(screen.getByText("Users")).toBeInTheDocument();
        expect(screen.getByText("Groups")).toBeInTheDocument();
      });
    });

    it("should render icons view with path bar", async () => {
      const user = userEvent.setup();
      renderWithRouter(<FilesPage />);

      await waitFor(() => {
        expect(screen.getByTestId("display-button")).toBeInTheDocument();
      });

      const displayButton = screen.getByTestId("display-button");
      await user.click(displayButton);

      await waitFor(() => {
        expect(screen.getAllByText("Root").length).toBeGreaterThan(0);
        expect(screen.getByText("Path")).toBeInTheDocument();
      });
    });
  });

  describe("Search Functionality", () => {
    it("should filter files based on search query", async () => {
      const user = userEvent.setup();
      renderWithRouter(<FilesPage />);

      await waitFor(() => {
        expect(screen.getByTestId("search-field")).toBeInTheDocument();
      });

      const searchField = screen.getByTestId("search-field");
      await user.type(searchField, "Sales");

      expect(searchField).toHaveValue("Sales");
    });

    it("should update search query on input change", async () => {
      const user = userEvent.setup();
      renderWithRouter(<FilesPage />);

      await waitFor(() => {
        expect(screen.getByTestId("search-field")).toBeInTheDocument();
      });

      const searchField = screen.getByTestId("search-field");
      await user.type(searchField, "Marketing");

      expect(searchField).toHaveValue("Marketing");
    });

    it("should clear search when empty string is entered", async () => {
      const user = userEvent.setup();
      renderWithRouter(<FilesPage />);

      await waitFor(() => {
        expect(screen.getByTestId("search-field")).toBeInTheDocument();
      });

      const searchField = screen.getByTestId("search-field");
      await user.type(searchField, "test");
      await user.clear(searchField);

      expect(searchField).toHaveValue("");
    });
  });

  describe("Create File Share", () => {
    it("should open create modal when New Share button is clicked", async () => {
      const user = userEvent.setup();
      renderWithRouter(<FilesPage />);

      await waitFor(() => {
        expect(screen.getByTestId("create-button")).toBeInTheDocument();
      });

      const createButton = screen.getByTestId("create-button");
      await user.click(createButton);

      await waitFor(() => {
        expect(screen.getByTestId("create-modal")).toBeInTheDocument();
      });
    });

    it("should close create modal when close button is clicked", async () => {
      const user = userEvent.setup();
      renderWithRouter(<FilesPage />);

      await waitFor(() => {
        expect(screen.getByTestId("create-button")).toBeInTheDocument();
      });

      const createButton = screen.getByTestId("create-button");
      await user.click(createButton);

      await waitFor(() => {
        expect(screen.getByTestId("create-modal")).toBeInTheDocument();
      });

      const closeButton = screen.getByTestId("modal-close");
      await user.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByTestId("create-modal")).not.toBeInTheDocument();
      });
    });

    it("should create a file share and poll for completion", async () => {
      jest.useFakeTimers();
      const user = userEvent.setup({ delay: null });

      // Mock fetch to return the new share after polling
      let callCount = 0;
      global.fetch.mockImplementation(() => {
        callCount++;
        const hasNewShare = callCount > 2; // Share appears after 2 polls
        return Promise.resolve({
          ok: true,
          json: async () => ({
            shares: hasNewShare
              ? [
                  ...mockShares.map((s) => ({ share: s })),
                  { share: { name: "Test Share", id: "new-1" } },
                ]
              : mockShares.map((s) => ({ share: s })),
          }),
        });
      });

      renderWithRouter(<FilesPage />);

      await waitFor(() => {
        expect(screen.getByTestId("create-button")).toBeInTheDocument();
      });

      const createButton = screen.getByTestId("create-button");
      await user.click(createButton);

      await waitFor(() => {
        expect(screen.getByTestId("create-modal")).toBeInTheDocument();
      });

      const submitButton = screen.getByTestId("modal-submit");
      await user.click(submitButton);

      // Verify create was called
      await waitFor(() => {
        expect(filesApi.createFileShare).toHaveBeenCalledWith({
          orgId: "test-org-123",
          name: "Test Share",
          users: ["user1"],
          groups: ["group1"],
          description: "Test description",
          maxSize: 100,
        });
      });

      // Modal should close immediately
      await waitFor(() => {
        expect(screen.queryByTestId("create-modal")).not.toBeInTheDocument();
      });

      // Advance timers to trigger polling
      act(() => {
        jest.advanceTimersByTime(4000);
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(3); // Initial + polls
      });

      jest.useRealTimers();
    });

    it("should show creating banner during share creation", async () => {
      jest.useFakeTimers();
      const user = userEvent.setup({ delay: null });

      global.fetch.mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: async () => ({ shares: mockShares.map((s) => ({ share: s })) }),
        }),
      );

      renderWithRouter(<FilesPage />);

      await waitFor(() => {
        expect(screen.getByTestId("create-button")).toBeInTheDocument();
      });

      await user.click(screen.getByTestId("create-button"));

      await waitFor(() => {
        expect(screen.getByTestId("create-modal")).toBeInTheDocument();
      });

      await user.click(screen.getByTestId("modal-submit"));

      await waitFor(() => {
        expect(screen.getByText(/Creating Test Share/)).toBeInTheDocument();
      });

      jest.useRealTimers();
    });

    it("should handle create errors gracefully", async () => {
      const user = userEvent.setup();
      filesApi.createFileShare.mockRejectedValue(new Error("Create failed"));

      renderWithRouter(<FilesPage />);

      await waitFor(() => {
        expect(screen.getByTestId("create-button")).toBeInTheDocument();
      });

      await user.click(screen.getByTestId("create-button"));

      await waitFor(() => {
        expect(screen.getByTestId("create-modal")).toBeInTheDocument();
      });

      await user.click(screen.getByTestId("modal-submit"));

      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith(
          "Failed to create share: Create failed",
        );
      });
    });

    it("should timeout polling after max attempts", async () => {
      jest.useFakeTimers();
      const user = userEvent.setup({ delay: null });

      // Mock fetch to never return the new share
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ shares: mockShares.map((s) => ({ share: s })) }),
      });

      renderWithRouter(<FilesPage />);

      await waitFor(() => {
        expect(screen.getByTestId("create-button")).toBeInTheDocument();
      });

      await user.click(screen.getByTestId("create-button"));

      await waitFor(() => {
        expect(screen.getByTestId("create-modal")).toBeInTheDocument();
      });

      await user.click(screen.getByTestId("modal-submit"));

      // Advance timers past max attempts (15 * 2000ms = 30 seconds)
      act(() => {
        jest.advanceTimersByTime(31000);
      });

      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith(
          expect.stringContaining("taking longer than expected"),
        );
      });

      jest.useRealTimers();
    });
  });

  describe("Edit File Share", () => {
    it("should open edit modal when edit button is clicked", async () => {
      const user = userEvent.setup();
      renderWithRouter(<FilesPage />);

      await waitFor(() => {
        const editButtons = screen.getAllByTestId("edit-menu-0");
        expect(editButtons.length).toBeGreaterThan(0);
      });

      const firstEditButton = screen.getAllByTestId("edit-menu-0")[0];
      await user.click(firstEditButton);

      await waitFor(() => {
        expect(screen.getByTestId("edit-modal")).toBeInTheDocument();
      });
    });

    it("should close edit modal when close button is clicked", async () => {
      const user = userEvent.setup();
      renderWithRouter(<FilesPage />);

      await waitFor(() => {
        const editButtons = screen.getAllByTestId("edit-menu-0");
        expect(editButtons.length).toBeGreaterThan(0);
      });

      await user.click(screen.getAllByTestId("edit-menu-0")[0]);

      await waitFor(() => {
        expect(screen.getByTestId("edit-modal")).toBeInTheDocument();
      });

      await user.click(screen.getByTestId("modal-close"));

      await waitFor(() => {
        expect(screen.queryByTestId("edit-modal")).not.toBeInTheDocument();
      });
    });

    it("should update file share on submit", async () => {
      const user = userEvent.setup();
      renderWithRouter(<FilesPage />);

      await waitFor(() => {
        const editButtons = screen.getAllByTestId("edit-menu-0");
        expect(editButtons.length).toBeGreaterThan(0);
      });

      await user.click(screen.getAllByTestId("edit-menu-0")[0]);

      await waitFor(() => {
        expect(screen.getByTestId("edit-modal")).toBeInTheDocument();
      });

      await user.click(screen.getByTestId("modal-submit"));

      await waitFor(() => {
        expect(filesApi.updateFileShare).toHaveBeenCalled();
        expect(global.alert).toHaveBeenCalledWith(
          "File share updated successfully!",
        );
      });
    });

    it("should handle update errors gracefully", async () => {
      const user = userEvent.setup();
      filesApi.updateFileShare.mockRejectedValue(new Error("Update failed"));

      renderWithRouter(<FilesPage />);

      await waitFor(() => {
        const editButtons = screen.getAllByTestId("edit-menu-0");
        expect(editButtons.length).toBeGreaterThan(0);
      });

      await user.click(screen.getAllByTestId("edit-menu-0")[0]);

      await waitFor(() => {
        expect(screen.getByTestId("edit-modal")).toBeInTheDocument();
      });

      await user.click(screen.getByTestId("modal-submit"));

      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith(
          "Failed to update share: Update failed",
        );
      });
    });
  });

  describe("Delete File Share", () => {
    it("should delete file share from edit modal", async () => {
      const user = userEvent.setup();
      renderWithRouter(<FilesPage />);

      await waitFor(() => {
        const editButtons = screen.getAllByTestId("edit-menu-0");
        expect(editButtons.length).toBeGreaterThan(0);
      });

      await user.click(screen.getAllByTestId("edit-menu-0")[0]);

      await waitFor(() => {
        expect(screen.getByTestId("edit-modal")).toBeInTheDocument();
      });

      await user.click(screen.getByTestId("modal-delete"));

      expect(global.confirm).toHaveBeenCalled();

      await waitFor(() => {
        expect(filesApi.deleteFileShare).toHaveBeenCalled();
        expect(global.alert).toHaveBeenCalledWith(
          "File share deleted successfully!",
        );
      });
    });

    it("should not delete if user cancels confirmation", async () => {
      const user = userEvent.setup();
      global.confirm.mockReturnValue(false);

      renderWithRouter(<FilesPage />);

      await waitFor(() => {
        const editButtons = screen.getAllByTestId("edit-menu-0");
        expect(editButtons.length).toBeGreaterThan(0);
      });

      await user.click(screen.getAllByTestId("edit-menu-0")[0]);

      await waitFor(() => {
        expect(screen.getByTestId("edit-modal")).toBeInTheDocument();
      });

      await user.click(screen.getByTestId("modal-delete"));

      expect(global.confirm).toHaveBeenCalled();
      expect(filesApi.deleteFileShare).not.toHaveBeenCalled();
    });

    it("should delete directly from context menu", async () => {
      jest.useFakeTimers();
      const user = userEvent.setup({ delay: null });

      let callCount = 0;
      global.fetch.mockImplementation(() => {
        callCount++;
        const shareRemoved = callCount > 2;
        return Promise.resolve({
          ok: true,
          json: async () => ({
            shares: shareRemoved
              ? [{ share: mockShares[1] }]
              : mockShares.map((s) => ({ share: s })),
          }),
        });
      });

      renderWithRouter(<FilesPage />);

      await waitFor(() => {
        const deleteButtons = screen.getAllByTestId("edit-menu-1");
        expect(deleteButtons.length).toBeGreaterThan(0);
      });

      await user.click(screen.getAllByTestId("edit-menu-1")[0]);

      expect(global.confirm).toHaveBeenCalled();

      await waitFor(() => {
        expect(filesApi.deleteFileShare).toHaveBeenCalled();
      });

      // Advance timers for polling
      act(() => {
        jest.advanceTimersByTime(4000);
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(3);
      });

      jest.useRealTimers();
    });

    it("should show deleting banner during deletion", async () => {
      jest.useFakeTimers();
      const user = userEvent.setup({ delay: null });

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ shares: mockShares.map((s) => ({ share: s })) }),
      });

      renderWithRouter(<FilesPage />);

      await waitFor(() => {
        const deleteButtons = screen.getAllByTestId("edit-menu-1");
        expect(deleteButtons.length).toBeGreaterThan(0);
      });

      await user.click(screen.getAllByTestId("edit-menu-1")[0]);

      await waitFor(() => {
        expect(screen.getByText(/Deleting/)).toBeInTheDocument();
      });

      jest.useRealTimers();
    });

    it("should handle delete errors gracefully", async () => {
      const user = userEvent.setup();
      filesApi.deleteFileShare.mockRejectedValue(new Error("Delete failed"));

      renderWithRouter(<FilesPage />);

      await waitFor(() => {
        const deleteButtons = screen.getAllByTestId("edit-menu-1");
        expect(deleteButtons.length).toBeGreaterThan(0);
      });

      await user.click(screen.getAllByTestId("edit-menu-1")[0]);

      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith(
          "Failed to delete share: Delete failed",
        );
      });
    });
  });

  describe("Refresh Functionality", () => {
    it("should refresh file shares when refresh button is clicked", async () => {
      const user = userEvent.setup();
      renderWithRouter(<FilesPage />);

      await waitFor(() => {
        expect(screen.getByTestId("refresh-button")).toBeInTheDocument();
      });

      global.fetch.mockClear();

      const refreshButton = screen.getByTestId("refresh-button");
      await user.click(refreshButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining("api/file_shares"),
        );
      });
    });
  });

  describe("Selection and Checkboxes", () => {
    it("should toggle select all checkboxes", async () => {
      const user = userEvent.setup();
      renderWithRouter(<FilesPage />);

      await waitFor(() => {
        const checkboxes = screen.getAllByTestId("checkbox");
        expect(checkboxes.length).toBeGreaterThan(0);
      });

      const selectAllCheckbox = screen.getAllByTestId("checkbox")[0];
      await user.click(selectAllCheckbox);

      // All items should be selected
      expect(selectAllCheckbox).toBeChecked();
    });

    it("should toggle individual item selection", async () => {
      const user = userEvent.setup();
      renderWithRouter(<FilesPage />);

      await waitFor(() => {
        const checkboxes = screen.getAllByTestId("checkbox");
        expect(checkboxes.length).toBeGreaterThan(1);
      });

      const firstItemCheckbox = screen.getAllByTestId("checkbox")[1];
      await user.click(firstItemCheckbox);

      expect(firstItemCheckbox).toBeChecked();
    });

    it("should show indeterminate state when some items are selected", async () => {
      const user = userEvent.setup();
      renderWithRouter(<FilesPage />);

      await waitFor(() => {
        const checkboxes = screen.getAllByTestId("checkbox");
        expect(checkboxes.length).toBeGreaterThan(1);
      });

      // Select one item
      const firstItemCheckbox = screen.getAllByTestId("checkbox")[1];
      await user.click(firstItemCheckbox);

      // Select all checkbox should be indeterminate
      const selectAllCheckbox = screen.getAllByTestId("checkbox")[0];
      expect(selectAllCheckbox).toHaveAttribute("data-indeterminate", "true");
    });
  });

  describe("StorageCell Component", () => {
    it("should display storage usage correctly", async () => {
      renderWithRouter(<FilesPage />);

      await waitFor(() => {
        expect(screen.getByText("45 / 100 GB")).toBeInTheDocument();
      });
    });

    it("should show dash when max size is not set", async () => {
      const sharesWithoutMax = [
        {
          id: "share-3",
          name: "No Max",
          kind: "folder",
          users: [],
          groups: [],
          updated_at: "2024-01-15T10:00:00Z",
          current_size: 10,
          max_size: null,
        },
      ];

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          shares: sharesWithoutMax.map((s) => ({ share: s })),
        }),
      });

      renderWithRouter(<FilesPage />);

      await waitFor(() => {
        expect(screen.getByText("-")).toBeInTheDocument();
      });
    });
  });

  describe("Navigation from Dashboard", () => {
    it("should open modal when navigated with openModal state", async () => {
      renderWithRouter(<FilesPage />, [
        { pathname: "/files", state: { openModal: true } },
      ]);

      await waitFor(() => {
        expect(screen.getByTestId("create-modal")).toBeInTheDocument();
      });
    });
  });

  describe("Icons View", () => {
    it("should render icons grid in icons layout", async () => {
      const user = userEvent.setup();
      renderWithRouter(<FilesPage />);

      await waitFor(() => {
        expect(screen.getByTestId("display-button")).toBeInTheDocument();
      });

      await user.click(screen.getByTestId("display-button"));

      await waitFor(() => {
        expect(screen.getAllByText("Root").length).toBeGreaterThan(0);
      });
    });

    it("should navigate up in folder hierarchy", async () => {
      const user = userEvent.setup();
      renderWithRouter(<FilesPage />);

      await waitFor(() => {
        expect(screen.getByTestId("display-button")).toBeInTheDocument();
      });

      await user.click(screen.getByTestId("display-button"));

      await waitFor(() => {
        const upButton = screen.getByText("←");
        expect(upButton).toBeInTheDocument();
      });
    });

    it("should toggle path mode", async () => {
      const user = userEvent.setup();
      renderWithRouter(<FilesPage />);

      await waitFor(() => {
        expect(screen.getByTestId("display-button")).toBeInTheDocument();
      });

      await user.click(screen.getByTestId("display-button"));

      await waitFor(() => {
        const pathButton = screen.getByText("Path");
        expect(pathButton).toBeInTheDocument();
      });

      await user.click(screen.getByText("Path"));

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText(/Type a path like/),
        ).toBeInTheDocument();
      });
    });

    it("should cancel path mode", async () => {
      const user = userEvent.setup();
      renderWithRouter(<FilesPage />);

      await waitFor(() => {
        expect(screen.getByTestId("display-button")).toBeInTheDocument();
      });

      await user.click(screen.getByTestId("display-button"));

      await waitFor(() => {
        expect(screen.getByText("Path")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Path"));

      await waitFor(() => {
        expect(screen.getByText("Cancel")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Cancel"));

      await waitFor(() => {
        expect(screen.queryByText("Cancel")).not.toBeInTheDocument();
      });
    });
  });

  describe("User and Group Lookups", () => {
    it("should build user lookup map correctly", async () => {
      renderWithRouter(<FilesPage />);

      await waitFor(() => {
        expect(filesApi.fetchUsers).toHaveBeenCalled();
      });

      await waitFor(() => {
        const avatarPills = screen.queryAllByTestId("avatar-pill-user");
        expect(avatarPills.length).toBeGreaterThan(0);
      });
    });

    it("should build group lookup map correctly", async () => {
      renderWithRouter(<FilesPage />);

      await waitFor(() => {
        expect(filesApi.fetchGroups).toHaveBeenCalled();
      });

      await waitFor(() => {
        const avatarPills = screen.queryAllByTestId("avatar-pill-group");
        expect(avatarPills.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty shares array", async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ shares: [] }),
      });

      renderWithRouter(<FilesPage />);

      await waitFor(() => {
        expect(screen.getByTestId("search-field")).toBeInTheDocument();
      });

      // Should not crash and should render empty state
      const checkboxes = screen.queryAllByTestId("checkbox");
      expect(checkboxes.length).toBe(1); // Only select-all checkbox
    });

    it("should handle malformed API response", async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      const consoleWarn = jest.spyOn(console, "warn").mockImplementation();
      renderWithRouter(<FilesPage />);

      await waitFor(() => {
        expect(consoleWarn).toHaveBeenCalledWith(
          expect.stringContaining("Unexpected API format"),
          expect.anything(),
        );
      });

      consoleWarn.mockRestore();
    });

    it("should handle users as comma-separated string", async () => {
      const sharesWithStringUsers = [
        {
          id: "share-4",
          name: "String Users",
          kind: "folder",
          users: "user1,user2,user3",
          groups: [],
          updated_at: "2024-01-15T10:00:00Z",
        },
      ];

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          shares: sharesWithStringUsers.map((s) => ({ share: s })),
        }),
      });

      renderWithRouter(<FilesPage />);

      await waitFor(() => {
        expect(screen.getByText("String Users")).toBeInTheDocument();
      });

      // Should render avatar pill with split users
      const avatarPills = screen.queryAllByTestId("avatar-pill-user");
      expect(avatarPills.length).toBeGreaterThan(0);
    });

    it("should handle null or undefined values gracefully", async () => {
      const sharesWithNulls = [
        {
          id: "share-5",
          name: "Null Values",
          kind: "folder",
          users: null,
          groups: undefined,
          updated_at: null,
          current_size: null,
          max_size: null,
        },
      ];

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          shares: sharesWithNulls.map((s) => ({ share: s })),
        }),
      });

      renderWithRouter(<FilesPage />);

      await waitFor(() => {
        expect(screen.getByText("Null Values")).toBeInTheDocument();
      });
    });
  });

  describe("Async Operation Banners", () => {
    it("should show both creating and deleting banners simultaneously", async () => {
      jest.useFakeTimers();
      const user = userEvent.setup({ delay: null });

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ shares: mockShares.map((s) => ({ share: s })) }),
      });

      renderWithRouter(<FilesPage />);

      await waitFor(() => {
        expect(screen.getByTestId("create-button")).toBeInTheDocument();
      });

      // Start create
      await user.click(screen.getByTestId("create-button"));
      await waitFor(() => {
        expect(screen.getByTestId("create-modal")).toBeInTheDocument();
      });
      await user.click(screen.getByTestId("modal-submit"));

      // Start delete
      await waitFor(() => {
        const deleteButtons = screen.getAllByTestId("edit-menu-1");
        expect(deleteButtons.length).toBeGreaterThan(0);
      });
      await user.click(screen.getAllByTestId("edit-menu-1")[0]);

      await waitFor(() => {
        const banner = screen.getByText(/Creating.*Deleting/);
        expect(banner).toBeInTheDocument();
      });

      jest.useRealTimers();
    });

    it("should show circular progress in operation banner", async () => {
      jest.useFakeTimers();
      const user = userEvent.setup({ delay: null });

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ shares: mockShares.map((s) => ({ share: s })) }),
      });

      renderWithRouter(<FilesPage />);

      await waitFor(() => {
        expect(screen.getByTestId("create-button")).toBeInTheDocument();
      });

      await user.click(screen.getByTestId("create-button"));
      await waitFor(() => {
        expect(screen.getByTestId("create-modal")).toBeInTheDocument();
      });
      await user.click(screen.getByTestId("modal-submit"));

      await waitFor(() => {
        expect(screen.getByTestId("circular-progress")).toBeInTheDocument();
      });

      jest.useRealTimers();
    });
  });
});
