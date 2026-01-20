/**
 * UsersTable.test.jsx
 *
 * Test suite for the UsersTable component
 * Tests table rendering, headers, and user rows
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import UsersTable from "../UsersTable";

describe("UsersTable Component", () => {
  const mockUsers = [
    {
      id: "1",
      name: "John Doe",
      email: "john@example.com",
      title: "Developer",
      workstations: 3,
      groups: 2,
      files: 5,
      status: "active",
    },
    {
      id: "2",
      name: "Jane Smith",
      email: "jane@example.com",
      title: "Designer",
      workstations: 2,
      groups: 1,
      files: 3,
      status: "inactive",
    },
  ];

  const mockOnEdit = jest.fn();
  const mockOnDelete = jest.fn();
  const mockOnSort = jest.fn();

  beforeEach(() => {
    mockOnEdit.mockClear();
    mockOnDelete.mockClear();
    mockOnSort.mockClear();
  });

  describe("Rendering", () => {
    test("renders without crashing", () => {
      const { container } = render(
        <UsersTable
          users={mockUsers}
          showTitle={true}
          showWorkstations={true}
          showGroups={true}
          showFiles={true}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );
      expect(container.firstChild).toBeInTheDocument();
    });

    test("renders all user rows", () => {
      render(
        <UsersTable
          users={mockUsers}
          showTitle={true}
          showWorkstations={true}
          showGroups={true}
          showFiles={true}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByText("John Doe")).toBeInTheDocument();
      expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    });

    test("renders with empty users array", () => {
      const { container } = render(
        <UsersTable
          users={[]}
          showTitle={true}
          showWorkstations={true}
          showGroups={true}
          showFiles={true}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe("Table Headers", () => {
    test("renders Name/Email header", () => {
      render(
        <UsersTable
          users={mockUsers}
          showTitle={true}
          showWorkstations={true}
          showGroups={true}
          showFiles={true}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByText("Name/Email")).toBeInTheDocument();
    });

    test("renders Title header when showTitle is true", () => {
      render(
        <UsersTable
          users={mockUsers}
          showTitle={true}
          showWorkstations={false}
          showGroups={false}
          showFiles={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByText("Title")).toBeInTheDocument();
    });

    test("does not render Title header when showTitle is false", () => {
      render(
        <UsersTable
          users={mockUsers}
          showTitle={false}
          showWorkstations={false}
          showGroups={false}
          showFiles={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.queryByText("Title")).not.toBeInTheDocument();
    });

    test("renders Workstations header when showWorkstations is true", () => {
      render(
        <UsersTable
          users={mockUsers}
          showTitle={false}
          showWorkstations={true}
          showGroups={false}
          showFiles={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByText("Workstations")).toBeInTheDocument();
    });

    test("renders Groups header when showGroups is true", () => {
      render(
        <UsersTable
          users={mockUsers}
          showTitle={false}
          showWorkstations={false}
          showGroups={true}
          showFiles={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByText("Groups")).toBeInTheDocument();
    });

    test("renders Files header when showFiles is true", () => {
      render(
        <UsersTable
          users={mockUsers}
          showTitle={false}
          showWorkstations={false}
          showGroups={false}
          showFiles={true}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByText("Files")).toBeInTheDocument();
    });
  });

  describe("Column Visibility", () => {
    test("shows all columns when all flags are true", () => {
      render(
        <UsersTable
          users={mockUsers}
          showTitle={true}
          showWorkstations={true}
          showGroups={true}
          showFiles={true}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByText("Title")).toBeInTheDocument();
      expect(screen.getByText("Workstations")).toBeInTheDocument();
      expect(screen.getByText("Groups")).toBeInTheDocument();
      expect(screen.getByText("Files")).toBeInTheDocument();
    });

    test("hides optional columns when flags are false", () => {
      render(
        <UsersTable
          users={mockUsers}
          showTitle={false}
          showWorkstations={false}
          showGroups={false}
          showFiles={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.queryByText("Title")).not.toBeInTheDocument();
      expect(screen.queryByText("Workstations")).not.toBeInTheDocument();
      expect(screen.queryByText("Groups")).not.toBeInTheDocument();
      expect(screen.queryByText("Files")).not.toBeInTheDocument();
    });
  });

  describe("User Data Display", () => {
    test("displays user emails", () => {
      render(
        <UsersTable
          users={mockUsers}
          showTitle={false}
          showWorkstations={false}
          showGroups={false}
          showFiles={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByText(/john@example\.com/)).toBeInTheDocument();
      expect(screen.getByText(/jane@example\.com/)).toBeInTheDocument();
    });

    test("displays user titles when column is visible", () => {
      render(
        <UsersTable
          users={mockUsers}
          showTitle={true}
          showWorkstations={false}
          showGroups={false}
          showFiles={false}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByText("Developer")).toBeInTheDocument();
      expect(screen.getByText("Designer")).toBeInTheDocument();
    });
  });

  describe("Single User", () => {
    test("renders table with single user", () => {
      render(
        <UsersTable
          users={[mockUsers[0]]}
          showTitle={true}
          showWorkstations={true}
          showGroups={true}
          showFiles={true}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByText("John Doe")).toBeInTheDocument();
      expect(screen.queryByText("Jane Smith")).not.toBeInTheDocument();
    });
  });

  describe("Many Users", () => {
    test("renders table with many users", () => {
      const manyUsers = Array.from({ length: 10 }, (_, i) => ({
        id: `${i + 1}`,
        name: `User ${i + 1}`,
        email: `user${i + 1}@example.com`,
        title: "Employee",
        workstations: i + 1,
        groups: 1,
        files: 2,
        status: "active",
      }));

      render(
        <UsersTable
          users={manyUsers}
          showTitle={true}
          showWorkstations={true}
          showGroups={true}
          showFiles={true}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByText("User 1")).toBeInTheDocument();
      expect(screen.getByText("User 10")).toBeInTheDocument();
    });
  });
});
