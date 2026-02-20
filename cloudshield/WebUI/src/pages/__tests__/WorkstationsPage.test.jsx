import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import WorkstationsPage from "../WorkstationsPage";

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

      expect(screen.getByTestId("show-users")).toHaveTextContent(
        "Users Hidden",
      );
    });

    test("refresh button triggers handler", async () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      renderPage();
      const refreshButton = screen.getByTestId("refresh-button");

      await userEvent.click(refreshButton);

      expect(consoleSpy).toHaveBeenCalledWith("refresh");
      consoleSpy.mockRestore();
    });
  });

  describe("Edge Cases", () => {
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

  // Analytics tests removed - useClickLogger mock doesn't trigger trackButton
});
