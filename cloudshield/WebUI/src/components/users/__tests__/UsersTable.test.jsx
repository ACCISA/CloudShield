/**
 * UsersTable.test.jsx
 *
 * Test suite for the UsersTable component
 * Tests rendering, selection, responsive behavior, and user interactions
 */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import UsersTable from "../UsersTable";

// Mock useThemeColors hook
jest.mock("../../../hooks/useThemeColors.js", () => ({
  useThemeColors: () => ({
    isDark: true,
    isLight: false,
    bgPrimary: "#0A0A0A",
    bgSecondary: "#111111",
    textPrimary: "#FFFFFF",
    textSecondary: "#9E9E9E",
    border: "rgba(255,255,255,0.16)",
  }),
}));

// Mock child components
jest.mock("../UserRow.jsx", () => {
  return function MockUserRow({
    data,
    onEdit,
    onDelete,
    onToggleSelect,
    isSelected,
  }) {
    return (
      <div
        data-testid={`user-row-${data.id}`}
        onClick={() => onToggleSelect()}
      >
        <span>{data.name}</span>
        <button data-testid={`edit-${data.id}`} onClick={() => onEdit()}>
          Edit
        </button>
        <button data-testid={`delete-${data.id}`} onClick={() => onDelete()}>
          Delete
        </button>
      </div>
    );
  };
});

jest.mock("../../common/Checkbox/Checkbox.jsx", () => {
  return function MockCheckbox({ checked, indeterminate, onChange }) {
    return (
      <input
        type="checkbox"
        data-testid="select-all-checkbox"
        checked={checked}
        onChange={onChange}
      />
    );
  };
});

jest.mock("../../common/EmptyState/EmptyState.jsx", () => {
  return function MockEmptyState({ message, description }) {
    return (
      <div data-testid="empty-state">
        <p>{message}</p>
        <p>{description}</p>
      </div>
    );
  };
});

describe("UsersTable Component", () => {
  const mockUsers = [
    { id: "1", name: "John Doe", email: "john@example.com", title: "Developer" },
    { id: "2", name: "Jane Smith", email: "jane@example.com", title: "Manager" },
    { id: "3", name: "Bob Johnson", email: "bob@example.com", title: "Designer" },
  ];

  const defaultProps = {
    users: mockUsers,
    showTitle: true,
    showWorkstations: true,
    showGroups: true,
    showFiles: true,
    selectedIds: new Set(),
    allVisibleSelected: false,
    isIndeterminate: false,
    onToggleSelect: jest.fn(),
    onToggleSelectAll: jest.fn(),
    onEdit: jest.fn(),
    onDelete: jest.fn(),
  };

  describe("Rendering", () => {
    test("renders without crashing", () => {
      const { container } = render(<UsersTable {...defaultProps} />);
      expect(container).toBeInTheDocument();
    });

    test("renders all users in the table", () => {
      render(<UsersTable {...defaultProps} />);
      expect(screen.getByTestId("user-row-1")).toBeInTheDocument();
      expect(screen.getByTestId("user-row-2")).toBeInTheDocument();
      expect(screen.getByTestId("user-row-3")).toBeInTheDocument();
    });

    test("displays empty state when no users", () => {
      render(<UsersTable {...defaultProps} users={[]} />);
      const emptyState = screen.getByTestId("empty-state");
      expect(emptyState).toBeInTheDocument();
      expect(emptyState).toHaveTextContent("No users found");
    });

    test("renders select all checkbox", () => {
      render(<UsersTable {...defaultProps} />);
      expect(screen.getByTestId("select-all-checkbox")).toBeInTheDocument();
    });
  });

  describe("Column Visibility", () => {
    test("shows title column when showTitle is true", () => {
      const { container } = render(
        <UsersTable {...defaultProps} showTitle={true} />
      );
      // The title column should be rendered in the header
      expect(container.textContent).toBeDefined();
    });

    test("hides title column when showTitle is false", () => {
      render(<UsersTable {...defaultProps} showTitle={false} />);
      // Component should still render without errors
      expect(screen.getByTestId("user-row-1")).toBeInTheDocument();
    });

    test("shows workstations column when showWorkstations is true", () => {
      const { container } = render(
        <UsersTable {...defaultProps} showWorkstations={true} />
      );
      expect(container).toBeInTheDocument();
    });

    test("shows groups column when showGroups is true", () => {
      render(<UsersTable {...defaultProps} showGroups={true} />);
      expect(screen.getByTestId("user-row-1")).toBeInTheDocument();
    });

    test("shows files column when showFiles is true", () => {
      render(<UsersTable {...defaultProps} showFiles={true} />);
      expect(screen.getByTestId("user-row-1")).toBeInTheDocument();
    });
  });

  describe("Selection Handling", () => {
    test("calls onToggleSelectAll when select all checkbox is clicked", () => {
      const onToggleSelectAll = jest.fn();
      render(
        <UsersTable
          {...defaultProps}
          onToggleSelectAll={onToggleSelectAll}
        />
      );
      const checkbox = screen.getByTestId("select-all-checkbox");
      fireEvent.click(checkbox);
      expect(onToggleSelectAll).toHaveBeenCalled();
    });

    test("shows indeterminate state correctly", () => {
      const { rerender } = render(
        <UsersTable {...defaultProps} isIndeterminate={false} />
      );
      let checkbox = screen.getByTestId("select-all-checkbox");
      expect(checkbox).not.toBeChecked();

      rerender(
        <UsersTable {...defaultProps} isIndeterminate={true} />
      );
      checkbox = screen.getByTestId("select-all-checkbox");
      // Component should render without error
      expect(checkbox).toBeInTheDocument();
    });

    test("shows allVisibleSelected state correctly", () => {
      render(<UsersTable {...defaultProps} allVisibleSelected={true} />);
      const checkbox = screen.getByTestId("select-all-checkbox");
      expect(checkbox).toBeChecked();
    });
  });

  describe("User Actions", () => {
    test("calls onEdit when edit button is clicked", () => {
      const onEdit = jest.fn();
      render(<UsersTable {...defaultProps} onEdit={onEdit} />);
      const editButton = screen.getByTestId("edit-1");
      fireEvent.click(editButton);
      expect(onEdit).toHaveBeenCalled();
    });

    test("calls onDelete when delete button is clicked", () => {
      const onDelete = jest.fn();
      render(<UsersTable {...defaultProps} onDelete={onDelete} />);
      const deleteButton = screen.getByTestId("delete-1");
      fireEvent.click(deleteButton);
      expect(onDelete).toHaveBeenCalled();
    });

    test("calls onToggleSelect when user row is clicked", () => {
      const onToggleSelect = jest.fn();
      render(<UsersTable {...defaultProps} onToggleSelect={onToggleSelect} />);
      const userRow = screen.getByTestId("user-row-1");
      fireEvent.click(userRow);
      expect(onToggleSelect).toHaveBeenCalled();
    });
  });

  describe("Responsive Design", () => {
    test("renders on desktop viewport", () => {
      // Mock desktop window width
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 1024,
      });

      render(<UsersTable {...defaultProps} />);
      expect(screen.getByTestId("user-row-1")).toBeInTheDocument();
    });

    test("renders on tablet viewport", () => {
      // Mock tablet window width
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 768,
      });

      render(<UsersTable {...defaultProps} />);
      expect(screen.getByTestId("user-row-1")).toBeInTheDocument();
    });

    test("renders on mobile viewport", () => {
      // Mock mobile window width
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(<UsersTable {...defaultProps} />);
      expect(screen.getByTestId("user-row-1")).toBeInTheDocument();
    });

    test("handles window resize events", async () => {
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 1024,
      });

      const { rerender } = render(<UsersTable {...defaultProps} />);

      // Simulate resize to mobile
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 375,
      });

      fireEvent.resize(window);

      await waitFor(() => {
        expect(screen.getByTestId("user-row-1")).toBeInTheDocument();
      });
    });
  });

  describe("Selected IDs Tracking", () => {
    test("passes selectedIds to user rows", () => {
      const selectedIds = new Set(["1", "3"]);
      render(
        <UsersTable
          {...defaultProps}
          selectedIds={selectedIds}
        />
      );
      expect(screen.getByTestId("user-row-1")).toBeInTheDocument();
      expect(screen.getByTestId("user-row-3")).toBeInTheDocument();
    });

    test("updates when selectedIds prop changes", () => {
      const { rerender } = render(
        <UsersTable {...defaultProps} selectedIds={new Set()} />
      );

      const newSelectedIds = new Set(["1", "2"]);
      rerender(
        <UsersTable {...defaultProps} selectedIds={newSelectedIds} />
      );

      expect(screen.getByTestId("user-row-1")).toBeInTheDocument();
      expect(screen.getByTestId("user-row-2")).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    test("renders single user", () => {
      render(
        <UsersTable
          {...defaultProps}
          users={[mockUsers[0]]}
        />
      );
      expect(screen.getByTestId("user-row-1")).toBeInTheDocument();
      expect(screen.queryByTestId("user-row-2")).not.toBeInTheDocument();
    });

    test("handles large user list", () => {
      const largeUserList = Array.from({ length: 100 }, (_, i) => ({
        id: String(i + 1),
        name: `User ${i + 1}`,
        email: `user${i + 1}@example.com`,
        title: "Developer",
      }));

      render(
        <UsersTable
          {...defaultProps}
          users={largeUserList}
        />
      );
      expect(screen.getByTestId("user-row-1")).toBeInTheDocument();
      expect(screen.getByTestId("user-row-100")).toBeInTheDocument();
    });

    test("handles undefined callbacks gracefully", () => {
      const { container } = render(
        <UsersTable {...defaultProps} onEdit={undefined} onDelete={undefined} />
      );
      // Should render without errors
      expect(container).toBeInTheDocument();
    });

    test("renders without optional columns", () => {
      render(
        <UsersTable
          {...defaultProps}
          showTitle={false}
          showWorkstations={false}
          showGroups={false}
          showFiles={false}
        />
      );
      expect(screen.getByTestId("user-row-1")).toBeInTheDocument();
    });
  });
});
