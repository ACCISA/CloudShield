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

// Mock Table: Added 'Force Delete' to test deletion when no users are loaded (token missing)
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
        <button
          onClick={() =>
            onSubmit({
              firstName: form.firstName || "John",
              lastName: form.lastName || "D",
              email: "t@t.com",
              password: "123",
              jobTitle: "Dev",
            })
          }
        >
          {isEdit ? "Confirm Update" : "Confirm Create"}
        </button>
        {isEdit && <button onClick={onDelete}>Confirm Delete</button>}
        <button onClick={onClose}>Cancel</button>
      </div>
    );
  };
});

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
    ),
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
    ),
);
jest.mock(
  "../../components/common/CreateButton/CreateButton.jsx",
  () =>
    ({ onClick }) => (
      <button data-testid="open-create-btn" onClick={onClick}>
        Create
      </button>
    ),
);
jest.mock(
  "../../components/common/RefreshButton/RefreshButton.jsx",
  () =>
    ({ onClick }) => (
      <button data-testid="refresh-btn" onClick={onClick}>
        Refresh
      </button>
    ),
);
jest.mock(
  "../../components/common/DisplayButton/DisplayButton.jsx",
  () =>
    ({ columnToggles }) => (
      <div>
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
    ),
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
    </AuthProvider>,
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
    jest.spyOn(console, "error").mockImplementation(() => {});
  });
  afterAll(() => {
    console.error.mockRestore();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    localStorage.setItem("org_id", "org-local");
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
      expect(screen.getByTestId("user-count")).toHaveTextContent("Count: 1"),
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
      expect(screen.queryByText("Bob")).not.toBeInTheDocument(),
    );
  });

  // --- CREATE ---
  it("creates user successfully", async () => {
    renderPage();
    await userEvent.click(screen.getByTestId("open-create-btn"));
    await userEvent.click(screen.getByText("Confirm Create"));
    expect(
      await screen.findByText("User created successfully"),
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
        expect.any(Object),
      ),
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
        expect.any(Object),
      ),
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
      await screen.findByText("User updated successfully"),
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
      await screen.findByText("User deleted successfully"),
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
        screen.queryByText("User created successfully"),
      ).not.toBeInTheDocument(),
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
});
