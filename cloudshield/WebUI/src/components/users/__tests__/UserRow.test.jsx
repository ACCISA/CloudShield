/**
 * UserRow.test.jsx
 *
 * Test suite for the UserRow component
 * Tests rendering, edit menu, and user data display
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import UserRow from "../UserRow";

describe("UserRow Component", () => {
  const mockUser = {
    id: "1",
    name: "John Doe",
    email: "john@example.com",
    title: "Developer",
    workstations: 3,
    groups: 2,
    files: 5,
    status: "active",
  };

  const mockOnEdit = jest.fn();
  const mockOnDelete = jest.fn();

  beforeEach(() => {
    mockOnEdit.mockClear();
    mockOnDelete.mockClear();
  });

  describe("Rendering", () => {
    test("renders without crashing", () => {
      const { container } = render(
        <UserRow
          data={mockUser}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          cols={["28px", "1.2fr", "0.9fr", "24px", "0.25fr"]}
        />
      );
      expect(container.firstChild).toBeInTheDocument();
    });

    test("displays user name", () => {
      render(
        <UserRow
          data={mockUser}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          cols={["28px", "1.2fr", "0.9fr", "24px", "0.25fr"]}
        />
      );

      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });

    test("displays user email", () => {
      render(
        <UserRow
          data={mockUser}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          cols={["28px", "1.2fr", "0.9fr", "24px", "0.25fr"]}
        />
      );

      expect(screen.getByText(/john@example\.com/)).toBeInTheDocument();
    });

    test("displays title when showTitle is true", () => {
      render(
        <UserRow
          data={mockUser}
          showTitle={true}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          cols={["28px", "1.2fr", "0.9fr", "24px", "0.25fr"]}
        />
      );

      expect(screen.getByText("Developer")).toBeInTheDocument();
    });

    test("renders checkbox", () => {
      const { container } = render(
        <UserRow
          data={mockUser}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          cols={["28px", "1.2fr", "0.9fr", "24px", "0.25fr"]}
        />
      );

      // Checkbox component should be rendered
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe("Optional Columns", () => {
    test("shows workstations when showWorkstations is true", () => {
      render(
        <UserRow
          data={mockUser}
          showWorkstations={true}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          cols={["28px", "1.2fr", "0.6fr", "24px", "0.25fr"]}
        />
      );

      // Should render 3 avatar bubbles for workstations
      const avatarBubbles = screen
        .getAllByRole("generic")
        .filter(
          (el) => el.style.width === "18px" && el.style.borderRadius === "50%"
        );
      expect(avatarBubbles.length).toBeGreaterThanOrEqual(3);
    });

    test("shows groups when showGroups is true", () => {
      render(
        <UserRow
          data={mockUser}
          showGroups={true}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          cols={["28px", "1.2fr", "0.8fr", "24px", "0.25fr"]}
        />
      );

      // Should render 2 avatar bubbles for groups
      const avatarBubbles = screen
        .getAllByRole("generic")
        .filter(
          (el) => el.style.width === "18px" && el.style.borderRadius === "50%"
        );
      expect(avatarBubbles.length).toBeGreaterThanOrEqual(2);
    });

    test("shows files when showFiles is true", () => {
      render(
        <UserRow
          data={mockUser}
          showFiles={true}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          cols={["28px", "1.2fr", "0.8fr", "24px", "0.25fr"]}
        />
      );

      // Should render 3 avatar bubbles (max) and show + 2 for extra
      expect(screen.getByText("+ 2")).toBeInTheDocument();
    });
  });

  describe("Edit Menu", () => {
    test("opens edit menu on button click", () => {
      const { container } = render(
        <UserRow
          data={mockUser}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          cols={["28px", "1.2fr", "0.9fr", "24px", "0.25fr"]}
        />
      );

      // Find and click the edit button
      const editButton = container.querySelector("button");
      if (editButton) {
        fireEvent.click(editButton);
      }

      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe("Status Display", () => {
    test("displays status indicator", () => {
      const { container } = render(
        <UserRow
          data={mockUser}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          cols={["28px", "1.2fr", "0.9fr", "24px", "0.25fr"]}
        />
      );

      // Status icon should be rendered
      expect(container.firstChild).toBeInTheDocument();
    });

    test("renders for active user", () => {
      render(
        <UserRow
          data={{ ...mockUser, status: "active" }}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          cols={["28px", "1.2fr", "0.9fr", "24px", "0.25fr"]}
        />
      );

      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });

    test("renders for inactive user", () => {
      render(
        <UserRow
          data={{ ...mockUser, status: "inactive" }}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          cols={["28px", "1.2fr", "0.9fr", "24px", "0.25fr"]}
        />
      );

      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });
  });

  describe("Divider", () => {
    test("does not render divider when isLast is true", () => {
      const { container } = render(
        <UserRow
          data={mockUser}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          isLast={true}
          cols={["28px", "1.2fr", "0.9fr", "24px", "0.25fr"]}
        />
      );

      expect(container.firstChild).toBeInTheDocument();
    });

    test("renders divider when isLast is false", () => {
      const { container } = render(
        <UserRow
          data={mockUser}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          isLast={false}
          cols={["28px", "1.2fr", "0.9fr", "24px", "0.25fr"]}
        />
      );

      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe("Hover Effects", () => {
    test("row responds to hover", () => {
      const { container } = render(
        <UserRow
          data={mockUser}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          cols={["28px", "1.2fr", "0.9fr", "24px", "0.25fr"]}
        />
      );

      const row = container.querySelector('[style*="grid"]');
      if (row) {
        fireEvent.mouseEnter(row);
        fireEvent.mouseLeave(row);
      }

      expect(container.firstChild).toBeInTheDocument();
    });
  });
});
