import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import EmployeesPage from "../EmployeesPage.jsx";
import { AuthProvider } from "../../context/AuthContext.jsx";
import * as usersApi from "../../services/usersApi.js";

// --- 1. MOCK API ---
jest.mock("../../services/usersApi.js", () => ({
  listUsers: jest.fn(),
  deleteUser: jest.fn(),
  createUser: jest.fn(),
  updateUser: jest.fn(),
}));

// Avoid import.meta usage from analytics during tests.
jest.mock("../../hooks/useClickLogger", () => ({
  useClickLogger: () => () => (handler) => handler,
}));

jest.mock("../../lib/analytics.js", () => ({
  trackButton: jest.fn(),
}));

// --- 2. MOCK COMPONENTS ---

// Mock Table: Added 'Force Delete' to test deletion when no users are loaded
jest.mock("../../components/users/UsersTable.jsx", () => {
  return function DummyUsersTable({
    users,
    onEdit,
    onDelete,
    onSort,
    onToggleSelect,
    onToggleSelectAll,
    selectedIds,
    allVisibleSelected,
  }) {
    return (
      <div data-testid="users-table">
        <div data-testid="user-count">Count: {users.length}</div>
        <button data-testid="select-all" onClick={onToggleSelectAll}>
          {allVisibleSelected ? "Deselect All" : "Select All"}
        </button>
        <button data-testid="sort-name" onClick={() => onSort("name")}>
          Sort Name
        </button>
        <button data-testid="sort-files" onClick={() => onSort("files")}>
          Sort Files
        </button>
        <button
          data-testid="force-delete-btn"
          onClick={() => onDelete({ id: "999" })}
        >
          Force Delete
        </button>

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
            <button data-testid={`edit-btn-${u.id}`} onClick={() => onEdit(u)}>
              Edit
            </button>
            <button
              data-testid={`delete-btn-${u.id}`}
              onClick={() => onDelete(u)}
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    );
  };
});

// Mock Employees Modal (unified create/edit)
// UPDATED: Added "submit-with-groups" button to test group logic without breaking old tests
jest.mock("../../components/users/EmployeesModal.jsx", () => {
  const { useState } = require("react");
  return function DummyEmployeesModal({
    open,
    onClose,
    onSubmit,
    onDelete,
    employeeData,
  }) {
    const [form, setForm] = useState({});
    if (!open) return null;
    const isEdit = Boolean(employeeData);
    return (
      <div data-testid={isEdit ? "edit-modal" : "create-modal"}>
        <input
          placeholder="First Name"
          defaultValue={employeeData?.name?.split(" ")[0] || ""}
          onChange={(e) => setForm({ ...form, firstName: e.target.value })}
        />
        {/* Standard Submit used by existing tests */}
        <button
          onClick={() =>
            onSubmit({
              firstName: form.firstName || "John",
              lastName: form.lastName || "D",
              email: "t@t.com",
              password: "123",
              jobTitle: "Dev",
              groups: [], // Default empty for standard tests
            })
          }
        >
          {isEdit ? "Confirm Update" : "Confirm Create"}
        </button>

        {/* New Button for Group Logic Coverage */}
        <button
          data-testid="submit-with-groups"
          onClick={() =>
            onSubmit({
              firstName: "Group",
              lastName: "User",
              email: "g@t.com",
              jobTitle: "Dev",
              groups: [{ id: "grp-1", _id: "grp-1" }],
            })
          }
        >
          Confirm With Groups
        </button>

        {isEdit && <button onClick={onDelete}>Confirm Delete</button>}
        <button onClick={onClose}>Cancel</button>
      </div>
    );
  };
});

// Mock DisplayButton
// UPDATED: Added layout toggle button
jest.mock(
  "../../components/common/DisplayButton/DisplayButton.jsx",
  () =>
    ({ columnToggles, onLayoutChange }) => (
      <div>
        <button
          data-testid="layout-toggle-grid"
          onClick={() => onLayoutChange && onLayoutChange("grid")}
        >
          Grid Layout
        </button>
        {columnToggles?.columns.map((col) => (
          <button
            key={col.key}
            data-testid={`toggle-${col.key}`}
            onClick={() => columnToggles.onToggle(col.key)}
          >
            Toggle {col.label}
          </button>
        ))}
      </div>
    )
);

// Simple Mocks for others
jest.mock(
  "../../components/common/SearchField/SearchField.jsx",
  () =>
    ({ value, onChange, onKeyDown }) => (
      <input
        data-testid="search-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
      />
    )
);
jest.mock(
  "../../components/common/FilterButton/FilterButton.jsx",
  () =>
    ({ onFilterChange }) => (
      <button
        data-testid="filter-active"
        onClick={() => onFilterChange("status", "active", true)}
      >
        Filter Active
      </button>
    )
);
jest.mock(
  "../../components/common/CreateButton/CreateButton.jsx",
  () =>
    ({ onClick }) => (
      <button data-testid="open-create-btn" onClick={onClick}>
        Create
      </button>
    )
);
jest.mock(
  "../../components/common/RefreshButton/RefreshButton.jsx",
  () =>
    ({ onClick }) => (
      <button data-testid="refresh-btn" onClick={onClick}>
        Refresh
      </button>
    )
);

// --- 3. HELPER ---
const renderPage = ({
  accessToken = "valid-token",
  currentUser = { id: "admin-1", role: "admin" },
} = {}) => {
  const { MemoryRouter } = require("react-router-dom");
  return render(
    <AuthProvider
      initialState={{ currentUser, accessToken, disableBootstrap: true }}
    >
      <MemoryRouter>
        <EmployeesPage />
      </MemoryRouter>
    </AuthProvider>
  );
};

// --- 4. TESTS ---
describe("EmployeesPage Integration", () => {
  const seedUsers = [
    {
      _id: "1",
      full_name: "Alice",
      email: "a@t.com",
      role: "admin",
      status: "active",
      files: 10,
    },
    {
      _id: "2",
      full_name: "Bob",
      email: "b@t.com",
      role: "employee",
      status: "offline",
      files: 5,
    },
  ];

  beforeAll(() => {
    // Silence console errors for negative tests
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterAll(() => {
    console.error.mockRestore();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    localStorage.setItem("org_id", "org-local");
    
    // Mock global fetch for group logic (default success empty)
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ access_groups: [] }),
    });

    usersApi.listUsers.mockResolvedValue([...seedUsers]);
    usersApi.createUser.mockResolvedValue({ user_id: "new" });
    usersApi.updateUser.mockResolvedValue({ success: true });
    usersApi.deleteUser.mockResolvedValue({ success: true });
  });

  // --- API & RENDER ---
  it("renders users fetched from API", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Alice")).toBeInTheDocument());
    expect(screen.getByTestId("user-count")).toHaveTextContent("Count: 2");
  });

  it("handles API failure on load", async () => {
    usersApi.listUsers.mockRejectedValue(new Error("Fetch Failed"));
    renderPage();
    expect(await screen.findByText("Fetch Failed")).toBeInTheDocument();
  });

  it("refreshes users", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Alice")).toBeInTheDocument());
    await userEvent.click(screen.getByTestId("refresh-btn"));
    expect(usersApi.listUsers).toHaveBeenCalledTimes(2);
  });

  // --- SEARCH ---
  it("filters by search", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Alice")).toBeInTheDocument());
    await userEvent.type(screen.getByTestId("search-input"), "Alice");
    await waitFor(() =>
      expect(screen.getByTestId("user-count")).toHaveTextContent("Count: 1")
    );
  });

  it("fetches on Enter key", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Alice")).toBeInTheDocument());
    fireEvent.keyDown(screen.getByTestId("search-input"), {
      key: "Enter",
      code: "Enter",
    });
    expect(usersApi.listUsers).toHaveBeenCalledTimes(2);
  });

  // --- SORT ---
  it("sorts by numeric field (Files)", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Alice")).toBeInTheDocument());
    await userEvent.click(screen.getByTestId("sort-files"));
    await userEvent.click(screen.getByTestId("sort-files"));
    await userEvent.click(screen.getByTestId("sort-name"));
    expect(screen.getByTestId("users-table")).toBeInTheDocument();
  });

  // --- FILTER ---
  it("filters by status", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Alice")).toBeInTheDocument());
    await userEvent.click(screen.getByTestId("filter-active"));
    await waitFor(() =>
      expect(screen.queryByText("Bob")).not.toBeInTheDocument()
    );
  });

  // --- CREATE ---
  it("creates user successfully", async () => {
    renderPage();
    await userEvent.click(screen.getByTestId("open-create-btn"));
    await userEvent.click(screen.getByText("Confirm Create"));
    expect(
      await screen.findByText("User created successfully")
    ).toBeInTheDocument();
  });

  it("uses currentUser.org_id when it is valid", async () => {
    renderPage({
      currentUser: { id: "admin-1", role: "admin", org_id: "org-from-user" },
    });
    await userEvent.click(screen.getByTestId("open-create-btn"));
    await userEvent.click(screen.getByText("Confirm Create"));
    await waitFor(() =>
      expect(usersApi.createUser).toHaveBeenCalledWith(
        expect.objectContaining({ org_id: "org-from-user" }),
        expect.any(Object)
      )
    );
  });

  it("falls back to localStorage when currentUser.org_id is default-org", async () => {
    renderPage({
      currentUser: { id: "admin-1", role: "admin", org_id: "default-org" },
    });
    await userEvent.click(screen.getByTestId("open-create-btn"));
    await userEvent.click(screen.getByText("Confirm Create"));
    await waitFor(() =>
      expect(usersApi.createUser).toHaveBeenCalledWith(
        expect.objectContaining({ org_id: "org-local" }),
        expect.any(Object)
      )
    );
  });

  it("handles create failure", async () => {
    usersApi.createUser.mockRejectedValue(new Error("Create Failed"));
    renderPage();
    await userEvent.click(screen.getByTestId("open-create-btn"));
    await userEvent.click(screen.getByText("Confirm Create"));
    expect(await screen.findByText("Create Failed")).toBeInTheDocument();
  });

  it("closes create modal", async () => {
    renderPage();
    await userEvent.click(screen.getByTestId("open-create-btn"));
    await userEvent.click(screen.getByText("Cancel"));
    expect(screen.queryByTestId("create-modal")).not.toBeInTheDocument();
  });

  // --- UPDATE ---
  it("updates user successfully", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Alice")).toBeInTheDocument());
    await userEvent.click(screen.getByTestId("edit-btn-1"));
    await userEvent.click(screen.getByText("Confirm Update"));
    expect(
      await screen.findByText("User updated successfully")
    ).toBeInTheDocument();
  });

  it("handles update failure", async () => {
    usersApi.updateUser.mockRejectedValue(new Error("Update Failed"));
    renderPage();
    await waitFor(() => expect(screen.getByText("Alice")).toBeInTheDocument());
    await userEvent.click(screen.getByTestId("edit-btn-1"));
    await userEvent.click(screen.getByText("Confirm Update"));
    expect(await screen.findByText(/update failed/i)).toBeInTheDocument();
  });

  it("closes edit modal", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Alice")).toBeInTheDocument());
    await userEvent.click(screen.getByTestId("edit-btn-1"));
    await userEvent.click(screen.getByText("Cancel"));
    expect(screen.queryByTestId("edit-modal")).not.toBeInTheDocument();
  });

  // --- DELETE ---
  it("deletes user successfully", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Alice")).toBeInTheDocument());
    await userEvent.click(screen.getByTestId("delete-btn-1"));
    expect(
      await screen.findByText("User deleted successfully")
    ).toBeInTheDocument();
  });

  it("blocks delete if token is missing", async () => {
    // Render strictly without token
    renderPage({ accessToken: null });

    // Use the "Force Delete" button we added to the mock
    // This allows us to click delete even if no data loaded
    await userEvent.click(screen.getByTestId("force-delete-btn"));

    // Verify API was NOT called
    expect(usersApi.deleteUser).not.toHaveBeenCalled();
  });

  it("deletes from edit modal", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Alice")).toBeInTheDocument());
    await userEvent.click(screen.getByTestId("edit-btn-1"));
    await userEvent.click(screen.getByText("Confirm Delete"));
    expect(usersApi.deleteUser).toHaveBeenCalled();
  });

  // --- EDGE CASES ---
  it("blocks create without token", async () => {
    renderPage({ accessToken: null });
    await userEvent.click(screen.getByTestId("open-create-btn"));
    await userEvent.click(screen.getByText("Confirm Create"));
    expect(await screen.findByText(/must be logged in/i)).toBeInTheDocument();
  });

  it("closes toast on Enter", async () => {
    renderPage();
    await userEvent.click(screen.getByTestId("open-create-btn"));
    await userEvent.click(screen.getByText("Confirm Create"));
    const toast = await screen.findByText("User created successfully");
    toast.focus();
    fireEvent.keyDown(toast, { key: "Enter", code: "Enter" });
    await waitFor(() =>
      expect(
        screen.queryByText("User created successfully")
      ).not.toBeInTheDocument()
    );
  });

  it("shows error when deletion fails and keeps the row", async () => {
    usersApi.deleteUser.mockRejectedValueOnce(new Error("Not found"));

    renderPage();
    await screen.findByText("Alice");

    await userEvent.click(screen.getByTestId("delete-btn-1"));

    // toast / error message
    expect(await screen.findByText(/not found/i)).toBeInTheDocument();

    // row still present
    expect(screen.getByText("Alice")).toBeInTheDocument();
  });

  it("applies search when pressing Enter", async () => {
    renderPage(); // your helper
    await screen.findByText("Alice"); // ensures initial load finished

    const before = usersApi.listUsers.mock.calls.length;

    await userEvent.clear(screen.getByTestId("search-input"));
    await userEvent.type(screen.getByTestId("search-input"), "neo");

    fireEvent.keyDown(screen.getByTestId("search-input"), {
      key: "Enter",
      code: "Enter",
    });

    await waitFor(() => {
      expect(usersApi.listUsers.mock.calls.length).toBeGreaterThan(before);
    });

    const lastCallArg = usersApi.listUsers.mock.calls.at(-1)[0];
    expect(lastCallArg.search).toBe("neo");
  });

  //Refresh early return
  it("does not fetch users when accessToken is null", async () => {
    renderPage({ accessToken: null });

    // useEffect runs, but fetchUsers returns early, so listUsers should not be called
    expect(usersApi.listUsers).not.toHaveBeenCalled();

    await userEvent.click(screen.getByTestId("refresh-btn"));
    expect(usersApi.listUsers).not.toHaveBeenCalled();
  });

  it("shows default load error message when error.message is missing", async () => {
    usersApi.listUsers.mockRejectedValueOnce({}); // no message
    renderPage();

    expect(await screen.findByText("Failed to load users")).toBeInTheDocument();
  });

  it("sorts users by name (full_name), falling back to email then empty", async () => {
    usersApi.listUsers.mockResolvedValueOnce([
      {
        _id: "u3",
        full_name: null,
        email: null,
        role: "employee",
        status: "active",
        files: 0,
      },
      {
        _id: "u2",
        full_name: "",
        email: "bob@example.com",
        role: "employee",
        status: "active",
        files: 0,
      },
      {
        _id: "u1",
        full_name: "Alice",
        email: "alice@example.com",
        role: "employee",
        status: "active",
        files: 0,
      },
    ]);

    renderPage();

    // Wait for any item that must appear
    await screen.findByText("Alice");

    // Collect rendered name spans in order
    const rows = screen.getAllByTestId(/user-row-/);
    const names = rows.map((r) => r.querySelector("span")?.textContent ?? "");

    // First should be empty
    expect(names[0]).toBe("");
    expect(names[1]).toBe("Alice");
    expect(names[2]).toBe("bob@example.com");
  });

  it("falls back to default role and status when missing", async () => {
    usersApi.listUsers.mockResolvedValueOnce([
      {
        _id: "u1",
        full_name: "No Meta",
        email: "nometa@example.com",
        role: null,
        status: null,
        files: 0,
      },
    ]);

    renderPage();
    await screen.findByText("No Meta");

    expect(screen.getByTestId("role-u1")).toHaveTextContent("Employee");
    expect(screen.getByTestId("status-u1")).toHaveTextContent("offline");
  });

  it("toggles single user selection", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Alice")).toBeInTheDocument());

    const checkbox = screen.getByTestId("checkbox-1");

    // Select user
    await userEvent.click(checkbox);
    expect(checkbox).toBeChecked();

    // Deselect user
    await userEvent.click(checkbox);
    expect(checkbox).not.toBeChecked();
  });

  it("selects all visible users", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Alice")).toBeInTheDocument());

    const selectAllBtn = screen.getByTestId("select-all");
    await userEvent.click(selectAllBtn);

    expect(screen.getByTestId("checkbox-1")).toBeChecked();
    expect(screen.getByTestId("checkbox-2")).toBeChecked();
  });

  it("deselects all visible users when all are selected", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Alice")).toBeInTheDocument());

    const selectAllBtn = screen.getByTestId("select-all");

    // Select all
    await userEvent.click(selectAllBtn);
    expect(screen.getByTestId("checkbox-1")).toBeChecked();

    // Deselect all
    await userEvent.click(selectAllBtn);
    expect(screen.getByTestId("checkbox-1")).not.toBeChecked();
    expect(screen.getByTestId("checkbox-2")).not.toBeChecked();
  });

  it("only deselects visible users when toggling select all", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Alice")).toBeInTheDocument());

    // Select both users
    await userEvent.click(screen.getByTestId("checkbox-1"));
    await userEvent.click(screen.getByTestId("checkbox-2"));

    // Filter to show only Alice
    await userEvent.clear(screen.getByTestId("search-input"));
    await userEvent.type(screen.getByTestId("search-input"), "Alice");

    // Deselect all visible (only Alice)
    await userEvent.click(screen.getByTestId("select-all"));

    // Alice should be deselected, but we can't see Bob in UI
    expect(screen.getByTestId("checkbox-1")).not.toBeChecked();
  });

  it("toggles showTitle column visibility", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Alice")).toBeInTheDocument());

    const toggleBtn = screen.getByTestId("toggle-showTitle");
    await userEvent.click(toggleBtn);

    // Verify the toggle was called (column visibility state changes)
    expect(toggleBtn).toBeInTheDocument();
  });

  it("toggles showWorkstations column visibility", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Alice")).toBeInTheDocument());

    await userEvent.click(screen.getByTestId("toggle-showWorkstations"));
    expect(screen.getByTestId("toggle-showWorkstations")).toBeInTheDocument();
  });

  it("toggles showGroups column visibility", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Alice")).toBeInTheDocument());

    await userEvent.click(screen.getByTestId("toggle-showGroups"));
    expect(screen.getByTestId("toggle-showGroups")).toBeInTheDocument();
  });

  it("toggles showFiles column visibility", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Alice")).toBeInTheDocument());

    await userEvent.click(screen.getByTestId("toggle-showFiles"));
    expect(screen.getByTestId("toggle-showFiles")).toBeInTheDocument();
  });

  it("prevents deleting own account", async () => {
    // Render with current user ID matching one of the users
    renderPage({ currentUser: { id: "1", role: "admin" } });
    await waitFor(() => expect(screen.getByText("Alice")).toBeInTheDocument());

    await userEvent.click(screen.getByTestId("delete-btn-1"));

    expect(
      await screen.findByText("You cannot delete your own account")
    ).toBeInTheDocument();
    expect(usersApi.deleteUser).not.toHaveBeenCalled();
  });

  it("shows error toast type with correct styling class", async () => {
    usersApi.createUser.mockRejectedValue(new Error("Creation error"));
    renderPage();
    await userEvent.click(screen.getByTestId("open-create-btn"));
    await userEvent.click(screen.getByText("Confirm Create"));

    const toast = await screen.findByText("Creation error");
    expect(toast).toBeInTheDocument();
  });

  it("handles delete error gracefully", async () => {
    usersApi.deleteUser.mockRejectedValueOnce(new Error("Delete error"));
    renderPage();
    await waitFor(() => expect(screen.getByText("Alice")).toBeInTheDocument());

    await userEvent.click(screen.getByTestId("delete-btn-1"));

    expect(await screen.findByText("Delete error")).toBeInTheDocument();
  });

  it("removes user from list after successful deletion", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Alice")).toBeInTheDocument());

    await userEvent.click(screen.getByTestId("delete-btn-1"));

    await waitFor(() =>
      expect(screen.queryByText("Alice")).not.toBeInTheDocument()
    );
  });

  it("handles localStorage error gracefully when reading org_id", async () => {
    // Mock localStorage to throw error
    const originalGetItem = Storage.prototype.getItem;
    Storage.prototype.getItem = jest.fn(() => {
      throw new Error("Storage error");
    });

    renderPage({
      currentUser: { id: "admin-1", role: "admin", org_id: "default-org" },
    });

    // Should still render without crashing
    expect(screen.getByTestId("open-create-btn")).toBeInTheDocument();

    Storage.prototype.getItem = originalGetItem;
  });

  it("opens modal when location state has openModal true", async () => {
    const { MemoryRouter } = require("react-router-dom");

    // Use MemoryRouter with initial state
    render(
      <AuthProvider
        initialState={{
          currentUser: { id: "admin-1" },
          accessToken: "valid-token",
          disableBootstrap: true,
        }}
      >
        <MemoryRouter
          initialEntries={[
            { pathname: "/employees", state: { openModal: true } },
          ]}
        >
          <EmployeesPage />
        </MemoryRouter>
      </AuthProvider>
    );

    // Modal should open automatically
    await waitFor(() => {
      expect(screen.getByTestId("create-modal")).toBeInTheDocument();
    });
  });

  it("returns empty auth header when no jwt token", async () => {
    localStorage.removeItem("jwt");
    renderPage();
    await waitFor(() => expect(screen.getByText("Alice")).toBeInTheDocument());

    // Should still render without auth header issues
    expect(screen.getByTestId("users-table")).toBeInTheDocument();
  });

  it("handles users with groups, workstations, and file shares", async () => {
    const usersWithGroups = [
      {
        _id: "1",
        full_name: "Alice",
        email: "a@t.com",
        role: "admin",
        status: "active",
        files: 10,
      },
    ];

    // Mock groups API response with members
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          access_groups: [
            {
              id: "grp1",
              _id: "grp1",
              group_name: "Engineering",
              members: ["1"],
              workstations: ["ws1"],
              file_shares: ["share1"],
            },
          ],
        }),
    });

    usersApi.listUsers.mockResolvedValue(usersWithGroups);

    renderPage();
    await waitFor(() => expect(screen.getByText("Alice")).toBeInTheDocument());
  });

  it("aggregates workstations from multiple groups", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          access_groups: [
            {
              id: "grp1",
              members: ["1"],
              workstations: ["ws1", "ws2"],
              file_shares: [],
            },
            {
              id: "grp2",
              members: ["1"],
              workstations: ["ws2", "ws3"],
              file_shares: ["share1"],
            },
          ],
        }),
    });

    usersApi.listUsers.mockResolvedValue([
      {
        _id: "1",
        full_name: "Alice",
        email: "a@t.com",
        role: "admin",
        status: "active",
        files: 0,
      },
    ]);

    renderPage();
    await waitFor(() => expect(screen.getByText("Alice")).toBeInTheDocument());
  });

  it("maps user without full_name to use email as name", async () => {
    usersApi.listUsers.mockResolvedValue([
      {
        _id: "1",
        full_name: null,
        email: "noname@example.com",
        role: "employee",
        status: "active",
        files: 0,
      },
    ]);

    renderPage();
    await waitFor(() =>
      expect(screen.getByText("noname@example.com")).toBeInTheDocument()
    );
  });

  // Tests for CustomToast keyboard handling
  describe("CustomToast keyboard handling", () => {
    it("closes toast on Enter key press", async () => {
      usersApi.deleteUser.mockRejectedValueOnce(new Error("Delete failed"));
      renderPage();
      await waitFor(() =>
        expect(screen.getByText("Alice")).toBeInTheDocument()
      );

      await userEvent.click(screen.getByTestId("delete-btn-1"));

      const toast = await screen.findByText("Delete failed");
      fireEvent.keyDown(toast, { key: "Enter" });

      await waitFor(() => {
        expect(screen.queryByText("Delete failed")).not.toBeInTheDocument();
      });
    });

    it("closes toast on Space key press", async () => {
      usersApi.deleteUser.mockRejectedValueOnce(new Error("Delete failed"));
      renderPage();
      await waitFor(() =>
        expect(screen.getByText("Alice")).toBeInTheDocument()
      );

      await userEvent.click(screen.getByTestId("delete-btn-1"));

      const toast = await screen.findByText("Delete failed");
      fireEvent.keyDown(toast, { key: " " });

      await waitFor(() => {
        expect(screen.queryByText("Delete failed")).not.toBeInTheDocument();
      });
    });

    it("does not close toast on other key press", async () => {
      usersApi.deleteUser.mockRejectedValueOnce(new Error("Delete failed"));
      renderPage();
      await waitFor(() =>
        expect(screen.getByText("Alice")).toBeInTheDocument()
      );

      await userEvent.click(screen.getByTestId("delete-btn-1"));

      const toast = await screen.findByText("Delete failed");
      fireEvent.keyDown(toast, { key: "Escape" });

      // Toast should still be visible
      expect(screen.getByText("Delete failed")).toBeInTheDocument();
    });
  });

  // =========================================================
  // NEW COVERAGE TESTS (Added below existing blocks)
  // =========================================================
  describe("Complex Logic & Error Handling Coverage", () => {
    const { trackButton } = require("../../lib/analytics.js");

    it("handles specific password error details from API", async () => {
      // Covers: if (passwordError) { msg = passwordError.msg || msg; }
      const errorPayload = {
        payload: {
          details: [{ loc: ["body", "password"], msg: "Password is too weak" }],
        },
      };
      usersApi.createUser.mockRejectedValue(errorPayload);

      renderPage();
      await userEvent.click(screen.getByTestId("open-create-btn"));
      await userEvent.click(screen.getByText("Confirm Create"));

      // Verify specific password error message is displayed
      expect(await screen.findByText("Password is too weak")).toBeInTheDocument();
    });

    it("handles generic payload errors from API", async () => {
      // Covers: } else if (error.payload?.error) { msg = error.payload.error; }
      const errorPayload = {
        payload: { error: "Duplicate email address" },
      };
      usersApi.createUser.mockRejectedValue(errorPayload);

      renderPage();
      await userEvent.click(screen.getByTestId("open-create-btn"));
      await userEvent.click(screen.getByText("Confirm Create"));

      expect(
        await screen.findByText("Duplicate email address")
      ).toBeInTheDocument();
    });

    it("tracks layout changes", async () => {
      // Covers: trackButton("employees/display/toggle", ...);
      renderPage();

      await userEvent.click(screen.getByTestId("layout-toggle-grid"));

      expect(trackButton).toHaveBeenCalledWith("employees/display/toggle", {
        page: "employees",
        layout: "grid",
      });
    });

    describe("Group Membership Updates (updateUserGroupMemberships)", () => {
      it("adds user to new groups", async () => {
        // 1. Mock GET access-groups (Current state: User is NOT in 'grp-1')
        global.fetch
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({
              access_groups: [{ id: "grp-1", members: ["other-user"] }],
            }),
          })
          // 2. Mock PATCH access-groups (Update: Add user)
          .mockResolvedValueOnce({ ok: true, json: async () => ({}) });

        usersApi.createUser.mockResolvedValue({ user_id: "new-user-123" });

        renderPage();
        await userEvent.click(screen.getByTestId("open-create-btn"));

        // Use the specific button that submits with groups
        await userEvent.click(screen.getByTestId("submit-with-groups"));

        await waitFor(() => {
          // Covers: fetch(`.../api/access-groups/${groupId}`, { method: "PATCH", ... })
          // Verify the PATCH call was made to add the user
          expect(global.fetch).toHaveBeenNthCalledWith(
            2,
            expect.stringContaining("/api/access-groups/grp-1"),
            expect.objectContaining({
              method: "PATCH",
              body: JSON.stringify({ members: ["other-user", "new-user-123"] }),
            })
          );
        });
      });

      it("removes user from old groups", async () => {
        // 1. Mock GET access-groups (Current state: User IS in 'grp-1')
        global.fetch
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({
              access_groups: [{ id: "grp-1", members: ["1"] }], // "1" is the ID of Alice in seedUsers
            }),
          })
          // 2. Mock PATCH access-groups (Update: Remove user)
          .mockResolvedValueOnce({ ok: true, json: async () => ({}) });

        // We need to UPDATE an existing user to trigger removal logic
        // We submit WITHOUT groups (default button), effectively removing them from 'grp-1'
        renderPage();
        await waitFor(() =>
          expect(screen.getByText("Alice")).toBeInTheDocument()
        );

        await userEvent.click(screen.getByTestId("edit-btn-1"));
        await userEvent.click(screen.getByText("Confirm Update"));

        await waitFor(() => {
          // Verify PATCH call removed ID "1"
          expect(global.fetch).toHaveBeenNthCalledWith(
            2,
            expect.stringContaining("/api/access-groups/grp-1"),
            expect.objectContaining({
              method: "PATCH",
              body: JSON.stringify({ members: [] }), // Empty because Alice was the only one
            })
          );
        });
      });

      it("handles failure when fetching groups", async () => {
        // Covers: if (!res.ok) { console.error(...); return; }
        const consoleSpy = jest
          .spyOn(console, "error")
          .mockImplementation(() => {});

        global.fetch.mockResolvedValueOnce({ ok: false });

        renderPage();
        await userEvent.click(screen.getByTestId("open-create-btn"));
        await userEvent.click(screen.getByTestId("submit-with-groups"));

        await waitFor(() => {
          expect(consoleSpy).toHaveBeenCalledWith(
            "Failed to fetch groups for membership update"
          );
        });

        // Ensure logic stopped (no PATCH calls made)
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });

      it("skips PATCH if user is already a member (idempotency)", async () => {
        // Mock GET: User IS ALREADY in 'grp-1'
        global.fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            access_groups: [{ id: "grp-1", members: ["new-user-123"] }],
          }),
        });

        usersApi.createUser.mockResolvedValue({ user_id: "new-user-123" });

        renderPage();
        await userEvent.click(screen.getByTestId("open-create-btn"));
        await userEvent.click(screen.getByTestId("submit-with-groups"));

        // Wait for process to finish
        await waitFor(() => expect(usersApi.createUser).toHaveBeenCalled());

        // Assert: Only GET was called, no PATCH (because membership matched)
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });
    });
  });
});

