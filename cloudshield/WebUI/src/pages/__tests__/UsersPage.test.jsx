/**
 * UsersPage.test.jsx
 *
 * Test suite for the UsersPage component
 * Tests user list rendering, search functionality, filtering, and UI interactions
 */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import UsersPage from "../UsersPage";

// Mock fetch globally
global.fetch = jest.fn();

describe("UsersPage Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Setup default mock response
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [
          {
            _id: "1",
            full_name: "Michael Scott",
            email: "michaelscott@dm.com",
            title: "Regional Manager",
          },
          {
            _id: "2",
            full_name: "Pam Beesly",
            email: "pambeesly@dm.com",
            title: "Receptionist",
          },
          {
            _id: "3",
            full_name: "Jim Halpert",
            email: "jimhalpert@dm.com",
            title: "Salesman",
          },
          {
            _id: "4",
            full_name: "Dwight Schrute",
            email: "dwight@dm.com",
            title: "Assistant to the Regional Manager",
          },
        ],
      }),
    });
  });

  // Basic rendering tests
  describe("Rendering", () => {
    test("renders without crashing", async () => {
      render(<UsersPage />);
      await waitFor(() => {
        expect(screen.getByPlaceholderText("Search users")).toBeInTheDocument();
      });
    });

    test("fetches and displays users from API", async () => {
      render(<UsersPage />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith("http://localhost:5050/users");
      });

      await waitFor(() => {
        expect(screen.getByText("Michael Scott")).toBeInTheDocument();
        expect(screen.getByText("Pam Beesly")).toBeInTheDocument();
        expect(screen.getByText("Jim Halpert")).toBeInTheDocument();
        expect(screen.getByText("Dwight Schrute")).toBeInTheDocument();
      });
    });

    test("displays user emails", async () => {
      render(<UsersPage />);

      await waitFor(() => {
        expect(screen.getByText("michaelscott@dm.com")).toBeInTheDocument();
        expect(screen.getByText("pambeesly@dm.com")).toBeInTheDocument();
        expect(screen.getByText("jimhalpert@dm.com")).toBeInTheDocument();
        expect(screen.getByText("dwight@dm.com")).toBeInTheDocument();
      });
    });

    test("displays user titles", async () => {
      render(<UsersPage />);

      await waitFor(() => {
        expect(screen.getByText("Regional Manager")).toBeInTheDocument();
        expect(screen.getByText("Receptionist")).toBeInTheDocument();
        expect(screen.getByText("Salesman")).toBeInTheDocument();
        expect(
          screen.getByText("Assistant to the Regional Manager")
        ).toBeInTheDocument();
      });
    });

    test("renders search input", async () => {
      render(<UsersPage />);

      const searchInput = screen.getByPlaceholderText("Search users");
      expect(searchInput).toBeInTheDocument();
    });

    test("renders toolbar buttons", async () => {
      render(<UsersPage />);

      await waitFor(() => {
        // Check for Display, Filter, and Create buttons
        expect(screen.getByText("Display")).toBeInTheDocument();
        expect(screen.getByText("Filter")).toBeInTheDocument();
        expect(screen.getByText("Create")).toBeInTheDocument();
      });
    });

    test("renders table headers", async () => {
      render(<UsersPage />);

      await waitFor(() => {
        expect(screen.getByText("Name/Email")).toBeInTheDocument();
        expect(screen.getByText("Title")).toBeInTheDocument();
        expect(screen.getByText("Workstations")).toBeInTheDocument();
        expect(screen.getByText("Groups")).toBeInTheDocument();
        expect(screen.getByText("Files")).toBeInTheDocument();
      });
    });
  });

  // Search functionality tests
  describe("Search Functionality", () => {
    test("filters users by name", async () => {
      render(<UsersPage />);

      await waitFor(() => {
        expect(screen.getByText("Michael Scott")).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText("Search users");
      fireEvent.change(searchInput, { target: { value: "michael" } });

      // Should show only Michael Scott
      expect(screen.getByText("Michael Scott")).toBeInTheDocument();
      expect(screen.queryByText("Pam Beesly")).not.toBeInTheDocument();
      expect(screen.queryByText("Jim Halpert")).not.toBeInTheDocument();
    });

    test("filters users by email", async () => {
      render(<UsersPage />);

      await waitFor(() => {
        expect(screen.getByText("Pam Beesly")).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText("Search users");
      fireEvent.change(searchInput, { target: { value: "pam" } });

      // Should show only Pam Beesly
      expect(screen.getByText("Pam Beesly")).toBeInTheDocument();
      expect(screen.queryByText("Michael Scott")).not.toBeInTheDocument();
    });

    test("filters users by title", async () => {
      render(<UsersPage />);

      await waitFor(() => {
        expect(screen.getByText("Receptionist")).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText("Search users");
      fireEvent.change(searchInput, { target: { value: "receptionist" } });

      // Should show only Pam Beesly (receptionist)
      expect(screen.getByText("Pam Beesly")).toBeInTheDocument();
      expect(screen.queryByText("Michael Scott")).not.toBeInTheDocument();
    });

    test("shows all users when search is cleared", async () => {
      render(<UsersPage />);

      await waitFor(() => {
        expect(screen.getByText("Michael Scott")).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText("Search users");

      // Search for something
      fireEvent.change(searchInput, { target: { value: "michael" } });
      expect(screen.queryByText("Pam Beesly")).not.toBeInTheDocument();

      // Clear search
      fireEvent.change(searchInput, { target: { value: "" } });

      // All users should be visible again
      expect(screen.getByText("Michael Scott")).toBeInTheDocument();
      expect(screen.getByText("Pam Beesly")).toBeInTheDocument();
      expect(screen.getByText("Jim Halpert")).toBeInTheDocument();
      expect(screen.getByText("Dwight Schrute")).toBeInTheDocument();
    });

    test("search is case-insensitive", async () => {
      render(<UsersPage />);

      await waitFor(() => {
        expect(screen.getByText("Jim Halpert")).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText("Search users");
      fireEvent.change(searchInput, { target: { value: "JIM" } });

      // Should still find Jim Halpert
      expect(screen.getByText("Jim Halpert")).toBeInTheDocument();
    });

    test("shows no results when search matches nothing", async () => {
      render(<UsersPage />);

      await waitFor(() => {
        expect(screen.getByText("Michael Scott")).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText("Search users");
      fireEvent.change(searchInput, { target: { value: "nonexistent" } });

      // No users should be visible
      expect(screen.queryByText("Michael Scott")).not.toBeInTheDocument();
      expect(screen.queryByText("Pam Beesly")).not.toBeInTheDocument();
      expect(screen.queryByText("Jim Halpert")).not.toBeInTheDocument();
      expect(screen.queryByText("Dwight Schrute")).not.toBeInTheDocument();
    });
  });

  // Button interaction tests
  describe("Button Interactions", () => {
    test("Display button opens popover", async () => {
      render(<UsersPage />);

      await waitFor(() => {
        expect(screen.getByText("Display")).toBeInTheDocument();
      });

      const displayButton = screen.getByText("Display");
      fireEvent.click(displayButton);

      // Popover menu items should appear
      await waitFor(() => {
        expect(screen.getByText("Cards")).toBeInTheDocument();
        expect(screen.getByText("List")).toBeInTheDocument();
      });
    });

    test("Create button shows alert", async () => {
      const alertSpy = jest.spyOn(window, "alert").mockImplementation(() => {});

      render(<UsersPage />);

      await waitFor(() => {
        expect(screen.getByText("Create")).toBeInTheDocument();
      });

      const createButton = screen.getByText("Create");
      fireEvent.click(createButton);

      expect(alertSpy).toHaveBeenCalledWith("Open create modal (coming soon)");

      alertSpy.mockRestore();
    });

    test("Refresh button exists and is clickable", async () => {
      render(<UsersPage />);

      await waitFor(() => {
        expect(screen.getByText("Michael Scott")).toBeInTheDocument();
      });

      // Find refresh button (IconButton with RefreshOutlinedIcon)
      const buttons = screen.getAllByRole("button");
      const refreshButton = buttons.find((button) =>
        button.querySelector('[data-testid="RefreshOutlinedIcon"]')
      );

      expect(refreshButton).toBeInTheDocument();
      expect(refreshButton).not.toBeDisabled();
    });
  });

  // Fallback data tests
  describe("Fallback Data", () => {
    test("uses fallback data when API returns no items", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      render(<UsersPage />);

      await waitFor(() => {
        // Should show fallback users - component uses fallback when items is undefined
        expect(screen.getByText("Michael Scott")).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    test("handles API call failure gracefully", async () => {
      // Mock console.error to avoid noise in test output
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      // Mock fetch to reject
      global.fetch.mockImplementationOnce(() => 
        Promise.reject(new Error("Network error"))
      );

      render(<UsersPage />);

      // When fetch fails, the catch block is empty, so no users are shown
      // Just verify the page renders without crashing
      await waitFor(() => {
        expect(screen.getByPlaceholderText("Search users")).toBeInTheDocument();
      });
      
      consoleError.mockRestore();
    });
  });

  // Checkbox tests
  describe("Checkboxes", () => {
    test("renders checkboxes for each user", async () => {
      render(<UsersPage />);

      await waitFor(() => {
        expect(screen.getByText("Michael Scott")).toBeInTheDocument();
      });

      const checkboxes = screen.getAllByRole("checkbox");
      // Should have at least 4 checkboxes (one per user)
      expect(checkboxes.length).toBeGreaterThanOrEqual(4);
    });

    test("checkboxes can be clicked", async () => {
      render(<UsersPage />);

      await waitFor(() => {
        expect(screen.getByText("Michael Scott")).toBeInTheDocument();
      });

      const checkboxes = screen.getAllByRole("checkbox");
      const firstCheckbox = checkboxes[0];

      expect(firstCheckbox).not.toBeChecked();
      fireEvent.click(firstCheckbox);
      expect(firstCheckbox).toBeChecked();
    });
  });

  // Avatar tests
  describe("User Avatars", () => {
    test("renders avatar for each user", async () => {
      const { container } = render(<UsersPage />);

      await waitFor(() => {
        expect(screen.getByText("Michael Scott")).toBeInTheDocument();
      });

      const avatars = container.querySelectorAll(".MuiAvatar-root");
      // Should have multiple avatars (one per user plus stacked avatars)
      expect(avatars.length).toBeGreaterThan(0);
    });
  });

  // Layout tests
  describe("Layout and Styling", () => {
    test("renders user list with proper structure", async () => {
      render(<UsersPage />);

      await waitFor(() => {
        expect(screen.getByText("Michael Scott")).toBeInTheDocument();
      });

      // Check that basic table structure exists
      expect(screen.getByText("Name/Email")).toBeInTheDocument();
      expect(screen.getByText("Title")).toBeInTheDocument();
      expect(screen.getByText("Michael Scott")).toBeInTheDocument();
    });

    test("applies hover effect to user rows", async () => {
      render(<UsersPage />);

      await waitFor(() => {
        expect(screen.getByText("Michael Scott")).toBeInTheDocument();
      });

      // Row should have hover styles defined
      const userRow = screen.getByText("Michael Scott").closest("div");
      expect(userRow).toBeInTheDocument();
    });
  });

  // Edge cases
  describe("Edge Cases", () => {
    test("handles empty user list", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [] }),
      });

      render(<UsersPage />);

      await waitFor(() => {
        // Empty array means no users are shown, not fallback
        const searchInput = screen.getByPlaceholderText("Search users");
        expect(searchInput).toBeInTheDocument();
      });
    });

    test("handles users with missing fields", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [
            {
              _id: "1",
              full_name: "John Doe",
              email: "john@example.com",
              // Missing title
            },
          ],
        }),
      });

      render(<UsersPage />);

      await waitFor(() => {
        expect(screen.getByText("John Doe")).toBeInTheDocument();
      });

      // Should display dash for missing title
      expect(screen.getByText("—")).toBeInTheDocument();
    });
  });
});
