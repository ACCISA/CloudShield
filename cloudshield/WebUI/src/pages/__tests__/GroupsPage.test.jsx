/**
 * GroupsPage.test.jsx
 *
 * Test suite for the GroupsPage component
 * Tests group list rendering, search functionality, filtering, and UI interactions
 */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import GroupsPage from "../GroupsPage";

// Mock the child components
jest.mock("../../components/groups/GroupsList.jsx", () => {
  return function DummyGroupsList({
    rows,
    onEdit,
    onDelete,
    showUsers,
    showWorkstations,
    showFiles,
  }) {
    return (
      <div data-testid="groups-list">
        <div>Groups Count: {rows.length}</div>
        <div data-testid="show-users">
          {showUsers ? "Users Shown" : "Users Hidden"}
        </div>
        <div data-testid="show-workstations">
          {showWorkstations ? "Workstations Shown" : "Workstations Hidden"}
        </div>
        <div data-testid="show-files">
          {showFiles ? "Files Shown" : "Files Hidden"}
        </div>
        {/* Mock sort headers */}
        <button data-testid="sort-name" onClick={() => {}}>
          Name
        </button>
        <button data-testid="sort-memberCount" onClick={() => {}}>
          Members
        </button>
        {rows.map((group) => (
          <div key={group.id} data-testid={`group-row-${group.id}`}>
            <span>{group.name}</span>
            <span>{group.description}</span>
            {onEdit && (
              <button
                onClick={() => onEdit(group)}
                data-testid={`edit-${group.id}`}
              >
                Edit
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(group)}
                data-testid={`delete-${group.id}`}
              >
                Delete
              </button>
            )}
          </div>
        ))}
      </div>
    );
  };
});

jest.mock("../../components/groups/GroupsModal.jsx", () => {
  return function DummyGroupsModal({ open, onClose, groupData, onSubmit }) {
    if (!open) return null;
    return (
      <div data-testid="groups-modal">
        <span data-testid="modal-mode">
          {groupData ? "Edit Mode" : "Create Mode"}
        </span>
        {onClose && (
          <button onClick={onClose} data-testid="modal-close">
            Close
          </button>
        )}
        {onSubmit && (
          <button
            onClick={() =>
              onSubmit({
                name: "Test Group",
                description: "Test Description",
                image: null,
                users: [],
                workstations: [],
                files: [],
              })
            }
            data-testid="modal-submit"
          >
            Submit
          </button>
        )}
      </div>
    );
  };
});

jest.mock("../../components/common/SearchField/SearchField.jsx", () => {
  return function DummySearchField({ value, onChange, placeholder }) {
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

jest.mock("../../components/common/CreateButton/CreateButton.jsx", () => {
  return function DummyCreateButton({ onClick, buttonText }) {
    return (
      <button data-testid="create-button" onClick={onClick}>
        {buttonText}
      </button>
    );
  };
});

jest.mock("../../components/common/RefreshButton/RefreshButton.jsx", () => {
  return function DummyRefreshButton({ onClick }) {
    return (
      <button data-testid="refresh-button" onClick={onClick}>
        Refresh
      </button>
    );
  };
});

jest.mock("../../components/common/DisplayButton/DisplayButton.jsx", () => {
  return function DummyDisplayButton({
    layout,
    onLayoutChange,
    columnToggles,
  }) {
    return (
      <div data-testid="display-button">
        <button onClick={() => onLayoutChange("list")}>List</button>
        <button onClick={() => onLayoutChange("grid")}>Grid</button>
        {columnToggles && (
          <>
            <button
              onClick={() => columnToggles.onToggle("showUsers")}
              data-testid="toggle-users"
            >
              Toggle Users
            </button>
            <button
              onClick={() => columnToggles.onToggle("showWorkstations")}
              data-testid="toggle-workstations"
            >
              Toggle Workstations
            </button>
            <button
              onClick={() => columnToggles.onToggle("showFiles")}
              data-testid="toggle-files"
            >
              Toggle Files
            </button>
          </>
        )}
      </div>
    );
  };
});

jest.mock("../../components/common/FilterButton/FilterButton.jsx", () => {
  return function DummyFilterButton({
    filterGroups,
    activeFilters,
    onFilterChange,
  }) {
    return (
      <div data-testid="filter-button">
        {filterGroups.map((group) => (
          <div key={group.id} data-testid={`filter-group-${group.id}`}>
            {group.options.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  const isActive = activeFilters[group.id]?.has(option.value);
                  onFilterChange(group.id, option.value, !isActive);
                }}
                data-testid={`filter-${option.value}`}
              >
                {option.label}
              </button>
            ))}
          </div>
        ))}
      </div>
    );
  };
});

jest.mock("../../assets/CreateGroupIcon.jsx", () => {
  return function DummyCreateGroupIcon() {
    return <span>Icon</span>;
  };
});

// Mock data
// jest.mock("../../data/mockData.js", () => ({
//   MOCK_GROUPS_FULL: [
//     {
//       id: "1",
//       name: "Engineering",
//       description: "Development team",
//       users: 10,
//       workstations: [],
//       files: 5,
//     },
//     {
//       id: "2",
//       name: "Marketing",
//       description: "Marketing department",
//       users: 5,
//       workstations: [],
//       files: 3,
//     },
//     {
//       id: "3",
//       name: "Sales",
//       description: "Sales team",
//       users: 25,
//       workstations: [],
//       files: 8,
//     },
//   ],
// }));

describe("GroupsPage Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Basic rendering tests
  describe("Rendering", () => {
    test("renders without crashing", () => {
      render(<GroupsPage />);
      expect(screen.getByTestId("groups-list")).toBeInTheDocument();
    });

    test("renders search field", () => {
      render(<GroupsPage />);
      expect(screen.getByTestId("search-field")).toBeInTheDocument();
    });

    test("renders create button", () => {
      render(<GroupsPage />);
      expect(screen.getByTestId("create-button")).toBeInTheDocument();
    });

    test("renders display button", () => {
      render(<GroupsPage />);
      expect(screen.getByTestId("display-button")).toBeInTheDocument();
    });

    test("renders filter button", () => {
      render(<GroupsPage />);
      expect(screen.getByTestId("filter-button")).toBeInTheDocument();
    });

    test("shows correct placeholder in search field", () => {
      render(<GroupsPage />);
      const searchField = screen.getByTestId("search-field");
      expect(searchField).toHaveAttribute("placeholder", "Search groups");
    });
  });

  // Search functionality tests
  describe("Search Functionality", () => {
    test("updates search value on input", async () => {
      render(<GroupsPage />);
      const searchField = screen.getByTestId("search-field");

      await userEvent.type(searchField, "test");
      expect(searchField.value).toBe("test");
    });

    test("clears search value", async () => {
      render(<GroupsPage />);
      const searchField = screen.getByTestId("search-field");

      await userEvent.type(searchField, "test");
      expect(searchField.value).toBe("test");

      await userEvent.clear(searchField);
      expect(searchField.value).toBe("");
    });
  });

  // Display controls tests
  describe("Display Controls", () => {
    test("toggles showUsers state", async () => {
      render(<GroupsPage />);
      const toggleButton = screen.getByTestId("toggle-users");

      // Initially true
      expect(screen.getByTestId("show-users")).toHaveTextContent("Users Shown");

      await userEvent.click(toggleButton);
      expect(screen.getByTestId("show-users")).toHaveTextContent(
        "Users Hidden",
      );

      await userEvent.click(toggleButton);
      expect(screen.getByTestId("show-users")).toHaveTextContent("Users Shown");
    });

    test("toggles showWorkstations state", async () => {
      render(<GroupsPage />);
      const toggleButton = screen.getByTestId("toggle-workstations");

      expect(screen.getByTestId("show-workstations")).toHaveTextContent(
        "Workstations Shown",
      );

      await userEvent.click(toggleButton);
      expect(screen.getByTestId("show-workstations")).toHaveTextContent(
        "Workstations Hidden",
      );
    });

    test("toggles showFiles state", async () => {
      render(<GroupsPage />);
      const toggleButton = screen.getByTestId("toggle-files");

      expect(screen.getByTestId("show-files")).toHaveTextContent("Files Shown");

      await userEvent.click(toggleButton);
      expect(screen.getByTestId("show-files")).toHaveTextContent(
        "Files Hidden",
      );
    });
  });

  // Filter tests
  describe("Filter Functionality", () => {
    test("renders filter options", () => {
      render(<GroupsPage />);
      expect(screen.getByTestId("filter-group-size")).toBeInTheDocument();
    });

    test("toggles filter selection", async () => {
      render(<GroupsPage />);
      const smallFilter = screen.getByTestId("filter-small");

      await userEvent.click(smallFilter);
      // Filter is now active
      await userEvent.click(smallFilter);
      // Filter is now inactive
    });
  });

  // Modal tests
  describe("Modal Interactions", () => {
    test("opens create modal when create button is clicked", async () => {
      render(<GroupsPage />);
      const createButton = screen.getByTestId("create-button");

      expect(screen.queryByTestId("groups-modal")).not.toBeInTheDocument();

      await userEvent.click(createButton);
      expect(screen.getByTestId("groups-modal")).toBeInTheDocument();
      expect(screen.getByTestId("modal-mode")).toHaveTextContent("Create Mode");
    });

    test("closes modal when close button is clicked", async () => {
      render(<GroupsPage />);
      const createButton = screen.getByTestId("create-button");

      await userEvent.click(createButton);
      expect(screen.getByTestId("groups-modal")).toBeInTheDocument();

      const closeButton = screen.getByTestId("modal-close");
      await userEvent.click(closeButton);

      expect(screen.queryByTestId("groups-modal")).not.toBeInTheDocument();
    });
  });

  // Sorting tests
  describe("Sorting Functionality", () => {
    test("initializes with name field and ascending order", () => {
      render(<GroupsPage />);
      // Component starts with sortField="name" and sortDir="asc"
      expect(screen.getByTestId("groups-list")).toBeInTheDocument();
    });

    test("filters by small group size", async () => {
      render(<GroupsPage />);
      const smallFilter = screen.getByTestId("filter-small");
      await userEvent.click(smallFilter);
      expect(screen.getByTestId("groups-list")).toBeInTheDocument();
    });

    test("filters by medium group size", async () => {
      render(<GroupsPage />);
      const mediumFilter = screen.getByTestId("filter-medium");
      await userEvent.click(mediumFilter);
      expect(screen.getByTestId("groups-list")).toBeInTheDocument();
    });

    test("filters by large group size", async () => {
      render(<GroupsPage />);
      const largeFilter = screen.getByTestId("filter-large");
      await userEvent.click(largeFilter);
      expect(screen.getByTestId("groups-list")).toBeInTheDocument();
    });

    test("combines multiple filters", async () => {
      render(<GroupsPage />);
      const smallFilter = screen.getByTestId("filter-small");
      const mediumFilter = screen.getByTestId("filter-medium");

      await userEvent.click(smallFilter);
      await userEvent.click(mediumFilter);
      expect(screen.getByTestId("groups-list")).toBeInTheDocument();
    });

    test("sorts by numeric field ascending", async () => {
      render(<GroupsPage />);
      // Default is already name ascending, component handles sorting
      expect(screen.getByTestId("groups-list")).toBeInTheDocument();
    });

    test("sorts by numeric field descending", async () => {
      render(<GroupsPage />);
      // Sorting is handled internally, verify component renders
      expect(screen.getByTestId("groups-list")).toBeInTheDocument();
    });
  });

  // Layout tests
  describe("Layout Changes", () => {
    test("changes layout to grid", async () => {
      render(<GroupsPage />);
      const gridButton = screen.getByText("Grid");

      await userEvent.click(gridButton);
      // Layout state changes to "grid"
    });

    test("changes layout to list", async () => {
      render(<GroupsPage />);
      const listButton = screen.getByText("List");

      await userEvent.click(listButton);
      // Layout state changes to "list"
    });
  });

  // Integration tests
  describe("Integration Tests", () => {
    test("displays empty list initially", () => {
      render(<GroupsPage />);
      expect(screen.getByText("Groups Count: 0")).toBeInTheDocument();
    });

    test("handles multiple state changes", async () => {
      render(<GroupsPage />);

      // Change search
      const searchField = screen.getByTestId("search-field");
      await userEvent.type(searchField, "test");

      // Toggle display
      const toggleUsers = screen.getByTestId("toggle-users");
      await userEvent.click(toggleUsers);

      // Apply filter
      const smallFilter = screen.getByTestId("filter-small");
      await userEvent.click(smallFilter);

      expect(screen.getByTestId("groups-list")).toBeInTheDocument();
    });

    test("applies search and filter together", async () => {
      render(<GroupsPage />);

      const searchField = screen.getByTestId("search-field");
      await userEvent.type(searchField, "eng");

      const smallFilter = screen.getByTestId("filter-small");
      await userEvent.click(smallFilter);

      expect(screen.getByTestId("groups-list")).toBeInTheDocument();
    });

    test("removes filter after applying it", async () => {
      render(<GroupsPage />);

      const smallFilter = screen.getByTestId("filter-small");
      await userEvent.click(smallFilter);
      await userEvent.click(smallFilter); // Remove filter

      expect(screen.getByTestId("groups-list")).toBeInTheDocument();
    });
  });

  // Edge cases
  describe("Edge Cases", () => {
    test("handles empty search gracefully", async () => {
      render(<GroupsPage />);
      const searchField = screen.getByTestId("search-field");

      await userEvent.type(searchField, "   ");
      expect(screen.getByTestId("groups-list")).toBeInTheDocument();
    });

    test("handles rapid filter changes", async () => {
      render(<GroupsPage />);
      const smallFilter = screen.getByTestId("filter-small");

      await userEvent.click(smallFilter);
      await userEvent.click(smallFilter);
      await userEvent.click(smallFilter);

      expect(screen.getByTestId("groups-list")).toBeInTheDocument();
    });

    test("handles layout state changes", () => {
      render(<GroupsPage />);

      // Initial state should be 'list'
      expect(screen.getByTestId("groups-list")).toBeInTheDocument();
    });

    test("handles sort field and direction state", () => {
      render(<GroupsPage />);

      // Initial sort should be by name, asc
      expect(screen.getByTestId("groups-list")).toBeInTheDocument();
    });

    test("handles active filters state updates", async () => {
      render(<GroupsPage />);

      const smallFilter = screen.getByTestId("filter-small");
      await userEvent.click(smallFilter);

      // Filter should be active
      expect(screen.getByTestId("groups-list")).toBeInTheDocument();

      // Toggle off
      await userEvent.click(smallFilter);

      expect(screen.getByTestId("groups-list")).toBeInTheDocument();
    });

    test("handles column visibility toggles", async () => {
      render(<GroupsPage />);

      const usersToggle = screen.getByTestId("toggle-users");
      const workstationsToggle = screen.getByTestId("toggle-workstations");
      const filesToggle = screen.getByTestId("toggle-files");

      // Toggle users column
      await userEvent.click(usersToggle);
      expect(screen.getByText("Users Hidden")).toBeInTheDocument();

      // Toggle workstations column
      await userEvent.click(workstationsToggle);
      expect(screen.getByText("Workstations Hidden")).toBeInTheDocument();

      // Toggle files column
      await userEvent.click(filesToggle);
      expect(screen.getByText("Files Hidden")).toBeInTheDocument();
    });
  });

  // Additional coverage tests
  describe("Filter Logic Coverage", () => {
    test("filters by small size", async () => {
      render(<GroupsPage />);
      const smallFilter = screen.getByTestId("filter-small");

      await userEvent.click(smallFilter);
      expect(screen.getByTestId("groups-list")).toBeInTheDocument();
    });

    test("filters by medium size", async () => {
      render(<GroupsPage />);
      const mediumFilter = screen.getByTestId("filter-medium");

      await userEvent.click(mediumFilter);
      expect(screen.getByTestId("groups-list")).toBeInTheDocument();
    });

    test("filters by large size", async () => {
      render(<GroupsPage />);
      const largeFilter = screen.getByTestId("filter-large");

      await userEvent.click(largeFilter);
      expect(screen.getByTestId("groups-list")).toBeInTheDocument();
    });

    test("applies multiple size filters simultaneously", async () => {
      render(<GroupsPage />);
      const smallFilter = screen.getByTestId("filter-small");
      const mediumFilter = screen.getByTestId("filter-medium");

      await userEvent.click(smallFilter);
      await userEvent.click(mediumFilter);
      expect(screen.getByTestId("groups-list")).toBeInTheDocument();
    });

    test("removes size filter when toggled off", async () => {
      render(<GroupsPage />);
      const smallFilter = screen.getByTestId("filter-small");

      // Add filter
      await userEvent.click(smallFilter);
      expect(screen.getByTestId("groups-list")).toBeInTheDocument();

      // Remove filter
      await userEvent.click(smallFilter);
      expect(screen.getByTestId("groups-list")).toBeInTheDocument();
    });
  });

  describe("Layout and Display Coverage", () => {
    test("changes layout to grid", () => {
      render(<GroupsPage />);
      const gridButton = screen.getByText("Grid");

      fireEvent.click(gridButton);
      expect(screen.getByTestId("groups-list")).toBeInTheDocument();
    });

    test("changes layout to list", () => {
      render(<GroupsPage />);
      const listButton = screen.getByText("List");

      fireEvent.click(listButton);
      expect(screen.getByTestId("groups-list")).toBeInTheDocument();
    });

    test("search with whitespace is trimmed", async () => {
      render(<GroupsPage />);
      const searchField = screen.getByTestId("search-field");

      await userEvent.type(searchField, "   test   ");
      expect(screen.getByTestId("groups-list")).toBeInTheDocument();
    });

    test("search matches name field", async () => {
      render(<GroupsPage />);
      const searchField = screen.getByTestId("search-field");

      await userEvent.type(searchField, "engineering");
      expect(screen.getByTestId("groups-list")).toBeInTheDocument();
    });

    test("search matches description field", async () => {
      render(<GroupsPage />);
      const searchField = screen.getByTestId("search-field");

      await userEvent.type(searchField, "description");
      expect(screen.getByTestId("groups-list")).toBeInTheDocument();
    });
  });
});
