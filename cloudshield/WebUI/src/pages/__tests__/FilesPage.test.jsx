import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import FilesPage from "../FilesPage";
import * as filesApi from "../../api/filesApi";

jest.mock("../../lib/analytics", () => ({
  trackButton: jest.fn(),
}));

jest.mock("../../hooks/useClickLogger", () => ({
  useClickLogger: () => () => (fn) => fn,
}));

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

jest.mock("../../api/filesApi", () => ({
  createFileShare: jest.fn(),
  updateFileShare: jest.fn(),
  deleteFileShare: jest.fn(),
  fetchUsers: jest.fn(),
  fetchGroups: jest.fn(),
  fetchFileShares: jest.fn(),
  transformSharesToTree: jest.fn(),
}));

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
    <div>
      <button
        onClick={() => onLayoutChange(layout === "list" ? "icons" : "list")}
        data-testid="display-button"
      >
        {layout}
      </button>
      <button onClick={() => onLayoutChange("cards")} data-testid="display-cards">
        cards
      </button>
    </div>
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
  default: ({ buttonText, onClick }) => (
    <button onClick={onClick} data-testid="create-button">
      {buttonText}
    </button>
  ),
}));

jest.mock("../../components/common/Checkbox/Checkbox", () => ({
  __esModule: true,
  default: ({ checked, onChange, indeterminate, style }) => (
    <input
      type="checkbox"
      checked={checked}
      data-indeterminate={indeterminate}
      onChange={(e) => onChange(e)}
      data-testid="checkbox"
      style={style}
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

jest.mock("../../components/layout/PageShell", () => ({
  __esModule: true,
  default: ({ children }) => <div data-testid="page-shell">{children}</div>,
}));

jest.mock("../../components/table/TableSurface", () => ({
  __esModule: true,
  default: ({ children }) => <div data-testid="table-surface">{children}</div>,
}));

jest.mock("../../components/table/TableSkeleton", () => ({
  __esModule: true,
  default: () => <div data-testid="table-skeleton">Loading table…</div>,
}));

jest.mock("../../components/files/FileShareWizardModal", () => ({
  __esModule: true,
  default: ({ isOpen, onClose, onSubmit, onDelete, file }) => {
    if (!isOpen) return null;
    const submitPayload = file
      ? {
          users: ["user1"],
          groups: ["group1"],
          description: "Test description",
          maxSize: 100,
        }
      : {
          shareName: "Test Share",
          users: ["user1"],
          groups: ["group1"],
          description: "Test description",
          maxSize: 100,
        };

    return (
      <div data-testid={file ? "edit-modal" : "create-modal"}>
        <button onClick={onClose} data-testid="modal-close">
          Close
        </button>
        <button onClick={() => onSubmit(submitPayload)} data-testid="modal-submit">
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
  default: ({ type }) => <div data-testid={`avatar-pill-${type}`} />,
}));

jest.mock("@mui/material/Tooltip", () => ({
  __esModule: true,
  default: ({ children }) => <div>{children}</div>,
}));

jest.mock("@mui/material/CircularProgress", () => ({
  __esModule: true,
  default: () => <div data-testid="circular-progress">Loading…</div>,
}));

jest.mock("../../assets/FolderPlusIcon", () => ({
  __esModule: true,
  default: () => <div data-testid="folder-plus-icon">+</div>,
}));

describe("FilesPage", () => {
  const mockRawShares = [
    {
      share: {
        id: "share-1",
        name: "Sales Docs",
        kind: "folder",
      },
    },
    {
      share: {
        id: "file-1",
        name: "Report.pdf",
        kind: "file",
      },
    },
  ];

  const mockTree = [
    {
      id: "share-1",
      name: "Sales Docs",
      kind: "folder",
      users: ["user1@example.com"],
      groups: ["Sales Team"],
      current_size: 45,
      max_size: 100,
      updated_at: "2024-01-15T10:00:00Z",
      children: [],
    },
    {
      id: "file-1",
      name: "Report.pdf",
      kind: "file",
      size: "5 MB",
      users: ["user2@example.com"],
      groups: ["Sales Team"],
      current_size: 5,
      max_size: 10,
      updated_at: "2024-01-16T10:00:00Z",
      children: [],
    },
  ];

  const mockUsers = [
    { _id: "u1", email: "user1@example.com", full_name: "User One", role: "admin", active: true },
  ];

  const mockGroups = [
    { _id: "g1", name: "Sales Team", group_name: "Sales Team", members: ["u1"] },
  ];

  const renderWithRouter = (entries = ["/files"]) =>
    render(
      <MemoryRouter initialEntries={entries}>
        <FilesPage />
      </MemoryRouter>,
    );

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();

    filesApi.fetchFileShares.mockResolvedValue(mockRawShares);
    filesApi.transformSharesToTree.mockReturnValue(mockTree);
    filesApi.fetchUsers.mockResolvedValue(mockUsers);
    filesApi.fetchGroups.mockResolvedValue(mockGroups);
    filesApi.createFileShare.mockResolvedValue({ job_id: "job-create" });
    filesApi.updateFileShare.mockResolvedValue({ success: true });
    filesApi.deleteFileShare.mockResolvedValue({ job_id: "job-delete" });

    global.confirm = jest.fn(() => true);
    global.alert = jest.fn();
  });

  it("renders toolbar and fetches initial tree", async () => {
    renderWithRouter();

    await waitFor(() => {
      expect(filesApi.fetchFileShares).toHaveBeenCalledWith("test-org-123");
      expect(filesApi.transformSharesToTree).toHaveBeenCalledWith(mockRawShares);
    });

    expect(screen.getByTestId("search-field")).toBeInTheDocument();
    expect(screen.getByTestId("display-button")).toBeInTheDocument();
    expect(screen.getByTestId("refresh-button")).toBeInTheDocument();
    expect(screen.getByTestId("create-button")).toBeInTheDocument();
  });

  it("renders list rows from transformed data", async () => {
    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText("Sales Docs")).toBeInTheDocument();
      expect(screen.getByText("Report.pdf")).toBeInTheDocument();
    });

    expect(screen.getAllByTestId("edit-menu-0").length).toBeGreaterThan(0);
  });

  it("toggles to icons layout", async () => {
    const user = userEvent.setup();
    renderWithRouter();

    await user.click(screen.getByTestId("display-button"));

    await waitFor(() => {
      expect(screen.getByTestId("display-button")).toHaveTextContent("icons");
      expect(screen.getByText("Select all")).toBeInTheDocument();
    });
  });

  it("switches to cards layout", async () => {
    const user = userEvent.setup();
    renderWithRouter();

    await user.click(screen.getByTestId("display-cards"));

    await waitFor(() => {
      expect(screen.getByTestId("display-button")).toHaveTextContent("cards");
    });
  });

  it("opens create modal from toolbar", async () => {
    const user = userEvent.setup();
    renderWithRouter();

    await user.click(screen.getByTestId("create-button"));
    expect(screen.getByTestId("create-modal")).toBeInTheDocument();
  });

  it("opens create modal when navigated with openModal state", async () => {
    renderWithRouter([{ pathname: "/files", state: { openModal: true } }]);

    await waitFor(() => {
      expect(screen.getByTestId("create-modal")).toBeInTheDocument();
    });
  });

  it("opens edit modal from row action and submits update", async () => {
    const user = userEvent.setup();
    renderWithRouter();

    await waitFor(() => {
      expect(screen.getAllByTestId("edit-menu-0").length).toBeGreaterThan(0);
    });

    await user.click(screen.getAllByTestId("edit-menu-0")[0]);
    expect(screen.getByTestId("edit-modal")).toBeInTheDocument();

    await user.click(screen.getByTestId("modal-submit"));

    await waitFor(() => {
      expect(filesApi.updateFileShare).toHaveBeenCalledWith(
        "test-org-123",
        "Sales Docs",
        expect.objectContaining({
          users: ["user1"],
          groups: ["group1"],
          description: "Test description",
        }),
      );
    });
  });

  it("refresh button refetches shares", async () => {
    const user = userEvent.setup();
    renderWithRouter();

    await waitFor(() => {
      expect(filesApi.fetchFileShares).toHaveBeenCalledTimes(1);
    });

    await user.click(screen.getByTestId("refresh-button"));

    await waitFor(() => {
      expect(filesApi.fetchFileShares.mock.calls.length).toBeGreaterThan(1);
    });
  });

  it("shows empty state when transformed tree is empty", async () => {
    filesApi.transformSharesToTree.mockReturnValue([]);
    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText("No shares found")).toBeInTheDocument();
    });
  });

  it("shows load error banner when initial fetch fails", async () => {
    filesApi.fetchFileShares.mockRejectedValueOnce(new Error("Network error"));
    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Network error");
    });
  });

  it("uses localStorage org_id when present", async () => {
    localStorage.setItem("org_id", "local-org-999");
    renderWithRouter();

    await waitFor(() => {
      expect(filesApi.fetchFileShares).toHaveBeenCalledWith("local-org-999");
    });
  });

  it("select-all works in icons layout", async () => {
    const user = userEvent.setup();
    renderWithRouter();

    await user.click(screen.getByTestId("display-button"));
    await waitFor(() => {
      expect(screen.getByText("Select all")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Select all"));

    await waitFor(() => {
      expect(screen.getByText(/selected/)).not.toHaveTextContent("0 selected");
    });
  });
});
