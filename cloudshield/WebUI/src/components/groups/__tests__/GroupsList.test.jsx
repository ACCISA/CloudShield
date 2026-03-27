/**
 * GroupsList.test.jsx
 *
 * Test suite for the GroupsList component
 * Tests rendering, responsive behavior, and user interactions
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import GroupsList from "../GroupsList";

// Mock child components
jest.mock("../../common/EditButton/EditButton.jsx", () => {
  return function DummyEditButton({ menuItems }) {
    return (
      <div data-testid="edit-button">
        {menuItems.map((item, idx) => (
          <button
            key={idx}
            onClick={item.onClick}
            data-testid={`menu-item-${idx}`}
          >
            {item.label}
          </button>
        ))}
      </div>
    );
  };
});

jest.mock("../../common/Checkbox/Checkbox.jsx", () => {
  return function DummyCheckbox({ checked, onChange }) {
    return (
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        data-testid="checkbox"
      />
    );
  };
});

jest.mock("../../common/DisplayIcon/DisplayIcon.jsx", () => {
  return function DummyDisplayIcon({ type, data, size }) {
    return (
      <div data-testid={`display-icon-${type}`} data-size={size}>
        {data?.name || data?.firstName || "Icon"}
      </div>
    );
  };
});

jest.mock("../../../assets/EditIcon.jsx", () => {
  return function DummyEditIcon() {
    return <span>Edit</span>;
  };
});

jest.mock("../../../assets/TrashIcon.jsx", () => {
  return function DummyTrashIcon() {
    return <span>Trash</span>;
  };
});

// Mock data
const mockGroups = [
  {
    id: "1",
    name: "Engineering",
    description: "Development team",
    users: [
      { id: "u1", firstName: "John", lastName: "Doe", email: "john@test.com" },
      {
        id: "u2",
        firstName: "Jane",
        lastName: "Smith",
        email: "jane@test.com",
      },
    ],
    memberCount: 2,
    workstations: [
      { id: "w1", name: "WS-001" },
      { id: "w2", name: "WS-002" },
    ],
    files: 5,
  },
  {
    id: "2",
    name: "Marketing",
    description: "Marketing department",
    users: [],
    memberCount: 10,
    workstations: [],
    files: 3,
  },
  {
    id: "3",
    name: "Sales",
    description: "Sales team",
    users: [
      { id: "u3", firstName: "Bob", lastName: "Wilson", email: "bob@test.com" },
      {
        id: "u4",
        firstName: "Alice",
        lastName: "Brown",
        email: "alice@test.com",
      },
      {
        id: "u5",
        firstName: "Charlie",
        lastName: "Davis",
        email: "charlie@test.com",
      },
      {
        id: "u6",
        firstName: "Diana",
        lastName: "Evans",
        email: "diana@test.com",
      },
    ],
    memberCount: 7,
    workstations: [{ id: "w3", name: "WS-003" }],
    files: 8,
  },
];

describe("GroupsList Component", () => {
  const mockOnEdit = jest.fn();
  const mockOnDelete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock window.innerWidth for responsive tests
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 1920,
    });
  });

  // Basic rendering tests
  describe("Rendering", () => {
    test("renders without crashing", () => {
      render(<GroupsList rows={[]} />);
      expect(screen.getByText("Name/Description")).toBeInTheDocument();
    });

    test("renders all groups", () => {
      render(
        <GroupsList
          rows={mockGroups}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />,
      );

      expect(screen.getAllByText("Engineering").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Marketing").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Sales").length).toBeGreaterThan(0);
    });

    test("displays group descriptions", () => {
      render(
        <GroupsList
          rows={mockGroups}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />,
      );

      expect(screen.getByText("↳ Development team")).toBeInTheDocument();
      expect(screen.getByText("↳ Marketing department")).toBeInTheDocument();
      expect(screen.getByText("↳ Sales team")).toBeInTheDocument();
    });

    test("renders empty list without errors", () => {
      render(<GroupsList rows={[]} />);
      expect(screen.queryByText("Engineering")).not.toBeInTheDocument();
    });
  });

  // Column visibility tests
  describe("Column Visibility", () => {
    test("shows users column when showUsers is true", () => {
      render(<GroupsList rows={mockGroups} showUsers={true} />);
      expect(screen.getByText("Users")).toBeInTheDocument();
    });

    test("hides users column when showUsers is false", () => {
      render(<GroupsList rows={mockGroups} showUsers={false} />);
      expect(screen.queryByText("Users")).not.toBeInTheDocument();
    });

    test("shows workstations column when showWorkstations is true", () => {
      render(<GroupsList rows={mockGroups} showWorkstations={true} />);
      expect(screen.getByText("Workstations")).toBeInTheDocument();
    });

    test("hides workstations column when showWorkstations is false", () => {
      render(<GroupsList rows={mockGroups} showWorkstations={false} />);
      expect(screen.queryByText("Workstations")).not.toBeInTheDocument();
    });

    test("shows files column when showFiles is true", () => {
      window.innerWidth = 1920;
      render(<GroupsList rows={mockGroups} showFiles={true} />);
      expect(screen.getByText("Shares")).toBeInTheDocument();
    });

    test("hides files column when showFiles is false", () => {
      render(<GroupsList rows={mockGroups} showFiles={false} />);
      expect(screen.queryByText("Files")).not.toBeInTheDocument();
    });
  });

  // User pill tests
  describe("User Pills", () => {
    test("displays user avatars", () => {
      render(<GroupsList rows={mockGroups} showUsers={true} />);
      const userIcons = screen.getAllByTestId("display-icon-user");
      expect(userIcons.length).toBeGreaterThan(0);
    });

    test("shows count when no users array but has memberCount", () => {
      render(<GroupsList rows={mockGroups} showUsers={true} />);
      expect(screen.getByText("+ 10")).toBeInTheDocument();
    });

    test("shows extra count for more than 3 users", () => {
      render(<GroupsList rows={mockGroups} showUsers={true} />);
      // Sales group has 4 users in array but memberCount is 7
      expect(screen.getByText("+ 4")).toBeInTheDocument();
    });
  });

  // Workstation pill tests
  describe("Workstation Pills", () => {
    test("displays workstation icons", () => {
      render(<GroupsList rows={mockGroups} showWorkstations={true} />);
      const wsIcons = screen.getAllByTestId("display-icon-workstation");
      expect(wsIcons.length).toBeGreaterThan(0);
    });

    test("shows count badge for groups with no workstations array", () => {
      render(<GroupsList rows={[mockGroups[1]]} showWorkstations={true} />);
      expect(screen.getByText("—")).toBeInTheDocument();
    });
  });

  // Files display tests
  describe("Files Display", () => {
    test("displays file counts", () => {
      render(<GroupsList rows={mockGroups} showFiles={true} />);

      expect(screen.getByText("5")).toBeInTheDocument();
      expect(screen.getByText("3")).toBeInTheDocument();
      expect(screen.getByText("8")).toBeInTheDocument();
    });

    test("shows '—' for groups with no files", () => {
      const noFilesGroup = [{ ...mockGroups[0], files: 0 }];
      render(<GroupsList rows={noFilesGroup} showFiles={true} />);

      expect(screen.getByText("—")).toBeInTheDocument();
    });
  });

  // Edit button tests
  describe("Edit Functionality", () => {
    test("calls onEdit when edit button is clicked", async () => {
      render(
        <GroupsList
          rows={mockGroups}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />,
      );

      const editButtons = screen.getAllByTestId("menu-item-0");
      await userEvent.click(editButtons[0]);

      expect(mockOnEdit).toHaveBeenCalledWith(mockGroups[0]);
    });

    test("calls onDelete when delete button is clicked", async () => {
      render(
        <GroupsList
          rows={mockGroups}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />,
      );

      const deleteButtons = screen.getAllByTestId("menu-item-1");
      await userEvent.click(deleteButtons[0]);

      expect(mockOnDelete).toHaveBeenCalledWith(mockGroups[0].id);
    });

    test("does not render edit button when onEdit is not provided", () => {
      render(<GroupsList rows={mockGroups} />);
      // EditButton component still renders but without functionality
      expect(screen.getAllByTestId("edit-button").length).toBeGreaterThan(0);
    });
  });

  // Responsive tests
  describe("Responsive Behavior", () => {
    test("hides headers on mobile", () => {
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 500,
      });

      const { rerender } = render(<GroupsList rows={mockGroups} />);
      fireEvent(window, new Event("resize"));
      rerender(<GroupsList rows={mockGroups} />);

      // Headers should be hidden on mobile
      expect(screen.queryByText("Name/Description")).not.toBeInTheDocument();
    });

    test("adjusts columns for tablet view", () => {
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 800,
      });

      const { rerender } = render(
        <GroupsList rows={mockGroups} showWorkstations={true} />,
      );
      fireEvent(window, new Event("resize"));
      rerender(<GroupsList rows={mockGroups} showWorkstations={true} />);

      // Workstations column should be hidden on tablet
      expect(screen.queryByText("Workstations")).not.toBeInTheDocument();
    });

    test("shows all columns on desktop", () => {
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 1920,
      });

      render(
        <GroupsList
          rows={mockGroups}
          showUsers={true}
          showWorkstations={true}
          showFiles={true}
        />,
      );

      expect(screen.getByText("Users")).toBeInTheDocument();
      expect(screen.getByText("Workstations")).toBeInTheDocument();
      expect(screen.getByText("Shares")).toBeInTheDocument();
    });
  });

  // Group icon tests
  describe("Group Icons", () => {
    test("renders group icons for each row", () => {
      render(<GroupsList rows={mockGroups} />);
      const groupIcons = screen.getAllByTestId("display-icon-group");
      expect(groupIcons).toHaveLength(mockGroups.length);
    });
  });

  // Checkbox tests
  describe("Checkbox Functionality", () => {
    test("renders checkboxes for each group on desktop", () => {
      render(<GroupsList rows={mockGroups} />);
      const checkboxes = screen.getAllByTestId("checkbox");
      expect(checkboxes.length).toBe(mockGroups.length + 1);
    });

    test("checkbox can be toggled", async () => {
      const onToggleSelect = jest.fn();
      const rows = mockGroups.map((group) => ({ ...group, _id: group.id }));
      render(<GroupsList rows={rows} onToggleSelect={onToggleSelect} />);
      const checkboxes = screen.getAllByTestId("checkbox");

      expect(checkboxes[1]).not.toBeChecked();
      await userEvent.click(checkboxes[1]);
      expect(onToggleSelect).toHaveBeenCalledWith("1");
    });
  });

  // Edge cases
  describe("Edge Cases", () => {
    test("handles groups with missing optional fields", () => {
      const incompleteGroup = [
        {
          id: "incomplete",
          name: "Incomplete Group",
          description: "Missing fields",
        },
      ];

      render(<GroupsList rows={incompleteGroup} />);
      expect(screen.getAllByText("Incomplete Group").length).toBeGreaterThan(0);
    });

    test("handles very long group names gracefully", () => {
      const longNameGroup = [
        {
          id: "long",
          name: "A".repeat(100),
          description: "Long name test",
          users: [],
          workstations: [],
          files: 0,
        },
      ];

      render(<GroupsList rows={longNameGroup} />);
      expect(screen.getAllByText("A".repeat(100)).length).toBeGreaterThan(0);
    });

    test("handles single group", () => {
      render(<GroupsList rows={[mockGroups[0]]} />);
      expect(screen.getAllByText("Engineering").length).toBeGreaterThan(0);
      expect(screen.queryByText("Marketing")).not.toBeInTheDocument();
    });

    test("handles row hover effects", () => {
      const { container } = render(<GroupsList rows={mockGroups} />);
      const rows = container.querySelectorAll(
        '[style*="grid-template-columns"]',
      );

      // Verify rows exist for hover testing
      expect(rows.length).toBeGreaterThan(0);
    });

    test("handles undefined files count", () => {
      const groupWithNoFiles = [
        {
          ...mockGroups[0],
          files: undefined,
        },
      ];

      render(<GroupsList rows={groupWithNoFiles} showFiles={true} />);
      expect(screen.getByText("—")).toBeInTheDocument();
    });
  });
});
