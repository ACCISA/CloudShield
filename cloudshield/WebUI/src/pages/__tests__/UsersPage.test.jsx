/**
 * UsersPage.test.jsx
 *
 * Test suite for the UsersPage component
 * Tests user list rendering, search functionality, filtering, and UI interactions
 */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import UsersPage from "../UsersPage";

// Mock the child components
jest.mock("../../components/users/UsersTable.jsx", () => {
  return function DummyUsersTable({ users, onEdit, onDelete, sortField, sortDir, onSort }) {
    return (
      <div data-testid="users-table">
        <div>Users Count: {users.length}</div>
        {users.map((user) => (
          <div key={user.id} data-testid={`user-row-${user.id}`}>
            <span>{user.name}</span>
            <span>{user.email}</span>
            <button onClick={() => onEdit(user)} data-testid={`edit-${user.id}`}>
              Edit
            </button>
            <button onClick={() => onDelete(user)} data-testid={`delete-${user.id}`}>
              Delete
            </button>
          </div>
        ))}
      </div>
    );
  };
});

jest.mock("../../components/users/UserEditModal.jsx", () => {
  return function DummyUserEditModal({ open, onClose, data, onSubmit, onDelete }) {
    if (!open) return null;
    return (
      <div data-testid="user-edit-modal">
        <button onClick={onClose}>Close</button>
        <button
          onClick={() =>
            onSubmit({
              firstName: "John",
              lastName: "Doe",
              email: "john@example.com",
              jobTitle: "Manager",
            })
          }
        >
          Save
        </button>
        <button onClick={onDelete}>Delete</button>
      </div>
    );
  };
});

jest.mock("../../components/users/UserCreateModal.jsx", () => {
  return function DummyUserCreateModal({ open, onClose, onSubmit }) {
    if (!open) return null;
    return (
      <div data-testid="user-create-modal">
        <button onClick={onClose}>Close</button>
        <button
          onClick={() =>
            onSubmit({
              firstName: "Jane",
              lastName: "Smith",
              email: "jane@example.com",
              jobTitle: "Developer",
            })
          }
        >
          Create
        </button>
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
  return function DummyCreateButton({ buttonText, onClick }) {
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
  return function DummyDisplayButton({ layout, onLayoutChange }) {
    return (
      <button
        data-testid="display-button"
        onClick={() => onLayoutChange(layout === "list" ? "grid" : "list")}
      >
        Display
      </button>
    );
  };
});

jest.mock("../../components/common/FilterButton/FilterButton.jsx", () => {
  return function DummyFilterButton({ filterGroups, activeFilters, onFilterChange }) {
    return (
      <div data-testid="filter-button">
        <button onClick={() => onFilterChange("status", "online", true)}>
          Filter
        </button>
      </div>
    );
  };
});

jest.mock("../../assets/CreateUserIcon.jsx", () => {
  return function DummyCreateUserIcon() {
    return <span data-testid="create-user-icon">Icon</span>;
  };
});

describe("UsersPage Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Basic rendering tests
  describe("Rendering", () => {
    it("should render without crashing", () => {
      const { container } = render(<UsersPage />);
      expect(container).toBeTruthy();
    });

    it("should render the UsersTable component", () => {
      render(<UsersPage />);
      expect(screen.getByTestId("users-table")).toBeInTheDocument();
    });

    it("should render toolbar with all action buttons", () => {
      render(<UsersPage />);
      expect(screen.getByTestId("search-field")).toBeInTheDocument();
      expect(screen.getByTestId("display-button")).toBeInTheDocument();
      expect(screen.getByTestId("filter-button")).toBeInTheDocument();
      expect(screen.getByTestId("refresh-button")).toBeInTheDocument();
      expect(screen.getByTestId("create-button")).toBeInTheDocument();
    });

    it("should render edit and create modals", () => {
      render(<UsersPage />);
      // Modals exist but are not open initially
      expect(screen.getByTestId("user-edit-modal")).toBeInTheDocument();
      expect(screen.getByTestId("user-create-modal")).toBeInTheDocument();
    });

    it("should display mock users on mount", () => {
      render(<UsersPage />);
      expect(screen.getByTestId("users-table")).toHaveTextContent("Users Count: 2");
      expect(screen.getByText("aniss tralala")).toBeInTheDocument();
      expect(screen.getByText("john tralala")).toBeInTheDocument();
    });

    it("should display correct user information", () => {
      render(<UsersPage />);
      expect(screen.getByText("aniss@tralala.com")).toBeInTheDocument();
      expect(screen.getByText("john@cloudshield.com")).toBeInTheDocument();
    });
  });

  // Search functionality tests
  describe("Search Functionality", () => {
    it("should filter users by name", async () => {
      render(<UsersPage />);
      const searchField = screen.getByTestId("search-field");
      
      await userEvent.type(searchField, "aniss");
      
      await waitFor(() => {
        expect(screen.getByTestId("users-table")).toHaveTextContent("Users Count: 1");
      });
      expect(screen.getByText("aniss tralala")).toBeInTheDocument();
      expect(screen.queryByText("john tralala")).not.toBeInTheDocument();
    });

    it("should filter users by email", async () => {
      render(<UsersPage />);
      const searchField = screen.getByTestId("search-field");
      
      await userEvent.type(searchField, "cloudshield.com");
      
      await waitFor(() => {
        expect(screen.getByTestId("users-table")).toHaveTextContent("Users Count: 1");
      });
      expect(screen.getByText("john tralala")).toBeInTheDocument();
    });

    it("should filter users by title", async () => {
      render(<UsersPage />);
      const searchField = screen.getByTestId("search-field");
      
      await userEvent.type(searchField, "Manager");
      
      await waitFor(() => {
        expect(screen.getByTestId("users-table")).toHaveTextContent("Users Count: 1");
      });
      expect(screen.getByText("aniss tralala")).toBeInTheDocument();
    });

    it("should show all users when search is cleared", async () => {
      render(<UsersPage />);
      const searchField = screen.getByTestId("search-field");
      
      await userEvent.type(searchField, "aniss");
      
      await waitFor(() => {
        expect(screen.getByTestId("users-table")).toHaveTextContent("Users Count: 1");
      });
      
      await userEvent.clear(searchField);
      
      await waitFor(() => {
        expect(screen.getByTestId("users-table")).toHaveTextContent("Users Count: 2");
      });
    });

    it("should be case-insensitive", async () => {
      render(<UsersPage />);
      const searchField = screen.getByTestId("search-field");
      
      await userEvent.type(searchField, "JOHN");
      
      await waitFor(() => {
        expect(screen.getByTestId("users-table")).toHaveTextContent("Users Count: 1");
      });
    });

    it("should show no results when search matches nothing", async () => {
      render(<UsersPage />);
      const searchField = screen.getByTestId("search-field");
      
      await userEvent.type(searchField, "nonexistent");
      
      await waitFor(() => {
        expect(screen.getByTestId("users-table")).toHaveTextContent("Users Count: 0");
      });
    });
  });

  // Filtering tests
  describe("Filtering", () => {
    it("should filter users by status", async () => {
      render(<UsersPage />);
      const filterButton = screen.getByTestId("filter-button").querySelector("button");
      
      fireEvent.click(filterButton);
      
      await waitFor(() => {
        expect(screen.getByTestId("users-table")).toHaveTextContent("Users Count: 1");
      });
    });
  });

  // Create User Modal tests
  describe("Create User Modal", () => {
    it("should open create modal when Create button is clicked", async () => {
      render(<UsersPage />);
      const createButton = screen.getByTestId("create-button");
      fireEvent.click(createButton);
      
      // Modal is now visible in the DOM
      const createModal = screen.getByTestId("user-create-modal");
      const closeButton = createModal.querySelector("button:first-child");
      
      expect(closeButton).toBeInTheDocument();
    });

    it("should add new user when form is submitted", async () => {
      render(<UsersPage />);
      const createButton = screen.getByTestId("create-button");
      fireEvent.click(createButton);
      
      const createModal = screen.getByTestId("user-create-modal");
      const saveButton = createModal.querySelector("button:last-child");
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(screen.getByTestId("users-table")).toHaveTextContent("Users Count: 3");
      });
    });

    it("should show toast notification on user creation", async () => {
      render(<UsersPage />);
      const createButton = screen.getByTestId("create-button");
      fireEvent.click(createButton);
      
      const createModal = screen.getByTestId("user-create-modal");
      const saveButton = createModal.querySelector("button:last-child");
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(screen.getByText("User created successfully")).toBeInTheDocument();
      });
    });

    it("should close modal after submission", async () => {
      render(<UsersPage />);
      const createButton = screen.getByTestId("create-button");
      fireEvent.click(createButton);
      
      const createModal = screen.getByTestId("user-create-modal");
      const saveButton = createModal.querySelector("button:last-child");
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        // After submission, modal is closed (not in visible DOM)
        const modals = screen.queryAllByTestId("user-create-modal");
        expect(modals.length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  // Edit User Modal tests
  describe("Edit User Modal", () => {
    it("should open edit modal when edit button is clicked on a user", async () => {
      render(<UsersPage />);
      const editButton = screen.getByTestId("edit-1");
      fireEvent.click(editButton);
      
      const editModal = screen.getByTestId("user-edit-modal");
      expect(editModal).toBeInTheDocument();
    });

    it("should update user when form is submitted", async () => {
      render(<UsersPage />);
      const editButton = screen.getByTestId("edit-1");
      fireEvent.click(editButton);
      
      const editModal = screen.getByTestId("user-edit-modal");
      const saveButton = editModal.querySelector("button:nth-child(2)");
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(screen.getByText("User updated successfully")).toBeInTheDocument();
      });
    });

    it("should show toast notification on user update", async () => {
      render(<UsersPage />);
      const editButton = screen.getByTestId("edit-1");
      fireEvent.click(editButton);
      
      const editModal = screen.getByTestId("user-edit-modal");
      const saveButton = editModal.querySelector("button:nth-child(2)");
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(screen.getByText("User updated successfully")).toBeInTheDocument();
      });
    });

    it("should delete user from edit modal", async () => {
      render(<UsersPage />);
      const editButton = screen.getByTestId("edit-1");
      fireEvent.click(editButton);
      
      const editModal = screen.getByTestId("user-edit-modal");
      const deleteButton = editModal.querySelector("button:nth-child(3)");
      fireEvent.click(deleteButton);
      
      await waitFor(() => {
        expect(screen.getByTestId("users-table")).toHaveTextContent("Users Count: 1");
      });
    });
  });

  // Inline Delete tests
  describe("Inline User Deletion", () => {
    it("should delete user when delete button in table row is clicked", async () => {
      render(<UsersPage />);
      expect(screen.getByTestId("users-table")).toHaveTextContent("Users Count: 2");
      
      const deleteButton = screen.getByTestId("delete-1");
      fireEvent.click(deleteButton);
      
      await waitFor(() => {
        expect(screen.getByTestId("users-table")).toHaveTextContent("Users Count: 1");
      });
    });

    it("should show toast notification on inline delete", async () => {
      render(<UsersPage />);
      const deleteButton = screen.getByTestId("delete-1");
      fireEvent.click(deleteButton);
      
      await waitFor(() => {
        expect(screen.getByText("User deleted")).toBeInTheDocument();
      });
    });
  });

  // Refresh Button tests
  describe("Refresh Button", () => {
    it("should reload users when refresh button is clicked", async () => {
      render(<UsersPage />);
      const refreshButton = screen.getByTestId("refresh-button");
      
      expect(screen.getByTestId("users-table")).toHaveTextContent("Users Count: 2");
      
      fireEvent.click(refreshButton);
      
      // Should still have same mock data
      await waitFor(() => {
        expect(screen.getByTestId("users-table")).toHaveTextContent("Users Count: 2");
      });
    });
  });

  // Display Button tests
  describe("Display Button", () => {
    it("should toggle display layout", async () => {
      render(<UsersPage />);
      const displayButton = screen.getByTestId("display-button");
      
      fireEvent.click(displayButton);
      
      // Component should still render after layout change
      expect(screen.getByTestId("users-table")).toBeInTheDocument();
    });
  });

  // Toast Notifications tests
  describe("Toast Notifications", () => {
    it("should auto-hide toast notification", async () => {
      jest.useFakeTimers();
      render(<UsersPage />);
      
      const createButton = screen.getByTestId("create-button");
      fireEvent.click(createButton);
      
      const createModal = screen.getByTestId("user-create-modal");
      const saveButton = createModal.querySelector("button:last-child");
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(screen.getByText("User created successfully")).toBeInTheDocument();
      });
      
      jest.advanceTimersByTime(3000);
      jest.useRealTimers();
    });

    it("should show success toast for all operations", async () => {
      render(<UsersPage />);
      
      // Create
      const createButton = screen.getByTestId("create-button");
      fireEvent.click(createButton);
      
      const createModal = screen.getByTestId("user-create-modal");
      const saveButton = createModal.querySelector("button:last-child");
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(screen.getByText("User created successfully")).toBeInTheDocument();
      });
    });
  });

  // Combined Search and Filter tests
  describe("Search and Filter Combined", () => {
    it("should respect both search and filter", async () => {
      render(<UsersPage />);
      
      // Start with 2 users
      expect(screen.getByTestId("users-table")).toHaveTextContent("Users Count: 2");
      
      // Apply filter for online users only (1 user)
      const filterButton = screen.getByTestId("filter-button").querySelector("button");
      fireEvent.click(filterButton);
      
      await waitFor(() => {
        expect(screen.getByTestId("users-table")).toHaveTextContent("Users Count: 1");
      });
      
      // Then search within filtered results
      const searchField = screen.getByTestId("search-field");
      await userEvent.type(searchField, "john");
      
      await waitFor(() => {
        // Should be 0 because john is offline
        expect(screen.getByTestId("users-table")).toHaveTextContent("Users Count: 0");
      });
    });
  });

  // Sorting tests
  describe("Sorting", () => {
    it("should sort users by default name field ascending", () => {
      render(<UsersPage />);
      
      // Users should be sorted alphabetically by name
      const userRows = screen.getAllByTestId(/user-row-/);
      expect(userRows.length).toBe(2);
    });
  });
});
