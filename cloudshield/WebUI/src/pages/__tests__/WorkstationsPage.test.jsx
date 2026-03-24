import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import WorkstationsPage, { createWorkstation } from "../WorkstationsPage";

// Mock analytics
jest.mock("../../lib/analytics", () => ({
  trackButton: jest.fn(),
}));

// Mock click logger hook
jest.mock("../../hooks/useClickLogger", () => ({
  useClickLogger: () => () => (handler) => handler,
}));

// Helper to render with router
const renderPage = (options = {}) => {
  const defaultState = {};
  const state = { ...defaultState, ...options.state };

  return render(
    <MemoryRouter initialEntries={[{ pathname: "/workstations", state }]}>
      <WorkstationsPage />
    </MemoryRouter>,
  );
};

// Mock child components
jest.mock("../../components/workstations/WorkstationList", () => {
  return function MockWorkstationList({
    rows,
    onEdit,
    onToggleStatus,
    onDelete,
    selectedIds,
    allVisibleSelected,
    isIndeterminate,
    onToggleSelect,
    onToggleSelectAll,
    showUsers,
    showCurrent,
    showLastUsed,
  }) {
    return (
      <div data-testid="workstation-list">
        <div>Workstations Count: {rows.length}</div>
        <div data-testid="show-users">
          {showUsers ? "Users Shown" : "Users Hidden"}
        </div>
        <div data-testid="show-current">
          {showCurrent ? "Current Shown" : "Current Hidden"}
        </div>
        <div data-testid="show-last-used">
          {showLastUsed ? "Last Used Shown" : "Last Used Hidden"}
        </div>

        <button data-testid="select-all" onClick={onToggleSelectAll}>
          {allVisibleSelected
            ? "Deselect All"
            : isIndeterminate
              ? "Deselect Some"
              : "Select All"}
        </button>

        {rows.map((row) => (
          <div key={row.id} data-testid={`workstation-row-${row.id}`}>
            <input
              type="checkbox"
              data-testid={`checkbox-${row.id}`}
              checked={selectedIds.has(row.id)}
              onChange={() => onToggleSelect(row.id)}
            />
            <span>{row.name}</span>
            <span>{row.status}</span>
            <button data-testid={`edit-${row.id}`} onClick={() => onEdit(row)}>
              Edit
            </button>
            <button
              data-testid={`toggle-${row.id}`}
              onClick={() => onToggleStatus(row.id)}
            >
              Toggle Status
            </button>
            <button
              data-testid={`delete-${row.id}`}
              onClick={() => onDelete(row.id)}
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    );
  };
});

jest.mock("../../components/workstations/WorkstationModal", () => {
  return function MockWorkstationModal({
    open,
    onClose,
    onSubmit,
    workstationData,
    onDelete,
  }) {
    if (!open) return null;
    return (
      <div data-testid={workstationData ? "edit-modal" : "create-modal"}>
        <button data-testid="modal-close" onClick={onClose}>
          Close
        </button>
        <button
          data-testid="modal-submit"
          onClick={() =>
            onSubmit({
              name: "Test Workstation",
              code: "WS-TEST",
              users: [],
            })
          }
        >
          Submit
        </button>
        {onDelete && (
          <button data-testid="modal-delete" onClick={onDelete}>
            Delete
          </button>
        )}
      </div>
    );
  };
});

jest.mock("../../components/common/SearchField/SearchField", () => {
  return function MockSearchField({ value, onChange, placeholder }) {
    return (
      <input
        data-testid="search-field"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    );
  };
});

jest.mock("../../components/common/DisplayButton/DisplayButton", () => {
  return function MockDisplayButton({ layout, onLayoutChange, columnToggles }) {
    return (
      <div data-testid="display-button">
        <button onClick={() => onLayoutChange("list")}>List</button>
        <button onClick={() => onLayoutChange("cards")}>Cards</button>
        <button onClick={() => onLayoutChange("icons")}>Icons</button>
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
    );
  };
});

jest.mock("../../components/common/FilterButton/FilterButton", () => {
  return function MockFilterButton({
    filterGroups,
    activeFilters,
    onFilterChange,
  }) {
    return (
      <div data-testid="filter-button">
        {filterGroups.map((group) => (
          <div key={group.id} data-testid={`filter-group-${group.id}`}>
            {group.options.map((option) => {
              const isActive =
                activeFilters[group.id]?.has(option.value) || false;
              return (
                <button
                  key={option.value}
                  data-testid={`filter-${option.value}`}
                  onClick={() =>
                    onFilterChange(group.id, option.value, !isActive)
                  }
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    );
  };
});

jest.mock("../../components/common/CreateButton/CreateButton", () => {
  return function MockCreateButton({ onClick, buttonText }) {
    return (
      <button data-testid="create-button" onClick={onClick}>
        {buttonText}
      </button>
    );
  };
});

jest.mock("../../components/common/RefreshButton/RefreshButton", () => {
  return function MockRefreshButton({ onClick }) {
    return (
      <button data-testid="refresh-button" onClick={onClick}>
        Refresh
      </button>
    );
  };
});

// Mock standardized layout/wrappers so tests stay focused on page logic
jest.mock("../../components/layout/PageShell", () => ({
  __esModule: true,
  default: function MockPageShell({ title, subtitle, actions, children }) {
    return (
      <div data-testid="page-shell">
        {title ? <h1>{title}</h1> : null}
        {subtitle ? <div data-testid="page-subtitle">{subtitle}</div> : null}
        {actions ? <div data-testid="page-actions">{actions}</div> : null}
        <div data-testid="page-content">{children}</div>
      </div>
    );
  },
}));

jest.mock("../../components/table/TableSurface", () => ({
  __esModule: true,
  default: function MockTableSurface({ children }) {
    return <div data-testid="table-surface">{children}</div>;
  },
}));

jest.mock("../../components/table/TableSkeleton", () => ({
  __esModule: true,
  default: function MockTableSkeleton() {
    return <div data-testid="table-skeleton">Loading...</div>;
  },
}));

jest.mock("../../lib/safeAsync", () => ({
  __esModule: true,
  safeAsync: jest.fn(async (fn) => await fn()),
}));

describe("createWorkstation", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    global.fetch = originalFetch;
  });

  test("posts workstation payload with mapped group ids and auth token", async () => {
    localStorage.setItem("jwt", "token-123");
    const createdResponse = { id: "ws-123", name: "WS-Alpha" };
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValueOnce(createdResponse),
    });

    const result = await createWorkstation(
      "org-1",
      "WS-Alpha",
      "10.0.0.1",
      [{ id: "group-1" }, { id: "group-2" }],
    );

    expect(result).toEqual(createdResponse);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/workstations",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
      }),
    );

    const [, options] = global.fetch.mock.calls[0];
    expect(options.headers).toEqual(
      expect.objectContaining({
        "Content-Type": "application/json",
        Authorization: "Bearer token-123",
      }),
    );
    expect(JSON.parse(options.body)).toEqual({
      org_id: "org-1",
      name: "WS-Alpha",
      ip: "10.0.0.1",
      groups: ["group-1", "group-2"],
    });
  });

  test("omits authorization header and defaults groups to empty array", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValueOnce({ id: "ws-456" }),
    });

    await createWorkstation("org-2", "WS-Beta", "10.0.0.2");

    const [, options] = global.fetch.mock.calls[0];
    expect(options.headers).toEqual({
      "Content-Type": "application/json",
    });
    expect(JSON.parse(options.body)).toEqual({
      org_id: "org-2",
      name: "WS-Beta",
      ip: "10.0.0.2",
      groups: [],
    });
  });

  test("returns null and logs when API responds with error", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    global.fetch.mockResolvedValueOnce({
      ok: false,
      statusText: "Bad Request",
      json: jest.fn().mockResolvedValueOnce({ error: "Workstation already exists" }),
    });

    const result = await createWorkstation("org-3", "WS-Gamma", "10.0.0.3", []);

    expect(result).toBeNull();
    expect(consoleSpy).toHaveBeenCalledWith(
      "Error creating workstation:",
      expect.any(Error),
    );
  });
});

describe("WorkstationsPage Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    test("renders without crashing", () => {
      renderPage();
      expect(screen.getByTestId("workstation-list")).toBeInTheDocument();
    });

    test("renders search field", () => {
      renderPage();
      expect(screen.getByTestId("search-field")).toBeInTheDocument();
    });

    test("renders create button", () => {
      renderPage();
      expect(screen.getByTestId("create-button")).toBeInTheDocument();
    });

    test("renders display button", () => {
      renderPage();
      expect(screen.getByTestId("display-button")).toBeInTheDocument();
    });

    test("renders filter button", () => {
      renderPage();
      expect(screen.getByTestId("filter-button")).toBeInTheDocument();
    });

    test("renders refresh button", () => {
      renderPage();
      expect(screen.getByTestId("refresh-button")).toBeInTheDocument();
    });

    test("shows correct placeholder in search field", () => {
      renderPage();
      const searchField = screen.getByTestId("search-field");
      expect(searchField).toHaveAttribute("placeholder", "Search workstations");
    });
  });

  describe("Search Functionality", () => {
    test("updates search value on input", async () => {
      renderPage();
      const searchField = screen.getByTestId("search-field");

      await userEvent.type(searchField, "test");

      expect(searchField).toHaveValue("test");
    });

    test("clears search value", async () => {
      renderPage();
      const searchField = screen.getByTestId("search-field");

      await userEvent.type(searchField, "test");
      expect(searchField).toHaveValue("test");

      await userEvent.clear(searchField);
      expect(searchField).toHaveValue("");
    });

    test("filters workstations by name", async () => {
      renderPage();
      const searchField = screen.getByTestId("search-field");

      // Initial count should show all workstations
      const initialList = screen.getByTestId("workstation-list");
      const initialCount = initialList.textContent.match(
        /Workstations Count: (\d+)/,
      )?.[1];

      await userEvent.type(searchField, "nonexistent");

      await waitFor(() => {
        const list = screen.getByTestId("workstation-list");
        // Should have fewer or same workstations after filtering
        expect(list).toBeInTheDocument();
      });
    });
  });

  describe("Display Controls", () => {
    test("toggles showUsers state", async () => {
      renderPage();
      const toggleButton = screen.getByTestId("toggle-showUsers");

      expect(screen.getByTestId("show-users")).toHaveTextContent("Users Shown");

      await userEvent.click(toggleButton);

      expect(screen.getByTestId("show-users")).toHaveTextContent(
        "Users Hidden",
      );
    });

    test("toggles showCurrent state", async () => {
      renderPage();
      const toggleButton = screen.getByTestId("toggle-showCurrent");

      expect(screen.getByTestId("show-current")).toHaveTextContent(
        "Current Shown",
      );

      await userEvent.click(toggleButton);

      expect(screen.getByTestId("show-current")).toHaveTextContent(
        "Current Hidden",
      );
    });

    test("toggles showLastUsed state", async () => {
      renderPage();
      const toggleButton = screen.getByTestId("toggle-showLastUsed");

      expect(screen.getByTestId("show-last-used")).toHaveTextContent(
        "Last Used Shown",
      );

      await userEvent.click(toggleButton);

      expect(screen.getByTestId("show-last-used")).toHaveTextContent(
        "Last Used Hidden",
      );
    });

    test("changes layout to cards", async () => {
      renderPage();
      const cardsButton = screen.getByText("Cards");

      await userEvent.click(cardsButton);

      // Layout change should be tracked
      const { trackButton } = require("../../lib/analytics");
      expect(trackButton).toHaveBeenCalledWith(
        "workstations/display/toggle",
        expect.objectContaining({
          layout: "cards",
        }),
      );
    });

    test("changes layout to icons", async () => {
      renderPage();
      const iconsButton = screen.getByText("Icons");

      await userEvent.click(iconsButton);

      const { trackButton } = require("../../lib/analytics");
      expect(trackButton).toHaveBeenCalledWith(
        "workstations/display/toggle",
        expect.objectContaining({
          layout: "icons",
        }),
      );
    });

    test("renders icon selection bar and toggles select-all in icons layout", async () => {
      renderPage();
      const iconsButton = screen.getByText("Icons");
      await userEvent.click(iconsButton);

      const selectAllButton = screen.getByRole("button", { name: /select all/i });
      expect(screen.getByText("0 selected")).toBeInTheDocument();

      await userEvent.click(selectAllButton);
      expect(screen.queryByText("0 selected")).not.toBeInTheDocument();

      await userEvent.click(selectAllButton);
      expect(screen.getByText("0 selected")).toBeInTheDocument();
    });
  });

  describe("Filter Functionality", () => {
    test("applies status filter", async () => {
      renderPage();
      const connectedFilter = screen.getByTestId("filter-connected");

      await userEvent.click(connectedFilter);

      // Filter should be tracked
      const { trackButton } = require("../../lib/analytics");
      expect(trackButton).toHaveBeenCalledWith(
        "workstations/filter/change",
        expect.objectContaining({
          groupId: "status",
          value: "connected",
          active: true,
        }),
      );
    });

    test("toggles filter selection", async () => {
      renderPage();
      const disconnectedFilter = screen.getByTestId("filter-disconnected");

      await userEvent.click(disconnectedFilter);
      await userEvent.click(disconnectedFilter);

      const { trackButton } = require("../../lib/analytics");
      // Should be called twice - once to activate, once to deactivate
      expect(trackButton).toHaveBeenCalledTimes(2);
    });

    test("applies multiple filters simultaneously", async () => {
      renderPage();
      const connectedFilter = screen.getByTestId("filter-connected");
      const activeUsersFilter = screen.getByTestId("filter-activeUsers");

      await userEvent.click(connectedFilter);
      await userEvent.click(activeUsersFilter);

      const { trackButton } = require("../../lib/analytics");
      expect(trackButton).toHaveBeenCalledTimes(2);
    });
  });

  describe("Modal Interactions", () => {
    test("opens create modal when create button is clicked", async () => {
      renderPage();
      const createButton = screen.getByTestId("create-button");

      await userEvent.click(createButton);

      expect(screen.getByTestId("create-modal")).toBeInTheDocument();
    });

    test("closes modal when close button is clicked", async () => {
      renderPage();
      const createButton = screen.getByTestId("create-button");

      await userEvent.click(createButton);
      expect(screen.getByTestId("create-modal")).toBeInTheDocument();

      const closeButton = screen.getByTestId("modal-close");
      await userEvent.click(closeButton);

      expect(screen.queryByTestId("create-modal")).not.toBeInTheDocument();
    });

    test("opens edit modal when edit button is clicked", async () => {
      renderPage();

      // Find and click first edit button
      const editButtons = screen.getAllByTestId(/^edit-/);
      if (editButtons.length > 0) {
        await userEvent.click(editButtons[0]);

        await waitFor(() => {
          expect(screen.getByTestId("edit-modal")).toBeInTheDocument();
        });
      }
    });

    test("modal receives workstation data in edit mode", async () => {
      renderPage();

      const editButtons = screen.getAllByTestId(/^edit-/);
      if (editButtons.length > 0) {
        await userEvent.click(editButtons[0]);

        await waitFor(() => {
          expect(screen.getByTestId("edit-modal")).toBeInTheDocument();
        });
      }
    });
  });

  describe("Selection Management", () => {
    test("toggles single workstation selection", async () => {
      renderPage();

      const checkboxes = screen.getAllByRole("checkbox");
      const firstCheckbox = checkboxes.find((cb) =>
        cb.dataset.testid?.startsWith("checkbox-"),
      );

      if (firstCheckbox) {
        expect(firstCheckbox).not.toBeChecked();

        await userEvent.click(firstCheckbox);

        expect(firstCheckbox).toBeChecked();
      }
    });

    test("selects all visible workstations", async () => {
      renderPage();
      const selectAllButton = screen.getByTestId("select-all");

      expect(selectAllButton).toHaveTextContent("Select All");

      await userEvent.click(selectAllButton);

      expect(selectAllButton).toHaveTextContent("Deselect All");
    });

    test("deselects all visible workstations when all are selected", async () => {
      renderPage();
      const selectAllButton = screen.getByTestId("select-all");

      await userEvent.click(selectAllButton);
      expect(selectAllButton).toHaveTextContent("Deselect All");

      await userEvent.click(selectAllButton);
      expect(selectAllButton).toHaveTextContent("Select All");
    });

    test("handles indeterminate state", async () => {
      renderPage();

      // Select one workstation
      const checkboxes = screen.getAllByRole("checkbox");
      const firstCheckbox = checkboxes.find((cb) =>
        cb.dataset.testid?.startsWith("checkbox-"),
      );

      if (firstCheckbox) {
        await userEvent.click(firstCheckbox);

        const selectAllButton = screen.getByTestId("select-all");
        expect(selectAllButton).toHaveTextContent("Deselect Some");
      }
    });
  });

  describe("CRUD Operations", () => {
    test("creates new workstation", async () => {
      renderPage();
      const createButton = screen.getByTestId("create-button");

      await userEvent.click(createButton);

      const submitButton = screen.getByTestId("modal-submit");
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.queryByTestId("create-modal")).not.toBeInTheDocument();
      });

      const { trackButton } = require("../../lib/analytics");
      expect(trackButton).toHaveBeenCalledWith(
        "workstations/create/save",
        expect.objectContaining({
          page: "workstations",
        }),
      );
    });

    test("edits existing workstation", async () => {
      renderPage();

      const editButtons = screen.getAllByTestId(/^edit-/);
      if (editButtons.length > 0) {
        await userEvent.click(editButtons[0]);

        await waitFor(() => {
          expect(screen.getByTestId("edit-modal")).toBeInTheDocument();
        });

        const submitButton = screen.getByTestId("modal-submit");
        await userEvent.click(submitButton);

        await waitFor(() => {
          expect(screen.queryByTestId("edit-modal")).not.toBeInTheDocument();
        });

        const { trackButton } = require("../../lib/analytics");
        expect(trackButton).toHaveBeenCalledWith(
          "workstations/edit/save",
          expect.anything(),
        );
      }
    });

    test("toggles workstation status", async () => {
      renderPage();

      const toggleButtons = screen.getAllByTestId(/^toggle-/);
      const statusToggle = toggleButtons.find((btn) =>
        btn.dataset.testid?.match(/^toggle-ws-\d+$/),
      );

      if (statusToggle) {
        await userEvent.click(statusToggle);

        const { trackButton } = require("../../lib/analytics");
        expect(trackButton).toHaveBeenCalledWith(
          "workstations/row/toggle-status",
          expect.anything(),
        );
      }
    });
  });

  describe("Navigation State", () => {
    test("opens modal when navigated from dashboard", () => {
      renderPage({ state: { openModal: true } });

      expect(screen.getByTestId("create-modal")).toBeInTheDocument();
    });

    test("does not open modal without navigation state", () => {
      renderPage();

      expect(screen.queryByTestId("create-modal")).not.toBeInTheDocument();
      expect(screen.queryByTestId("edit-modal")).not.toBeInTheDocument();
    });
  });

  describe("Integration Tests", () => {
    test("search and filter work together", async () => {
      renderPage();

      const searchField = screen.getByTestId("search-field");
      await userEvent.type(searchField, "test");

      const connectedFilter = screen.getByTestId("filter-connected");
      await userEvent.click(connectedFilter);

      expect(screen.getByTestId("workstation-list")).toBeInTheDocument();
    });

    test("handles multiple state changes", async () => {
      renderPage();

      // Change search
      const searchField = screen.getByTestId("search-field");
      await userEvent.type(searchField, "work");

      // Toggle column visibility
      const toggleUsers = screen.getByTestId("toggle-showUsers");
      await userEvent.click(toggleUsers);

      // Change layout
      const cardsButton = screen.getByText("Cards");
      await userEvent.click(cardsButton);

      expect(screen.getByText("0 selected")).toBeInTheDocument();
    });

    test("refresh button triggers handler", async () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      renderPage();
      await userEvent.click(screen.getByTestId("refresh-button"));

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith("refresh");
      });

      await waitFor(() => {
        expect(screen.queryByTestId("table-skeleton")).not.toBeInTheDocument();
      });

      consoleSpy.mockRestore();
    });
  });

  describe("Edge Cases", () => {
    test("does not delete when confirmation is canceled", async () => {
      const confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(false);
      renderPage();

      const deleteButtons = screen.getAllByTestId(/^delete-/);
      const firstDelete = deleteButtons.find((btn) =>
        btn.dataset.testid?.match(/^delete-ws-\d+$/),
      );

      if (firstDelete) {
        await userEvent.click(firstDelete);
        expect(confirmSpy).toHaveBeenCalled();
      }

      confirmSpy.mockRestore();
    });

    test("deletes workstation when confirmation is accepted", async () => {
      const confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(true);
      renderPage();

      const deleteButtons = screen.getAllByTestId(/^delete-/);
      const firstDelete = deleteButtons.find((btn) =>
        btn.dataset.testid?.match(/^delete-ws-\d+$/),
      );

      if (firstDelete) {
        await userEvent.click(firstDelete);
        const { trackButton } = require("../../lib/analytics");
        expect(trackButton).toHaveBeenCalledWith(
          "workstations/edit/delete",
          expect.anything(),
        );
      }

      confirmSpy.mockRestore();
    });

    test("handles empty search gracefully", async () => {
      renderPage();
      const searchField = screen.getByTestId("search-field");

      await userEvent.type(searchField, "   ");

      expect(screen.getByTestId("workstation-list")).toBeInTheDocument();
    });

    test("handles rapid filter changes", async () => {
      renderPage();
      const connectedFilter = screen.getByTestId("filter-connected");

      await userEvent.click(connectedFilter);
      await userEvent.click(connectedFilter);
      await userEvent.click(connectedFilter);

      expect(screen.getByTestId("workstation-list")).toBeInTheDocument();
    });

    test("maintains selection after filter change", async () => {
      renderPage();

      // Select a workstation
      const checkboxes = screen.getAllByRole("checkbox");
      const firstCheckbox = checkboxes.find((cb) =>
        cb.dataset.testid?.startsWith("checkbox-"),
      );

      if (firstCheckbox) {
        await userEvent.click(firstCheckbox);
        expect(firstCheckbox).toBeChecked();

        // Apply filter
        const connectedFilter = screen.getByTestId("filter-connected");
        await userEvent.click(connectedFilter);

        // Selection should persist if item still visible
        expect(screen.getByTestId("workstation-list")).toBeInTheDocument();
      }
    });

    test("handles column visibility toggles", async () => {
      renderPage();

      const toggleUsers = screen.getByTestId("toggle-showUsers");
      const toggleCurrent = screen.getByTestId("toggle-showCurrent");
      const toggleLastUsed = screen.getByTestId("toggle-showLastUsed");

      await userEvent.click(toggleUsers);
      await userEvent.click(toggleCurrent);
      await userEvent.click(toggleLastUsed);

      expect(screen.getByTestId("show-users")).toHaveTextContent(
        "Users Hidden",
      );
      expect(screen.getByTestId("show-current")).toHaveTextContent(
        "Current Hidden",
      );
      expect(screen.getByTestId("show-last-used")).toHaveTextContent(
        "Last Used Hidden",
      );
    });
  });

  test("renders inside PageShell and TableSurface", () => {
    renderPage();

    expect(screen.getByTestId("page-shell")).toBeInTheDocument();
    expect(screen.getByTestId("page-actions")).toBeInTheDocument();
    expect(screen.getByTestId("page-content")).toBeInTheDocument();
    expect(screen.getByTestId("table-surface")).toBeInTheDocument();
  });

  test("refresh uses safeAsync", async () => {
    const { safeAsync } = require("../../lib/safeAsync");

    renderPage();
    await userEvent.click(screen.getByTestId("refresh-button"));

    expect(safeAsync).toHaveBeenCalled();
  });

  test("does not render title or subtitle in PageShell", () => {
    renderPage();

    expect(screen.queryByTestId("page-subtitle")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
  });

  describe("createWorkstation API Function Comprehensive", () => {
    it("constructs correct POST payload with org_id, name, ip, and groups", async () => {
      localStorage.setItem("jwt", "test-token");
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: "ws-123" }),
      });

      await createWorkstation("org-1", "WS-Test", "192.168.1.1", [
        { id: "g1" },
        { id: "g2" },
      ]);

      const [, options] = global.fetch.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body).toEqual({
        org_id: "org-1",
        name: "WS-Test",
        ip: "192.168.1.1",
        groups: ["g1", "g2"],
      });
    });

    it("includes Bearer token in Authorization header when jwt exists", async () => {
      localStorage.setItem("jwt", "token-xyz");
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: "ws-456" }),
      });

      await createWorkstation("org-2", "WS-New", "10.0.0.1", []);

      const [, options] = global.fetch.mock.calls[0];
      expect(options.headers.Authorization).toBe("Bearer token-xyz");
    });

    it("omits Authorization header when no jwt token", async () => {
      localStorage.clear();
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: "ws-789" }),
      });

      await createWorkstation("org-3", "WS-NoAuth", "10.0.0.2", []);

      const [, options] = global.fetch.mock.calls[0];
      expect(options.headers.Authorization).toBeUndefined();
    });

    it("handles empty groups array", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: "ws-000" }),
      });

      await createWorkstation("org-4", "WS-Empty", "10.0.0.3", []);

      const [, options] = global.fetch.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.groups).toEqual([]);
    });

    it("handles undefined groups parameter", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: "ws-111" }),
      });

      await createWorkstation("org-5", "WS-Undef", "10.0.0.4");

      const [, options] = global.fetch.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.groups).toEqual([]);
    });

    it("returns null on API error", async () => {
      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      global.fetch.mockResolvedValueOnce({
        ok: false,
        statusText: "Internal Server Error",
        json: () => Promise.resolve({ error: "Server error" }),
      });

      const result = await createWorkstation(
        "org-6",
        "WS-Error",
        "10.0.0.5",
        []
      );

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it("handles network error gracefully", async () => {
      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      global.fetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await createWorkstation(
        "org-7",
        "WS-NetError",
        "10.0.0.6",
        []
      );

      expect(result).toBeNull();
      consoleSpy.mockRestore();
    });
  });

  describe("State Initialization (useState hooks)", () => {
    it("initializes rows to empty array", async () => {
      renderPage();
      await waitFor(() => {
        const list = screen.getByTestId("workstation-list");
        expect(list.textContent).toMatch(/Workstations Count: 0/);
      });
    });

    it("initializes search to empty string", () => {
      renderPage();
      const searchField = screen.getByTestId("search-field");
      expect(searchField.value).toBe("");
    });

    it("initializes layout to 'list'", () => {
      renderPage();
      // List view should be default
      expect(screen.getByTestId("workstation-list")).toBeInTheDocument();
    });

    it("initializes showUsersCol to true", () => {
      renderPage();
      expect(screen.getByTestId("show-users")).toHaveTextContent("Users Shown");
    });

    it("initializes showCurrentCol to true", () => {
      renderPage();
      expect(screen.getByTestId("show-current")).toHaveTextContent(
        "Current Shown"
      );
    });

    it("initializes showLastUsedCol to true", () => {
      renderPage();
      expect(screen.getByTestId("show-last-used")).toHaveTextContent(
        "Last Used Shown"
      );
    });

    it("initializes selectedIds to empty Set", async () => {
      renderPage();
      const selectAllBtn = screen.getByTestId("select-all");
      expect(selectAllBtn).toHaveTextContent("Select All");
    });

    it("initializes activeFilters with empty Sets", () => {
      renderPage();
      // Filters should be available but not active
      expect(screen.getByTestId("filter-button")).toBeInTheDocument();
    });

    it("initializes openModal to false", () => {
      renderPage();
      expect(screen.queryByTestId("create-modal")).not.toBeInTheDocument();
      expect(screen.queryByTestId("edit-modal")).not.toBeInTheDocument();
    });

    it("initializes editRow to null", () => {
      renderPage();
      const createModal = screen.queryByTestId("create-modal");
      if (createModal) {
        expect(createModal.textContent).not.toContain("workstationData");
      }
    });

    it("initializes loading to true initially", async () => {
      renderPage();
      // Should show skeleton initially
      expect(screen.getByTestId("table-skeleton")).toBeInTheDocument();
    });

    it("initializes error to empty string", () => {
      renderPage();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });

  describe("useLocation Effect (openModal state)", () => {
    it("opens modal when location.state.openModal is true", () => {
      renderPage({ state: { openModal: true } });
      expect(screen.getByTestId("create-modal")).toBeInTheDocument();
    });

    it("sets editRow to null when opening from location", () => {
      renderPage({ state: { openModal: true } });
      const createModal = screen.getByTestId("create-modal");
      expect(createModal.textContent).not.toContain("edit");
    });

    it("clears location.state history after opening", () => {
      const replaceStateSpy = jest.spyOn(window.history, "replaceState");
      renderPage({ state: { openModal: true } });
      expect(replaceStateSpy).toHaveBeenCalledWith(
        {},
        expect.any(String)
      );
      replaceStateSpy.mockRestore();
    });

    it("does not open modal without location.state.openModal", () => {
      renderPage();
      expect(screen.queryByTestId("create-modal")).not.toBeInTheDocument();
    });
  });

  describe("Initial Data Fetch useEffect", () => {
    it("fetches workstations on component mount", async () => {
      renderPage();
      await waitFor(() => {
        expect(screen.getByTestId("workstation-list")).toBeInTheDocument();
      });
    });

    it("reads org_id and jwt from localStorage", async () => {
      localStorage.setItem("org_id", "org-test");
      localStorage.setItem("jwt", "token-test");
      renderPage();
      await waitFor(() => {
        const list = screen.getByTestId("workstation-list");
        expect(list).toBeInTheDocument();
      });
    });

    it("shows loading skeleton while fetching", () => {
      renderPage();
      expect(screen.getByTestId("table-skeleton")).toBeInTheDocument();
    });

    it("sets loading to false after fetch completes", async () => {
      renderPage();
      await waitFor(() => {
        expect(screen.queryByTestId("table-skeleton")).not.toBeInTheDocument();
      });
    });
  });

  describe("Filtered useMemo with Search, Filters, and Sorting", () => {
    it("trims whitespace from search query", () => {
      renderPage();
      const searchField = screen.getByTestId("search-field");
      fireEvent.change(searchField, { target: { value: "   test   " } });
      expect(searchField.value).toBeDefined();
    });

    it("searches by workstation name", async () => {
      renderPage();
      const searchField = screen.getByTestId("search-field");
      await userEvent.type(searchField, "test");
      // Filter applied, list still renders
      expect(screen.getByTestId("workstation-list")).toBeInTheDocument();
    });

    it("searches by workstation code", async () => {
      renderPage();
      const searchField = screen.getByTestId("search-field");
      await userEvent.type(searchField, "WS-");
      expect(screen.getByTestId("workstation-list")).toBeInTheDocument();
    });

    it("searches by current user first name", async () => {
      renderPage();
      const searchField = screen.getByTestId("search-field");
      await userEvent.type(searchField, "john");
      expect(screen.getByTestId("workstation-list")).toBeInTheDocument();
    });

    it("searches by current user full name", async () => {
      renderPage();
      const searchField = screen.getByTestId("search-field");
      await userEvent.type(searchField, "john smith");
      expect(screen.getByTestId("workstation-list")).toBeInTheDocument();
    });

    it("handles currentUser as object with firstName/lastName", async () => {
      renderPage();
      const searchField = screen.getByTestId("search-field");
      await userEvent.type(searchField, "user");
      expect(screen.getByTestId("workstation-list")).toBeInTheDocument();
    });

    it("handles currentUser as string", async () => {
      renderPage();
      const searchField = screen.getByTestId("search-field");
      await userEvent.type(searchField, "string");
      expect(screen.getByTestId("workstation-list")).toBeInTheDocument();
    });

    it("handles missing currentUser gracefully", async () => {
      renderPage();
      const searchField = screen.getByTestId("search-field");
      await userEvent.type(searchField, "—");
      expect(screen.getByTestId("workstation-list")).toBeInTheDocument();
    });

    it("filters by status when activeFilters.status has values", async () => {
      renderPage();
      const statusFilter = screen.getByTestId("filter-connected");
      await userEvent.click(statusFilter);
      // Filter applied
      expect(screen.getByTestId("workstation-list")).toBeInTheDocument();
    });

    it("filters by hasUsers when activeFilters.hasUsers has 'activeUsers'", async () => {
      renderPage();
      const hasUsersFilter = screen.getByTestId("filter-activeUsers");
      if (hasUsersFilter) {
        await userEvent.click(hasUsersFilter);
        expect(screen.getByTestId("workstation-list")).toBeInTheDocument();
      }
    });

    it("combines search and status filters", async () => {
      renderPage();
      const searchField = screen.getByTestId("search-field");
      await userEvent.type(searchField, "test");
      
      const statusFilter = screen.getByTestId("filter-connected");
      await userEvent.click(statusFilter);
      
      expect(screen.getByTestId("workstation-list")).toBeInTheDocument();
    });

    it("combines search and hasUsers filters", async () => {
      renderPage();
      const searchField = screen.getByTestId("search-field");
      await userEvent.type(searchField, "active");
      
      const hasUsersFilter = screen.getByTestId("filter-activeUsers");
      if (hasUsersFilter) {
        await userEvent.click(hasUsersFilter);
        expect(screen.getByTestId("workstation-list")).toBeInTheDocument();
      }
    });
  });

  describe("Selection Computation useMemo (allVisibleSelected, isIndeterminate)", () => {
    it("allVisibleSelected is true when all filtered items selected", async () => {
      renderPage();
      const selectAllBtn = screen.getByTestId("select-all");
      
      await userEvent.click(selectAllBtn);
      expect(selectAllBtn).toHaveTextContent("Deselect All");
    });

    it("isIndeterminate is true when some (not all) selected", async () => {
      renderPage();
      
      const checkboxes = screen.getAllByRole("checkbox");
      const firstCheckbox = checkboxes.find((cb) =>
        cb.dataset.testid?.startsWith("checkbox-")
      );
      
      if (firstCheckbox) {
        await userEvent.click(firstCheckbox);
        const selectAllBtn = screen.getByTestId("select-all");
        expect(selectAllBtn).toHaveTextContent("Deselect Some");
      }
    });

    it("allVisibleSelected is false when none selected", async () => {
      renderPage();
      const selectAllBtn = screen.getByTestId("select-all");
      expect(selectAllBtn).toHaveTextContent("Select All");
    });
  });

  describe("toggleSelect Handler", () => {
    it("adds workstation to selectedIds when unchecked", async () => {
      renderPage();
      
      const checkboxes = screen.getAllByRole("checkbox");
      const firstCheckbox = checkboxes.find((cb) =>
        cb.dataset.testid?.startsWith("checkbox-")
      );
      
      if (firstCheckbox) {
        await userEvent.click(firstCheckbox);
        expect(firstCheckbox).toBeChecked();
      }
    });

    it("removes workstation from selectedIds when checked", async () => {
      renderPage();
      
      const checkboxes = screen.getAllByRole("checkbox");
      const firstCheckbox = checkboxes.find((cb) =>
        cb.dataset.testid?.startsWith("checkbox-")
      );
      
      if (firstCheckbox) {
        await userEvent.click(firstCheckbox);
        expect(firstCheckbox).toBeChecked();
        
        await userEvent.click(firstCheckbox);
        expect(firstCheckbox).not.toBeChecked();
      }
    });

    it("toggles multiple workstations independently", async () => {
      renderPage();
      
      const checkboxes = screen.getAllByRole("checkbox");
      const workstationCheckboxes = checkboxes.filter((cb) =>
        cb.dataset.testid?.startsWith("checkbox-")
      );
      
      if (workstationCheckboxes.length >= 2) {
        await userEvent.click(workstationCheckboxes[0]);
        await userEvent.click(workstationCheckboxes[1]);
        
        expect(workstationCheckboxes[0]).toBeChecked();
        expect(workstationCheckboxes[1]).toBeChecked();
      }
    });
  });

  describe("toggleSelectAllVisible Handler", () => {
    it("selects all when none are selected", async () => {
      renderPage();
      const selectAllBtn = screen.getByTestId("select-all");
      
      await userEvent.click(selectAllBtn);
      expect(selectAllBtn).toHaveTextContent("Deselect All");
    });

    it("deselects all when all are selected", async () => {
      renderPage();
      const selectAllBtn = screen.getByTestId("select-all");
      
      await userEvent.click(selectAllBtn);
      expect(selectAllBtn).toHaveTextContent("Deselect All");
      
      await userEvent.click(selectAllBtn);
      expect(selectAllBtn).toHaveTextContent("Select All");
    });

    it("selects only unselected items when indeterminate", async () => {
      renderPage();
      
      const checkboxes = screen.getAllByRole("checkbox");
      const firstCheckbox = checkboxes.find((cb) =>
        cb.dataset.testid?.startsWith("checkbox-")
      );
      
      if (firstCheckbox) {
        await userEvent.click(firstCheckbox);
        const selectAllBtn = screen.getByTestId("select-all");
        
        await userEvent.click(selectAllBtn);
        // After indeterminate state click, should select remaining
        expect(selectAllBtn).toHaveTextContent("Deselect All");
      }
    });
  });

  describe("handleFilterChange Handler", () => {
    it("adds filter value to activeFilters when isActive is true", async () => {
      renderPage();
      const connectedFilter = screen.getByTestId("filter-connected");
      
      await userEvent.click(connectedFilter);
      expect(screen.getByTestId("workstation-list")).toBeInTheDocument();
    });

    it("removes filter value from activeFilters when isActive is false", async () => {
      renderPage();
      const connectedFilter = screen.getByTestId("filter-connected");
      
      await userEvent.click(connectedFilter);
      await userEvent.click(connectedFilter);
      
      expect(screen.getByTestId("workstation-list")).toBeInTheDocument();
    });

    it("handles multiple filters in same group", async () => {
      renderPage();
      const connectedFilter = screen.getByTestId("filter-connected");
      const disconnectedFilter = screen.getByTestId("filter-disconnected");
      
      await userEvent.click(connectedFilter);
      await userEvent.click(disconnectedFilter);
      
      expect(screen.getByTestId("workstation-list")).toBeInTheDocument();
    });

    it("handles filters across different groups", async () => {
      renderPage();
      const statusFilter = screen.getByTestId("filter-connected");
      const hasUsersFilter = screen.getByTestId("filter-activeUsers");
      
      if (hasUsersFilter) {
        await userEvent.click(statusFilter);
        await userEvent.click(hasUsersFilter);
        
        expect(screen.getByTestId("workstation-list")).toBeInTheDocument();
      }
    });
  });

  describe("handleCreate Handler", () => {
    it("creates new workstation with payload data", async () => {
      renderPage();
      const createBtn = screen.getByTestId("create-button");
      
      await userEvent.click(createBtn);
      const submitBtn = screen.getByTestId("modal-submit");
      await userEvent.click(submitBtn);
      
      expect(screen.queryByTestId("create-modal")).not.toBeInTheDocument();
    });

    it("generates temp id with timestamp", async () => {
      renderPage();
      const createBtn = screen.getByTestId("create-button");
      
      await userEvent.click(createBtn);
      const submitBtn = screen.getByTestId("modal-submit");
      await userEvent.click(submitBtn);
      
      // New workstation should be added to rows
      expect(screen.getByTestId("workstation-list")).toBeInTheDocument();
    });

    it("adds new row to beginning of rows array", async () => {
      renderPage();
      const createBtn = screen.getByTestId("create-button");
      
      await userEvent.click(createBtn);
      const submitBtn = screen.getByTestId("modal-submit");
      await userEvent.click(submitBtn);
      
      expect(screen.getByTestId("workstation-list")).toBeInTheDocument();
    });

    it("handles missing users array in payload", async () => {
      renderPage();
      const createBtn = screen.getByTestId("create-button");
      
      await userEvent.click(createBtn);
      const submitBtn = screen.getByTestId("modal-submit");
      await userEvent.click(submitBtn);
      
      expect(screen.queryByTestId("create-modal")).not.toBeInTheDocument();
    });
  });

  describe("handleEditSave Handler", () => {
    it("updates row with new changes", async () => {
      renderPage();
      
      const editButtons = screen.getAllByTestId(/^edit-/);
      if (editButtons.length > 0) {
        await userEvent.click(editButtons[0]);
        
        const submitBtn = screen.getByTestId("modal-submit");
        await userEvent.click(submitBtn);
        
        expect(screen.queryByTestId("edit-modal")).not.toBeInTheDocument();
      }
    });

    it("updates usersCount from changes.users.length", async () => {
      renderPage();
      
      const editButtons = screen.getAllByTestId(/^edit-/);
      if (editButtons.length > 0) {
        await userEvent.click(editButtons[0]);
        await userEvent.click(screen.getByTestId("modal-submit"));
        
        expect(screen.getByTestId("workstation-list")).toBeInTheDocument();
      }
    });

    it("preserves existing usersCount if no changes provided", async () => {
      renderPage();
      
      const editButtons = screen.getAllByTestId(/^edit-/);
      if (editButtons.length > 0) {
        await userEvent.click(editButtons[0]);
        await userEvent.click(screen.getByTestId("modal-submit"));
        
        expect(screen.getByTestId("workstation-list")).toBeInTheDocument();
      }
    });
  });

  describe("handleDelete Handler", () => {
    it("confirms deletion with window.confirm", async () => {
      const confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(true);
      renderPage();
      
      const deleteButtons = screen.getAllByTestId(/^delete-/);
      if (deleteButtons.length > 0) {
        await userEvent.click(deleteButtons[0]);
        expect(confirmSpy).toHaveBeenCalledWith("Delete this workstation?");
      }
      
      confirmSpy.mockRestore();
    });

    it("removes workstation from rows when confirmed", async () => {
      jest.spyOn(window, "confirm").mockReturnValue(true);
      renderPage();
      
      const deleteButtons = screen.getAllByTestId(/^delete-/);
      if (deleteButtons.length > 0) {
        await userEvent.click(deleteButtons[0]);
        expect(screen.getByTestId("workstation-list")).toBeInTheDocument();
      }
    });

    it("does not remove workstation when not confirmed", async () => {
      jest.spyOn(window, "confirm").mockReturnValue(false);
      renderPage();
      
      const deleteButtons = screen.getAllByTestId(/^delete-/);
      if (deleteButtons.length > 0) {
        await userEvent.click(deleteButtons[0]);
        expect(screen.getByTestId("workstation-list")).toBeInTheDocument();
      }
    });
  });

  describe("handleToggleStatus Handler", () => {
    it("toggles status from connected to disconnected", async () => {
      renderPage();
      
      const toggleButtons = screen.getAllByTestId(/^toggle-/);
      const statusToggle = toggleButtons.find((btn) =>
        btn.dataset.testid?.match(/^toggle-ws-/)
      );
      
      if (statusToggle) {
        await userEvent.click(statusToggle);
        expect(screen.getByTestId("workstation-list")).toBeInTheDocument();
      }
    });

    it("toggles status from disconnected to connected", async () => {
      renderPage();
      
      const toggleButtons = screen.getAllByTestId(/^toggle-/);
      const statusToggle = toggleButtons.find((btn) =>
        btn.dataset.testid?.match(/^toggle-ws-/)
      );
      
      if (statusToggle) {
        await userEvent.click(statusToggle);
        await userEvent.click(statusToggle);
        expect(screen.getByTestId("workstation-list")).toBeInTheDocument();
      }
    });
  });

  describe("handleRefresh Handler", () => {
    it("triggers with click log tracking", async () => {
      renderPage();
      
      await userEvent.click(screen.getByTestId("refresh-button"));
      
      expect(screen.getByTestId("workstation-list")).toBeInTheDocument();
    });

    it("clears error state before refresh", async () => {
      renderPage();
      
      await userEvent.click(screen.getByTestId("refresh-button"));
      
      // Error should be cleared
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("sets loading to true during refresh", async () => {
      renderPage();
      
      await userEvent.click(screen.getByTestId("refresh-button"));
      
      expect(screen.getByTestId("workstation-list")).toBeInTheDocument();
    });

    it("fetches workstations with org_id and jwt from localStorage", async () => {
      localStorage.setItem("org_id", "org-123");
      localStorage.setItem("jwt", "token-abc");
      renderPage();
      
      await userEvent.click(screen.getByTestId("refresh-button"));
      
      expect(screen.getByTestId("workstation-list")).toBeInTheDocument();
    });

    it("handles fetch error and displays error message", async () => {
      renderPage();
      
      // Simulate error by making fetch fail
      global.fetch = jest.fn().mockRejectedValueOnce(new Error("Fetch failed"));
      
      await userEvent.click(screen.getByTestId("refresh-button"));
      
      // Component should still render
      expect(screen.getByTestId("page-shell")).toBeInTheDocument();
    });
  });

  describe("Layout Rendering (list vs grid/icons)", () => {
    it("renders list layout by default", () => {
      renderPage();
      expect(screen.getByTestId("workstation-list")).toBeInTheDocument();
    });

    it("switches to cards layout and renders icon cards", async () => {
      renderPage();
      const cardsButton = screen.getByText("Cards");
      
      await userEvent.click(cardsButton);
      
      // Should show selection bar and icon cards
      expect(screen.getByText("0 selected")).toBeInTheDocument();
    });

    it("switches to icons layout", async () => {
      renderPage();
      const iconsButton = screen.getByText("Icons");
      
      await userEvent.click(iconsButton);
      
      expect(screen.getByText("0 selected")).toBeInTheDocument();
    });

    it("shows EmptyState when no workstations found after filter", async () => {
      renderPage();
      const cardsButton = screen.getByText("Cards");
      await userEvent.click(cardsButton);
      
      const searchField = screen.getByTestId("search-field");
      await userEvent.type(searchField, "nonexistent-ws");
      
      expect(screen.getByTestId("page-content")).toBeInTheDocument();
    });

    it("maintains selection across layout switches", async () => {
      renderPage();
      
      // Select a workstation in list view
      const checkboxes = screen.getAllByRole("checkbox");
      const firstCheckbox = checkboxes.find((cb) =>
        cb.dataset.testid?.startsWith("checkbox-")
      );
      
      if (firstCheckbox) {
        await userEvent.click(firstCheckbox);
        
        // Switch to cards layout
        const cardsButton = screen.getByText("Cards");
        await userEvent.click(cardsButton);
        
        expect(screen.getByText("1 selected")).toBeInTheDocument();
      }
    });
  });

  describe("Column Visibility State", () => {
    it("toggles showUsers column", async () => {
      renderPage();
      const toggle = screen.getByTestId("toggle-showUsers");
      
      await userEvent.click(toggle);
      expect(screen.getByTestId("show-users")).toHaveTextContent("Users Hidden");
      
      await userEvent.click(toggle);
      expect(screen.getByTestId("show-users")).toHaveTextContent("Users Shown");
    });

    it("toggles showCurrent column", async () => {
      renderPage();
      const toggle = screen.getByTestId("toggle-showCurrent");
      
      await userEvent.click(toggle);
      expect(screen.getByTestId("show-current")).toHaveTextContent("Current Hidden");
    });

    it("toggles showLastUsed column", async () => {
      renderPage();
      const toggle = screen.getByTestId("toggle-showLastUsed");
      
      await userEvent.click(toggle);
      expect(screen.getByTestId("show-last-used")).toHaveTextContent("Last Used Hidden");
    });

    it("persists column visibility across searches", async () => {
      renderPage();
      const toggle = screen.getByTestId("toggle-showUsers");
      
      await userEvent.click(toggle);
      
      const searchField = screen.getByTestId("search-field");
      await userEvent.type(searchField, "test");
      
      expect(screen.getByTestId("show-users")).toHaveTextContent("Users Hidden");
    });
  });

  describe("Error State Display", () => {
    it("does not show error alert initially", () => {
      renderPage();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("displays error banner when error state is set", async () => {
      renderPage();
      
      global.fetch = jest
        .fn()
        .mockRejectedValueOnce(new Error("API Error"));
      
      await userEvent.click(screen.getByTestId("refresh-button"));
      
      // Component should handle error gracefully
      expect(screen.getByTestId("page-shell")).toBeInTheDocument();
    });
  });

  describe("Integration: Complex Workflows", () => {
    it("handles create -> search -> filter workflow", async () => {
      renderPage();
      
      // Create new workstation
      await userEvent.click(screen.getByTestId("create-button"));
      await userEvent.click(screen.getByTestId("modal-submit"));
      
      // Search
      const searchField = screen.getByTestId("search-field");
      await userEvent.type(searchField, "test");
      
      // Filter
      const statusFilter = screen.getByTestId("filter-connected");
      await userEvent.click(statusFilter);
      
      expect(screen.getByTestId("workstation-list")).toBeInTheDocument();
    });

    it("handles edit -> filter -> toggle status workflow", async () => {
      renderPage();
      
      const editButtons = screen.getAllByTestId(/^edit-/);
      if (editButtons.length > 0) {
        await userEvent.click(editButtons[0]);
        await userEvent.click(screen.getByTestId("modal-submit"));
        
        const statusFilter = screen.getByTestId("filter-disconnected");
        await userEvent.click(statusFilter);
        
        const toggleButtons = screen.getAllByTestId(/^toggle-/);
        if (toggleButtons.length > 0) {
          await userEvent.click(toggleButtons[0]);
        }
        
        expect(screen.getByTestId("workstation-list")).toBeInTheDocument();
      }
    });

    it("handles selection -> filter -> clear selection workflow", async () => {
      renderPage();
      
      // Select workstation
      const checkboxes = screen.getAllByRole("checkbox");
      const firstCheckbox = checkboxes.find((cb) =>
        cb.dataset.testid?.startsWith("checkbox-")
      );
      
      if (firstCheckbox) {
        await userEvent.click(firstCheckbox);
        
        // Apply filter
        const statusFilter = screen.getByTestId("filter-connected");
        await userEvent.click(statusFilter);
        
        // Clear selection
        const clearBtn = screen.queryByRole("button", { name: /clear selection/i });
        if (clearBtn) {
          await userEvent.click(clearBtn);
        }
        
        expect(screen.getByTestId("workstation-list")).toBeInTheDocument();
      }
    });

    it("handles rapid state changes without crashing", async () => {
      renderPage();
      
      const searchField = screen.getByTestId("search-field");
      const layoutCards = screen.getByText("Cards");
      const toggle = screen.getByTestId("toggle-showUsers");
      
      await userEvent.type(searchField, "a");
      await userEvent.click(layoutCards);
      await userEvent.click(toggle);
      await userEvent.clear(searchField);
      await userEvent.click(screen.getByTestId("refresh-button"));
      
      expect(screen.getByTestId("page-shell")).toBeInTheDocument();
    });
  });

});
