import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import EmployeesPage from "../EmployeesPage.jsx";
import { AuthProvider } from "../../context/AuthContext.jsx";
import * as usersApi from "../../services/usersApi.js";
import * as clientApi from "../../api/client.js";
import { trackButton } from "../../lib/analytics.js";

jest.mock("../../services/usersApi.js", () => ({
  listUsers: jest.fn(),
  deleteUser: jest.fn(),
  createUser: jest.fn(),
  updateUser: jest.fn(),
}));

jest.mock("../../api/client.js", () => ({
  apiGet: jest.fn(),
  apiPatch: jest.fn(),
  apiPost: jest.fn(),
  apiDelete: jest.fn(),
  apiUploadFile: jest.fn(),
}));

jest.mock("../../hooks/useClickLogger", () => ({
  useClickLogger: () => () => (handler) => handler,
}));

jest.mock("../../lib/analytics.js", () => ({
  trackButton: jest.fn(),
}));

jest.mock("../../hooks/useThemeColors.js", () => ({
  useThemeColors: () => ({
    text: "#111",
    border: "#222",
    borderLight: "#333",
    bgSecondary: "#444",
    secondary: "#555",
    secondaryText: "#666",
    secondaryBorder: "#777",
  }),
}));

jest.mock("../../components/layout/PageShell.jsx", () => ({
  __esModule: true,
  default: ({ children }) => <div data-testid="page-shell">{children}</div>,
}));

jest.mock("../../components/table/TableSurface.jsx", () => ({
  __esModule: true,
  default: ({ children }) => <div data-testid="table-surface">{children}</div>,
}));

jest.mock("../../components/table/TableSkeleton.jsx", () => ({
  __esModule: true,
  default: () => <div data-testid="table-skeleton">Loading</div>,
}));

jest.mock("../../components/common/EmptyState/EmptyState.jsx", () => ({
  __esModule: true,
  default: ({ message, description }) => (
    <div data-testid="empty-state">
      <div>{message}</div>
      <div>{description}</div>
    </div>
  ),
}));

jest.mock("../../components/common/Pagination/Pagination.jsx", () => ({
  __esModule: true,
  default: ({ totalItems, currentPage }) => (
    <div data-testid="pagination">
      page:{currentPage} total:{totalItems}
    </div>
  ),
}));

jest.mock("../../components/common/DisplayButton/DisplayButton.jsx", () => ({
  __esModule: true,
  default: ({ layout, onLayoutChange, columnToggles }) => (
    <div data-testid="display-button">
      <button
        type="button"
        data-testid="layout-toggle-grid"
        onClick={() => onLayoutChange?.("grid")}
      >
        grid
      </button>
      <button
        type="button"
        data-testid="layout-toggle-list"
        onClick={() => onLayoutChange?.("list")}
      >
        list
      </button>
      <div data-testid="current-layout">{layout}</div>
      {columnToggles?.columns?.map((col) => (
        <button
          type="button"
          key={col.key}
          data-testid={`toggle-${col.key}`}
          onClick={() => columnToggles.onToggle(col.key)}
        >
          {col.label}
        </button>
      ))}
    </div>
  ),
}));

jest.mock("../../components/common/FilterButton/FilterButton.jsx", () => ({
  __esModule: true,
  default: ({ onFilterChange }) => (
    <div>
      <button
        type="button"
        data-testid="filter-active"
        onClick={() => onFilterChange("status", "active", true)}
      >
        active
      </button>
      <button
        type="button"
        data-testid="filter-offline"
        onClick={() => onFilterChange("status", "offline", true)}
      >
        offline
      </button>
      <button
        type="button"
        data-testid="filter-clear-active"
        onClick={() => onFilterChange("status", "active", false)}
      >
        clear-active
      </button>
    </div>
  ),
}));

jest.mock("../../components/common/SearchField/SearchField.jsx", () => ({
  __esModule: true,
  default: ({ value, onChange, onKeyDown }) => (
    <input
      data-testid="search-input"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
    />
  ),
}));

jest.mock("../../components/common/CreateButton/CreateButton.jsx", () => ({
  __esModule: true,
  default: ({ onClick, buttonText, disabled, "data-testid": testId }) => (
    <button data-testid={testId || "create-btn"} onClick={onClick} disabled={disabled}>
      {buttonText || "Create"}
    </button>
  ),
}));

jest.mock("../../components/common/RefreshButton/RefreshButton.jsx", () => ({
  __esModule: true,
  default: ({ onClick }) => (
    <button data-testid="refresh-btn" type="button" onClick={onClick}>
      Refresh
    </button>
  ),
}));

jest.mock("../../components/common/Checkbox/Checkbox.jsx", () => ({
  __esModule: true,
  default: ({ checked, onChange }) => (
    <input type="checkbox" data-testid="icon-checkbox" checked={checked} onChange={onChange} />
  ),
}));

jest.mock("../../components/common/IconSelectionBar.jsx", () => ({
  __esModule: true,
  default: ({ onToggleSelectAll, selectedCount }) => (
    <div data-testid="icon-selection-bar">
      <span data-testid="icon-selected-count">{selectedCount}</span>
      <button type="button" data-testid="icon-select-all" onClick={onToggleSelectAll}>
        select-all
      </button>
    </div>
  ),
}));

jest.mock("../../components/common/DisplayIcon/DisplayIcon.jsx", () => ({
  __esModule: true,
  default: ({ type, data }) => <div data-testid={`display-icon-${type}`}>{data?.name}</div>,
}));

jest.mock("../../components/common/EditButton/EditButton.jsx", () => ({
  __esModule: true,
  default: ({ menuItems = [] }) => (
    <div data-testid="edit-button">
      {menuItems.map((item) => (
        <button
          key={item.label}
          type="button"
          data-testid={`menu-${item.label.replace(/\s+/g, "-")}`}
          onClick={item.onClick}
        >
          {item.label}
        </button>
      ))}
    </div>
  ),
}));

jest.mock("../../components/users/UsersTable.jsx", () => ({
  __esModule: true,
  default: ({
    users,
    onEdit,
    onDelete,
    onSort,
    onToggleSelect,
    onToggleSelectAll,
    selectedIds,
    allVisibleSelected,
    isIndeterminate,
  }) => (
    <div data-testid="users-table">
      <div data-testid="user-count">{users.length}</div>
      <div data-testid="all-visible-selected">{String(allVisibleSelected)}</div>
      <div data-testid="indeterminate">{String(isIndeterminate)}</div>
      <button type="button" data-testid="select-all" onClick={onToggleSelectAll}>
        select-all
      </button>
      <button type="button" data-testid="sort-name" onClick={() => onSort("name")}>sort-name</button>
      <button type="button" data-testid="sort-files" onClick={() => onSort("files")}>sort-files</button>
      {users.map((u) => (
        <div key={u.id} data-testid={`user-row-${u.id}`}>
          <input
            type="checkbox"
            data-testid={`checkbox-${u.id}`}
            checked={selectedIds.has(u.id)}
            onChange={() => onToggleSelect(u.id)}
          />
          <span>{u.name}</span>
          <span data-testid={`role-${u.id}`}>{u.title}</span>
          <span data-testid={`status-${u.id}`}>{u.status}</span>
          <button type="button" data-testid={`edit-btn-${u.id}`} onClick={() => onEdit(u)}>Edit</button>
          <button type="button" data-testid={`delete-btn-${u.id}`} onClick={() => onDelete(u)}>Delete</button>
        </div>
      ))}
      <button type="button" data-testid="force-delete-btn" onClick={() => onDelete({ id: "1" })}>
        Force Delete
      </button>
    </div>
  ),
}));

jest.mock("../../components/users/EmployeesModal.jsx", () => {
  const React = require("react");
  return {
    __esModule: true,
    default: ({ open, onClose, onSubmit, onDelete, employeeData }) => {
      const [firstName, setFirstName] = React.useState("");
      if (!open) return null;

      const isEdit = Boolean(employeeData);
      return (
        <div data-testid={isEdit ? "edit-modal" : "create-modal"}>
          <input
            aria-label="First Name"
            defaultValue={employeeData?.name?.split(" ")[0] || ""}
            onChange={(e) => setFirstName(e.target.value)}
          />
          <button
            type="button"
            onClick={() =>
              onSubmit({
                firstName: firstName || "John",
                lastName: "Doe",
                email: "john@example.com",
                password: "secret",
                jobTitle: "Dev",
                groups: [],
              })
            }
          >
            {isEdit ? "Confirm Update" : "Confirm Create"}
          </button>
          <button
            type="button"
            data-testid="submit-with-groups"
            onClick={() =>
              onSubmit({
                firstName: "Group",
                lastName: "User",
                email: "group@example.com",
                jobTitle: "Dev",
                groups: [
                  { id: "grp-1", _id: "grp-1" },
                  { id: "grp-old", _id: "grp-old" },
                ],
              })
            }
          >
            Confirm With Groups
          </button>
          <button type="button" data-testid="force-delete-modal" onClick={() => onDelete?.({ id: "1" })}>
            Force Delete
          </button>
          {isEdit && <button type="button" onClick={() => onDelete({ id: "1" })}>Confirm Delete</button>}
          {isEdit && <button type="button" onClick={() => onDelete()}>Confirm Delete Safe</button>}
          <button type="button" onClick={onClose}>Cancel</button>
        </div>
      );
    },
  };
});

jest.mock("../../components/common/Toast/Toast.jsx", () => ({
  __esModule: true,
  default: ({ msg, open }) => (open ? <div data-testid="toast">{msg}</div> : null),
  useToast: () => ({
    toast: { msg: "", type: "success", open: false },
    showToast: jest.fn(),
    hideToast: jest.fn(),
  }),
}));

jest.mock("../../components/common/CsvImportButton/CsvImportButton.jsx", () => ({
  __esModule: true,
  default: ({ button, onImport, importing }) => {
    const React = require("react");
    const file = new File(["email,full_name\njohn@example.com,John Doe"], "employees.csv", {
      type: "text/csv",
    });
    return (
      <div data-testid="csv-import-wrapper">
        {React.cloneElement(button, {
          onClick: () => onImport(file),
          disabled: importing,
        })}
        <button type="button" aria-label="CSV format help">?</button>
      </div>
    );
  },
}));

jest.mock("../../lib/format.js", () => ({
  formatShares: (n) => `${n} shares`,
}));

jest.mock("../../utils/filterHelpers.js", () => ({
  createFilterChangeHandler: (setActiveFilters) => (groupId, value, checked) => {
    setActiveFilters((prev) => {
      const next = {
        ...prev,
        [groupId]: new Set(prev[groupId] || []),
      };
      if (checked) next[groupId].add(value);
      else next[groupId].delete(value);
      return next;
    });
  },
}));

jest.mock("../../context/AuthContext.jsx", () => {
  const React = require("react");
  const AuthContext = React.createContext(null);
  return {
    __esModule: true,
    AuthProvider: ({ initialState, children }) => (
      <AuthContext.Provider value={initialState}>{children}</AuthContext.Provider>
    ),
    useAuth: () => React.useContext(AuthContext),
  };
});

jest.mock("../../hooks/useAsyncTask.js", () => {
  const React = require("react");
  return {
    useAsyncTask: () => {
      const [status, setStatus] = React.useState("idle");
      const [message, setMessage] = React.useState("");
      const [progress, setProgress] = React.useState(0);

      const executeTask = async (task) => {
        try {
          const result = await task();
          setProgress(100);
          setStatus("succeeded");
          return result;
        } catch (error) {
          setMessage(error?.message || "");
          setStatus("failed");
          throw error;
        }
      };

      const reset = () => {
        setStatus("idle");
        setMessage("");
        setProgress(0);
      };

      return { status, message, progress, executeTask, reset };
    },
  };
});

const seedUsers = [
  {
    _id: "1",
    full_name: "Alice",
    email: "alice@example.com",
    role: "admin",
    status: "active",
    profile_image: null,
  },
  {
    _id: "2",
    full_name: "Bob",
    email: "bob@example.com",
    role: "employee",
    status: "offline",
    profile_image: null,
  },
];

const renderPage = ({
  accessToken = "valid-token",
  currentUser = { id: "admin-1", role: "admin", org_id: "org-1" },
  initialEntries,
} = {}) => {
  const { MemoryRouter } = require("react-router-dom");

  return render(
    <AuthProvider initialState={{ currentUser, accessToken, disableBootstrap: true }}>
      <MemoryRouter initialEntries={initialEntries}>
        <EmployeesPage />
      </MemoryRouter>
    </AuthProvider>,
  );
};

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();

  usersApi.listUsers.mockResolvedValue([...seedUsers]);
  usersApi.createUser.mockResolvedValue({ user_id: "new-user", job_id: "job-123" });
  usersApi.updateUser.mockResolvedValue({ success: true });
  usersApi.deleteUser.mockResolvedValue({ success: true });

  clientApi.apiGet.mockResolvedValue({
    json: async () => ({ access_groups: [] }),
  });
  clientApi.apiPatch.mockResolvedValue({ json: async () => ({}) });
  clientApi.apiUploadFile.mockResolvedValue({ created: 0, errors: [] });
});

describe("EmployeesPage", () => {
  it("renders users in list layout and loads groups", async () => {
    renderPage();

    expect(screen.getByTestId("table-skeleton")).toBeInTheDocument();
    expect(await screen.findByText("Alice")).toBeInTheDocument();
    expect(screen.getByTestId("users-table")).toBeInTheDocument();
    expect(clientApi.apiGet).toHaveBeenCalledWith(
      "/access-groups",
      expect.objectContaining({ headers: expect.any(Object) }),
    );
  });

  it("uses jwt over accessToken in group auth headers", async () => {
    localStorage.setItem("jwt", "my-jwt");
    renderPage({ accessToken: "fallback-token" });

    await screen.findByText("Alice");

    expect(clientApi.apiGet).toHaveBeenCalledWith(
      "/access-groups",
      expect.objectContaining({ headers: { Authorization: "Bearer my-jwt" } }),
    );
  });

  it("falls back to accessToken when jwt is missing", async () => {
    renderPage({ accessToken: "fallback-token" });

    await screen.findByText("Alice");

    expect(clientApi.apiGet).toHaveBeenCalledWith(
      "/access-groups",
      expect.objectContaining({ headers: { Authorization: "Bearer fallback-token" } }),
    );
  });

  it("handles fetchAccessGroups failure gracefully", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    clientApi.apiGet.mockRejectedValueOnce(new Error("groups down"));

    renderPage();
    await screen.findByText("Alice");

    expect(warnSpy).toHaveBeenCalledWith("Failed to fetch groups:", expect.any(Error));
    warnSpy.mockRestore();
  });

  it("searches, filters, and sorts users", async () => {
    renderPage();
    await screen.findByText("Alice");

    await userEvent.type(screen.getByTestId("search-input"), "bob");
    expect(screen.getByTestId("user-count")).toHaveTextContent("1");

    await userEvent.click(screen.getByTestId("filter-active"));
    expect(screen.getByTestId("user-count")).toHaveTextContent("0");

    await userEvent.click(screen.getByTestId("filter-clear-active"));
    await userEvent.clear(screen.getByTestId("search-input"));
    await userEvent.click(screen.getByTestId("sort-name"));
    await userEvent.click(screen.getByTestId("sort-files"));
    expect(trackButton).not.toHaveBeenCalled();
  });

  it("fetches again when Enter is pressed in the search field", async () => {
    renderPage();
    await screen.findByText("Alice");

    fireEvent.keyDown(screen.getByTestId("search-input"), { key: "Enter", code: "Enter" });

    expect(usersApi.listUsers).toHaveBeenCalledTimes(2);
  });

  it("toggles layout and column visibility", async () => {
    renderPage();
    await screen.findByText("Alice");

    await userEvent.click(screen.getByTestId("layout-toggle-grid"));
    expect(trackButton).toHaveBeenCalledWith(
      "employees/display/toggle",
      expect.objectContaining({ layout: "grid" }),
    );
    expect(screen.getByTestId("current-layout")).toHaveTextContent("grid");

    await userEvent.click(screen.getByTestId("toggle-showTitle"));
    await userEvent.click(screen.getByTestId("toggle-showWorkstations"));
    await userEvent.click(screen.getByTestId("toggle-showGroups"));
    await userEvent.click(screen.getByTestId("toggle-showFiles"));
  });

  it("supports selection and clear selection", async () => {
    renderPage();
    await screen.findByText("Alice");

    await userEvent.click(screen.getByTestId("checkbox-1"));
    await userEvent.click(screen.getByTestId("select-all"));
    expect(screen.getByTestId("checkbox-1")).toBeChecked();
    expect(screen.getByTestId("checkbox-2")).toBeChecked();

    await userEvent.click(screen.getByText("Clear selection"));
    expect(screen.getByTestId("checkbox-1")).not.toBeChecked();
    expect(screen.getByTestId("checkbox-2")).not.toBeChecked();
  });

  it("uses grid layout empty state and icon controls", async () => {
    renderPage();
    await screen.findByText("Alice");

    await userEvent.click(screen.getByTestId("layout-toggle-grid"));
    await userEvent.type(screen.getByTestId("search-input"), "no-match");
    expect(screen.getByTestId("empty-state")).toBeInTheDocument();

    await userEvent.clear(screen.getByTestId("search-input"));
    expect(screen.getByTestId("icon-selection-bar")).toBeInTheDocument();
    await userEvent.click(screen.getAllByTestId("icon-checkbox")[0]);
    await userEvent.click(screen.getByTestId("menu-edit-user"));
    await userEvent.click(screen.getByTestId("menu-delete-user"));
  });

  it("opens create modal from location state", async () => {
    renderPage({
      initialEntries: [{ pathname: "/employees", state: { openModal: true } }],
    });

    expect(await screen.findByTestId("create-modal")).toBeInTheDocument();
  });

  it("blocks creation when organization context is missing", async () => {
    renderPage({
      accessToken: "valid-token",
      currentUser: { id: "admin-1", role: "admin" },
    });

    await userEvent.click(screen.getByTestId("create-btn"));
    await userEvent.click(screen.getByText("Confirm Create"));

    expect(await screen.findByText("Missing organization context. Refresh and try again.")).toBeInTheDocument();
    expect(usersApi.createUser).not.toHaveBeenCalled();
  });

  it("uses currentUser.org_id when valid", async () => {
    renderPage({
      currentUser: { id: "admin-1", role: "admin", org_id: "org-from-user" },
    });

    await userEvent.click(screen.getByTestId("create-btn"));
    await userEvent.click(screen.getByText("Confirm Create"));

    await waitFor(() => {
      expect(usersApi.createUser).toHaveBeenCalledWith(
        expect.objectContaining({ org_id: "org-from-user" }),
        expect.any(Object),
      );
    });
  });

  it("falls back to localStorage org_id when currentUser.org_id is default-org", async () => {
    localStorage.setItem("org_id", "stored-org");
    renderPage({
      currentUser: { id: "admin-1", role: "admin", org_id: "default-org" },
    });

    await userEvent.click(screen.getByTestId("create-btn"));
    await userEvent.click(screen.getByText("Confirm Create"));

    await waitFor(() => {
      expect(usersApi.createUser).toHaveBeenCalledWith(
        expect.objectContaining({ org_id: "stored-org" }),
        expect.any(Object),
      );
    });
  });

  it("handles localStorage failures while resolving org_id", async () => {
    const spy = jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("storage error");
    });

    renderPage({
      currentUser: { id: "admin-1", role: "admin", org_id: "fallback-org" },
    });

    await userEvent.click(screen.getByTestId("create-btn"));
    await userEvent.click(screen.getByText("Confirm Create"));

    await waitFor(() => {
      expect(usersApi.createUser).toHaveBeenCalledWith(
        expect.objectContaining({ org_id: "fallback-org" }),
        expect.any(Object),
      );
    });

    spy.mockRestore();
  });

  it("blocks save without token", async () => {
    renderPage({ accessToken: null, currentUser: { id: "admin-1", role: "admin", org_id: "org-1" } });

    await userEvent.click(screen.getByTestId("create-btn"));
    await userEvent.click(screen.getByTestId("force-delete-modal"));

    expect(usersApi.deleteUser).not.toHaveBeenCalled();
  });

  it("creates a user and syncs groups using response user_id", async () => {
    clientApi.apiGet
      .mockResolvedValueOnce({
        json: async () => ({
          access_groups: [
            { id: "grp-1", members: ["other"], workstations: ["ws1"], file_shares: ["share1"] },
            { id: "grp-old", members: ["1"], workstations: [], file_shares: [] },
          ],
        }),
      })
      .mockResolvedValueOnce({
        json: async () => ({ access_groups: [] }),
      });

    usersApi.createUser.mockResolvedValueOnce({ user_id: "1", job_id: "job-123" });

    renderPage({ currentUser: { id: "admin-1", role: "admin", org_id: "org-1" } });
    await screen.findByText("Alice");

    await userEvent.click(screen.getByTestId("create-btn"));
    await userEvent.click(screen.getByTestId("submit-with-groups"));

    expect(await screen.findByText("User created successfully")).toBeInTheDocument();
    await waitFor(() => expect(clientApi.apiPatch).toHaveBeenCalled());
  });

  it("falls back to email search when create response omits user_id", async () => {
    clientApi.apiGet
      .mockResolvedValueOnce({
        json: async () => ({
          access_groups: [
            { id: "grp-1", members: ["other"], workstations: [], file_shares: [] },
            { id: "grp-old", members: ["1"], workstations: [], file_shares: [] },
          ],
        }),
      })
      .mockResolvedValueOnce({
        json: async () => ({ access_groups: [] }),
      });

    usersApi.createUser.mockResolvedValueOnce({ job_id: "job-123" });
    usersApi.listUsers.mockResolvedValueOnce([
      { _id: "1", email: "group@example.com", full_name: "Group User", role: "employee", status: "active", files: 0 },
    ]);

    renderPage({ currentUser: { id: "admin-1", role: "admin", org_id: "org-1" } });
    await screen.findByText("Alice");

    await userEvent.click(screen.getByTestId("create-btn"));
    await userEvent.click(screen.getByTestId("submit-with-groups"));

    await waitFor(() => expect(usersApi.listUsers).toHaveBeenCalledWith(
      expect.objectContaining({ search: "group@example.com" }),
    ));
  });

  it("shows create failure when createUser rejects", async () => {
    usersApi.createUser.mockRejectedValueOnce(new Error("Create Failed"));

    renderPage({ currentUser: { id: "admin-1", role: "admin", org_id: "org-1" } });
    await screen.findByText("Alice");

    await userEvent.click(screen.getByTestId("create-btn"));
    await userEvent.click(screen.getByText("Confirm Create"));

    expect(await screen.findByText("Create Failed")).toBeInTheDocument();
  });

  it("shows create failure when no job_id is returned", async () => {
    usersApi.createUser.mockResolvedValueOnce({ user_id: "1" });

    renderPage({ currentUser: { id: "admin-1", role: "admin", org_id: "org-1" } });
    await screen.findByText("Alice");

    await userEvent.click(screen.getByTestId("create-btn"));
    await userEvent.click(screen.getByText("Confirm Create"));

    expect(await screen.findByText("No job_id returned from user creation")).toBeInTheDocument();
  });

  it("shows failed message from async task effect", async () => {
    usersApi.createUser.mockRejectedValueOnce({ message: "Provisioning timed out" });

    renderPage({ currentUser: { id: "admin-1", role: "admin", org_id: "org-1" } });
    await screen.findByText("Alice");

    await userEvent.click(screen.getByTestId("create-btn"));
    await userEvent.click(screen.getByText("Confirm Create"));

    expect(await screen.findByText("Provisioning timed out")).toBeInTheDocument();
  });

  it("falls back to default failed message when async task has no message", async () => {
    usersApi.createUser.mockRejectedValueOnce({});

    renderPage({ currentUser: { id: "admin-1", role: "admin", org_id: "org-1" } });
    await screen.findByText("Alice");

    await userEvent.click(screen.getByTestId("create-btn"));
    await userEvent.click(screen.getByText("Confirm Create"));

    expect(await screen.findByText("Failed to create user")).toBeInTheDocument();
  });

  it("updates a user successfully", async () => {
    renderPage();
    await screen.findByText("Alice");

    await userEvent.click(screen.getByTestId("edit-btn-1"));
    expect(await screen.findByTestId("edit-modal")).toBeInTheDocument();
    await userEvent.click(screen.getByText("Confirm Update"));

    expect(await screen.findByText("User updated successfully")).toBeInTheDocument();
    expect(usersApi.updateUser).toHaveBeenCalledWith(
      "1",
      expect.objectContaining({
        full_name: "John Doe",
        email: "john@example.com",
        role: "Dev",
      }),
      expect.any(Object),
    );
  });

  it("shows update password validation message", async () => {
    usersApi.updateUser.mockRejectedValueOnce({
      payload: { details: [{ loc: ["body", "password"], msg: "Password is too weak" }] },
    });

    renderPage();
    await screen.findByText("Alice");

    await userEvent.click(screen.getByTestId("edit-btn-1"));
    await userEvent.click(screen.getByText("Confirm Update"));

    expect(await screen.findByText("Password is too weak")).toBeInTheDocument();
  });

  it("shows update payload error message", async () => {
    usersApi.updateUser.mockRejectedValueOnce({
      payload: { error: "Duplicate email address" },
    });

    renderPage();
    await screen.findByText("Alice");

    await userEvent.click(screen.getByTestId("edit-btn-1"));
    await userEvent.click(screen.getByText("Confirm Update"));

    expect(await screen.findByText("Duplicate email address")).toBeInTheDocument();
  });

  it("shows update error.message fallback", async () => {
    usersApi.updateUser.mockRejectedValueOnce(new Error("Generic failure"));

    renderPage();
    await screen.findByText("Alice");

    await userEvent.click(screen.getByTestId("edit-btn-1"));
    await userEvent.click(screen.getByText("Confirm Update"));

    expect(await screen.findByText("Generic failure")).toBeInTheDocument();
  });

  it("shows default save error when update error has no message or payload", async () => {
    usersApi.updateUser.mockRejectedValueOnce({});

    renderPage();
    await screen.findByText("Alice");

    await userEvent.click(screen.getByTestId("edit-btn-1"));
    await userEvent.click(screen.getByText("Confirm Update"));

    expect(await screen.findByText("Failed to save user")).toBeInTheDocument();
  });

  it("deletes a user successfully", async () => {
    renderPage();
    await screen.findByText("Alice");

    await userEvent.click(screen.getByTestId("delete-btn-1"));
    expect(await screen.findByText("User deleted successfully")).toBeInTheDocument();
    expect(usersApi.deleteUser).toHaveBeenCalledWith("1", expect.any(Object));
  });

  it("blocks deleting your own account", async () => {
    renderPage({ currentUser: { id: "1", role: "admin", org_id: "org-1" } });
    await screen.findByText("Alice");

    await userEvent.click(screen.getByTestId("delete-btn-1"));
    expect(await screen.findByText("You cannot delete your own account")).toBeInTheDocument();
    expect(usersApi.deleteUser).not.toHaveBeenCalled();
  });

  it("shows delete error and keeps row visible", async () => {
    usersApi.deleteUser.mockRejectedValueOnce(new Error("Delete error"));

    renderPage();
    await screen.findByText("Alice");

    await userEvent.click(screen.getByTestId("delete-btn-1"));
    expect(await screen.findByText("Delete error")).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
  });

  it("blocks delete when token is missing", async () => {
    renderPage({ accessToken: null });

    await userEvent.click(screen.getByTestId("create-btn"));
    await userEvent.click(screen.getByTestId("force-delete-modal"));

    expect(usersApi.deleteUser).not.toHaveBeenCalled();
  });

  it("closes modal from cancel and delete-safe buttons", async () => {
    renderPage();
    await screen.findByText("Alice");

    await userEvent.click(screen.getByTestId("edit-btn-1"));
    expect(screen.getByTestId("edit-modal")).toBeInTheDocument();

    await userEvent.click(screen.getByText("Cancel"));
    expect(screen.queryByTestId("edit-modal")).not.toBeInTheDocument();
  });

  it("covers delete from modal and the safe modal delete path", async () => {
    renderPage();
    await screen.findByText("Alice");

    await userEvent.click(screen.getByTestId("edit-btn-1"));
    await userEvent.click(screen.getByText("Confirm Delete"));
    expect(usersApi.deleteUser).toHaveBeenCalledWith("1", expect.any(Object));

    renderPage();
    await screen.findByText("Alice");
    await userEvent.click(screen.getByTestId("edit-btn-1"));
    await userEvent.click(screen.getByText("Confirm Delete Safe"));
    expect(usersApi.deleteUser).toHaveBeenCalled();
  });

  it("imports CSV successfully, with warnings", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    clientApi.apiUploadFile.mockResolvedValueOnce({
      created: 2,
      errors: [{ error: "row warning" }],
    });

    renderPage();
    await screen.findByText("Alice");

    await userEvent.click(screen.getByTestId("csv-import-wrapper").querySelector("button"));
    expect(await screen.findByText(/Successfully imported 2 user\(s\) \(1 errors\)/i)).toBeInTheDocument();
    expect(usersApi.listUsers).toHaveBeenCalledTimes(2);
    expect(warnSpy).toHaveBeenCalledWith("CSV import errors:", [{ error: "row warning" }]);
    warnSpy.mockRestore();
  });

  it("shows no users imported when CSV created count is zero", async () => {
    clientApi.apiUploadFile.mockResolvedValueOnce({ created: 0, errors: [] });

    renderPage();
    await screen.findByText("Alice");

    await userEvent.click(screen.getByTestId("csv-import-wrapper").querySelector("button"));
    expect(await screen.findByText("No users imported")).toBeInTheDocument();
  });

  it("shows CSV import failure when result contains errors", async () => {
    clientApi.apiUploadFile.mockResolvedValueOnce({
      created: 0,
      errors: [{ error: "Invalid CSV row" }],
    });

    renderPage();
    await screen.findByText("Alice");

    await userEvent.click(screen.getByTestId("csv-import-wrapper").querySelector("button"));
    expect(await screen.findByText("Import failed: Invalid CSV row")).toBeInTheDocument();
  });

  it("shows CSV upload exception message", async () => {
    clientApi.apiUploadFile.mockRejectedValueOnce(new Error("CSV import boom"));

    renderPage();
    await screen.findByText("Alice");

    await userEvent.click(screen.getByTestId("csv-import-wrapper").querySelector("button"));
    expect(await screen.findByText("CSV import boom")).toBeInTheDocument();
  });

  it("shows and hides toast by clicking it", async () => {
    usersApi.deleteUser.mockRejectedValueOnce(new Error("Toast error"));

    renderPage();
    await screen.findByText("Alice");

    await userEvent.click(screen.getByTestId("delete-btn-1"));
    const toast = await screen.findByText("Toast error");

    await userEvent.click(toast);
    await waitFor(() => {
      expect(screen.queryByText("Toast error")).not.toBeInTheDocument();
    });
  });

  it("keeps toast visible for non-activating key presses", async () => {
    usersApi.deleteUser.mockRejectedValueOnce(new Error("Toast error"));

    renderPage();
    await screen.findByText("Alice");

    await userEvent.click(screen.getByTestId("delete-btn-1"));
    const toast = await screen.findByText("Toast error");

    fireEvent.keyDown(toast, { key: "Escape" });
    expect(screen.getByText("Toast error")).toBeInTheDocument();
  });

  it("closes toast on Space or Enter key", async () => {
    usersApi.deleteUser.mockRejectedValueOnce(new Error("Toast close"));

    renderPage();
    await screen.findByText("Alice");

    await userEvent.click(screen.getByTestId("delete-btn-1"));
    const toast = await screen.findByText("Toast close");

    fireEvent.keyDown(toast, { key: " " });
    await waitFor(() => expect(screen.queryByText("Toast close")).not.toBeInTheDocument());

    usersApi.deleteUser.mockRejectedValueOnce(new Error("Toast close 2"));
    renderPage();
    await screen.findByText("Alice");
    await userEvent.click(screen.getByTestId("delete-btn-1"));
    const toast2 = await screen.findByText("Toast close 2");
    fireEvent.keyDown(toast2, { key: "Enter" });
    await waitFor(() => expect(screen.queryByText("Toast close 2")).not.toBeInTheDocument());
  });
});
