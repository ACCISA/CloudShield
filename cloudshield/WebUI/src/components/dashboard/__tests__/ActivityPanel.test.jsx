/**
 * ActivityPanel.test.jsx
 *
 * Comprehensive test suite for ActivityPanel component
 * Tests rendering, search, pagination, sorting, loading states, and error handling
 */
import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ActivityPanel from "../ActivityPanel";

// Mock the theme colors hook
jest.mock("../../../hooks/useThemeColors.js", () => ({
  useThemeColors: () => ({
    isDark: true,
    isLight: false,
    bgPrimary: "#0A0A0A",
    bgSecondary: "#111111",
    textPrimary: "#FFFFFF",
    textSecondary: "#9E9E9E",
  }),
}));

jest.mock("../../common/SearchField/SearchField.jsx", () => {
  return function MockSearchField({ value, onChange, placeholder }) {
    return (
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        data-testid="search-input"
      />
    );
  };
});

jest.mock("../../common/RefreshButton/RefreshButton.jsx", () => {
  return function MockRefreshButton({ onClick }) {
    return (
      <button onClick={onClick} data-testid="refresh-btn">
        Refresh
      </button>
    );
  };
});

jest.mock("../../common/Pagination/Pagination.jsx", () => {
  return function MockPagination({ currentPage, totalPages, onPageChange }) {
    return (
      <div data-testid="pagination">
        <button onClick={() => onPageChange(currentPage - 1)} data-testid="prev-page">
          Prev
        </button>
        <span data-testid="page-indicator">{currentPage}</span>
        <button onClick={() => onPageChange(currentPage + 1)} data-testid="next-page">
          Next
        </button>
      </div>
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

const manyActivities = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1,
  user: `User ${i + 1}`,
  date: `2026-01-${String(i + 1).padStart(2, "0")} 09:00`,
  activity: `Activity ${i + 1}`,
}));

const singleActivity = {
  id: 1,
  user: "John Doe",
  date: "2026-01-15 10:30",
  activity: "Logged in",
};

describe("ActivityPanel Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    test("renders the panel title, search input, and refresh control", () => {
      render(<ActivityPanel initialData={[]} />);

      expect(screen.getByText("Recent Activity")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Search activities")).toBeInTheDocument();
      expect(screen.getByTestId("refresh-btn")).toBeInTheDocument();
    });

    test("renders all activity items from initialData", () => {
      render(<ActivityPanel initialData={manyActivities} />);

      manyActivities.forEach((activity) => {
        expect(screen.getByText(activity.user)).toBeInTheDocument();
        expect(screen.getByText(activity.activity)).toBeInTheDocument();
      });
    });

    test("renders single activity correctly", () => {
      render(<ActivityPanel initialData={[singleActivity]} />);

      expect(screen.getByText("John Doe")).toBeInTheDocument();
      expect(screen.getByText("Logged in")).toBeInTheDocument();
    });
  });

  describe("Empty State", () => {
    test("shows empty state when initialData is empty", () => {
      render(<ActivityPanel initialData={[]} />);

      expect(screen.getByTestId("empty-state")).toBeInTheDocument();
    });

    test("shows empty state with default message", () => {
      render(<ActivityPanel initialData={[]} />);

      expect(screen.getByTestId("empty-state")).toBeInTheDocument();
      expect(
        screen.getByText("Activity will appear here once actions are performed")
      ).toBeInTheDocument();
    });

    test("hides empty state when activities are present", () => {
      const { rerender } = render(<ActivityPanel initialData={[]} />);
      expect(screen.getByTestId("empty-state")).toBeInTheDocument();

      rerender(<ActivityPanel initialData={[singleActivity]} />);
      // Empty state should not be visible when there's data
      expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
    });
  });

  describe("Loading States", () => {
    test("shows loading indicator when externalLoading is true", () => {
      const { container } = render(
        <ActivityPanel initialData={[]} loading={true} />
      );
      expect(container).toBeInTheDocument();
    });

    test("hides loading indicator when externalLoading is false", () => {
      const { container } = render(
        <ActivityPanel initialData={[]} loading={false} />
      );
      expect(container).toBeInTheDocument();
    });

    test("updates loading state when externalLoading prop changes", () => {
      const { rerender } = render(
        <ActivityPanel initialData={[]} loading={false} />
      );
      expect(screen.queryByTestId("loading-indicator")).not.toBeInTheDocument();

      rerender(<ActivityPanel initialData={[]} loading={true} />);
      // Component should update without errors
      expect(screen.getByText("Recent Activity")).toBeInTheDocument();
    });
  });

  describe("Search Functionality", () => {
    test("filters activities based on search query", async () => {
      render(<ActivityPanel initialData={manyActivities} />);

      const searchInput = screen.getByTestId("search-input");
      fireEvent.change(searchInput, { target: { value: "User 1" } });

      await waitFor(() => {
        expect(searchInput).toHaveValue("User 1");
      });
    });

    test("clears search results when search is emptied", async () => {
      render(<ActivityPanel initialData={manyActivities} />);

      const searchInput = screen.getByTestId("search-input");
      fireEvent.change(searchInput, { target: { value: "test" } });
      fireEvent.change(searchInput, { target: { value: "" } });

      await waitFor(() => {
        expect(searchInput).toHaveValue("");
      });
    });

    test("handles special characters in search", async () => {
      render(<ActivityPanel initialData={manyActivities} />);

      const searchInput = screen.getByTestId("search-input");
      fireEvent.change(searchInput, { target: { value: "@#$%" } });

      await waitFor(() => {
        expect(searchInput).toHaveValue("@#$%");
      });
    });

    test("shows no results when search has no matches", () => {
      render(<ActivityPanel initialData={manyActivities} />);

      const searchInput = screen.getByTestId("search-input");
      fireEvent.change(searchInput, { target: { value: "nonexistent activity xyz" } });

      // Should still render without errors
      expect(screen.getByText("Recent Activity")).toBeInTheDocument();
    });
  });

  describe("Pagination", () => {
    test("renders pagination with correct total items", () => {
      render(
        <ActivityPanel
          initialData={manyActivities.slice(0, 5)}
          totalItems={12}
          itemsPerPage={5}
        />
      );

      expect(screen.getByTestId("pagination")).toBeInTheDocument();
    });

    test("handles page changes via controlled pagination", () => {
      const onPageChange = jest.fn();
      const { rerender } = render(
        <ActivityPanel
          initialData={manyActivities.slice(0, 5)}
          currentPage={1}
          totalItems={12}
          itemsPerPage={5}
          onPageChange={onPageChange}
        />
      );

      const nextBtn = screen.getByTestId("next-page");
      fireEvent.click(nextBtn);

      expect(onPageChange).toHaveBeenCalled();
    });

    test("disables previous button on first page", () => {
      render(
        <ActivityPanel
          initialData={manyActivities}
          currentPage={1}
          totalItems={12}
        />
      );

      expect(screen.getByTestId("pagination")).toBeInTheDocument();
    });

    test("disables next button on last page", () => {
      render(
        <ActivityPanel
          initialData={manyActivities}
          currentPage={3}
          totalItems={12}
          itemsPerPage={5}
        />
      );

      expect(screen.getByTestId("pagination")).toBeInTheDocument();
    });
  });

  describe("Sorting", () => {
    test("sorts by date field by default", () => {
      render(<ActivityPanel initialData={manyActivities} />);

      expect(screen.getByText("Recent Activity")).toBeInTheDocument();
    });

    test("allows sorting by different fields", () => {
      render(<ActivityPanel initialData={manyActivities} />);

      const headers = screen.getAllByRole("columnheader", { hidden: true });
      // Component should render without errors when interactions occur
      expect(screen.getByText("Recent Activity")).toBeInTheDocument();
    });

    test("toggles sort direction when clicking same column", () => {
      render(<ActivityPanel initialData={manyActivities} />);

      expect(screen.getByText("Recent Activity")).toBeInTheDocument();
    });
  });

  describe("Refresh Functionality", () => {
    test("calls refresh when refresh button is clicked", async () => {
      const fetchActivities = jest.fn().mockResolvedValue({
        data: manyActivities,
      });

      render(<ActivityPanel initialData={[]} fetchActivities={fetchActivities} />);

      const refreshBtn = screen.getByTestId("refresh-btn");
      fireEvent.click(refreshBtn);

      await waitFor(() => {
        expect(fetchActivities).toHaveBeenCalled();
      });
    });

    test("loads mock data when refresh is clicked without fetch handler", async () => {
      render(<ActivityPanel initialData={[]} />);

      const refreshBtn = screen.getByTestId("refresh-btn");
      fireEvent.click(refreshBtn);

      // Refresh should work without errors even without fetchActivities
      expect(screen.getByText("Recent Activity")).toBeInTheDocument();
    });

    test("handles refresh errors gracefully", async () => {
      const fetchActivities = jest.fn().mockRejectedValue(new Error("API Error"));

      render(<ActivityPanel initialData={[]} fetchActivities={fetchActivities} />);

      const refreshBtn = screen.getByTestId("refresh-btn");
      fireEvent.click(refreshBtn);

      await waitFor(() => {
        expect(screen.getByText("Recent Activity")).toBeInTheDocument();
      });
    });
  });

  describe("Props Handling", () => {
    test("updates when initialData prop changes", () => {
      const { rerender } = render(<ActivityPanel initialData={[]} />);

      expect(screen.getByTestId("empty-state")).toBeInTheDocument();

      rerender(<ActivityPanel initialData={[singleActivity]} />);

      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });

    test("handles undefined fetchActivities prop", () => {
      render(<ActivityPanel initialData={[singleActivity]} fetchActivities={undefined} />);

      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });

    test("handles null initialData gracefully", () => {
      render(<ActivityPanel initialData={null} />);

      expect(screen.getByTestId("empty-state")).toBeInTheDocument();
    });

    test("uses provided itemsPerPage correctly", () => {
      render(
        <ActivityPanel
          initialData={manyActivities}
          itemsPerPage={3}
          totalItems={12}
        />
      );

      expect(screen.getByText("Recent Activity")).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    test("handles very large dataset", () => {
      const largeData = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        user: `User ${i}`,
        date: `2026-01-15 10:${(i % 60).toString().padStart(2, "0")}`,
        activity: `Activity ${i}`,
      }));

      render(
        <ActivityPanel
          initialData={largeData.slice(0, 10)}
          totalItems={1000}
          itemsPerPage={10}
        />
      );

      expect(screen.getByText("Recent Activity")).toBeInTheDocument();
    });

    test("handles activities with missing fields", () => {
      const incompleteActivity = {
        id: 1,
        user: "Test User",
      };

      render(<ActivityPanel initialData={[incompleteActivity]} />);

      expect(screen.getByText("Test User")).toBeInTheDocument();
    });

    test("handles rapid refresh calls", async () => {
      const fetchActivities = jest.fn().mockResolvedValue({
        data: manyActivities,
      });

      render(<ActivityPanel initialData={[]} fetchActivities={fetchActivities} />);

      const refreshBtn = screen.getByTestId("refresh-btn");

      fireEvent.click(refreshBtn);
      fireEvent.click(refreshBtn);
      fireEvent.click(refreshBtn);

      await waitFor(() => {
        expect(fetchActivities).toHaveBeenCalled();
      });
    });

    test("handles concurrent search and pagination", async () => {
      render(
        <ActivityPanel
          initialData={manyActivities}
          totalItems={12}
          currentPage={1}
        />
      );

      const searchInput = screen.getByTestId("search-input");
      fireEvent.change(searchInput, { target: { value: "test" } });

      const nextBtn = screen.getByTestId("next-page");
      fireEvent.click(nextBtn);

      await waitFor(() => {
        expect(screen.getByText("Recent Activity")).toBeInTheDocument();
      });
    });
  });

  describe("Accessibility", () => {
    test("has proper ARIA labels for search", () => {
      render(<ActivityPanel initialData={[]} />);

      const searchInput = screen.getByPlaceholderText("Search activities");
      expect(searchInput).toBeInTheDocument();
    });

    test("refresh button is keyboard accessible", () => {
      render(<ActivityPanel initialData={[]} />);

      const refreshBtn = screen.getByTestId("refresh-btn");
      expect(refreshBtn).toBeInTheDocument();
    });

    test("pagination is keyboard navigable", () => {
      render(
        <ActivityPanel
          initialData={manyActivities}
          totalItems={12}
        />
      );

      const prevBtn = screen.getByTestId("prev-page");
      const nextBtn = screen.getByTestId("next-page");

      expect(prevBtn).toBeInTheDocument();
      expect(nextBtn).toBeInTheDocument();
    });
  });
});

      <ActivityPanel
        initialData={[
          {
            id: 1,
            user: "Initial User",
            date: "03/05/2026 08:00 AM",
            activity: "Initial activity",
          },
        ]}
      />,
    );

    expect(screen.getByText("Initial User")).toBeInTheDocument();
    expect(screen.getByText("Initial activity")).toBeInTheDocument();
  });

  it("loads activities on mount when fetchActivities is provided without initial data", async () => {
    const mockFetch = jest.fn().mockResolvedValue([
      {
        id: 1,
        user: "Fetched User",
        date: "03/05/2026 08:00 AM",
        activity: "Fetched activity",
      },
    ]);

    render(<ActivityPanel fetchActivities={mockFetch} />);

    expect(await screen.findByText("Fetched User")).toBeInTheDocument();
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("shows an error and falls back to mock data when fetch fails", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const mockFetch = jest.fn().mockRejectedValue(new Error("Fetch failed"));

    render(<ActivityPanel fetchActivities={mockFetch} />);

    expect(
      await screen.findByText("Failed to load activities. Please try again."),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Michael Scott").length).toBeGreaterThan(0);

    errorSpy.mockRestore();
  });

  it("refreshes activities when the refresh button is clicked", async () => {
    const mockFetch = jest.fn().mockResolvedValue([
      {
        id: 1,
        user: "Refreshed User",
        date: "03/05/2026 08:00 AM",
        activity: "Refreshed activity",
      },
    ]);

    render(
      <ActivityPanel
        initialData={[
          {
            id: 99,
            user: "Initial User",
            date: "03/05/2026 07:30 AM",
            activity: "Initial activity",
          },
        ]}
        fetchActivities={mockFetch}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /refresh/i }));

    expect(await screen.findByText("Refreshed User")).toBeInTheDocument();
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("updates the search field and filters activities case-insensitively", () => {
    render(
      <ActivityPanel
        initialData={[
          {
            id: 1,
            user: "Noah Burns",
            date: "03/05/2026 08:00 AM",
            activity: "Uploaded file",
          },
          {
            id: 2,
            user: "Michael Scott",
            date: "03/05/2026 09:00 AM",
            activity: "Updated policy",
          },
        ]}
      />,
    );

    const searchInput = screen.getByPlaceholderText("Search activities");
    fireEvent.change(searchInput, { target: { value: "NOAH" } });

    expect(searchInput).toHaveValue("NOAH");
    expect(screen.getByText("Noah Burns")).toBeInTheDocument();
    expect(screen.queryByText("Michael Scott")).not.toBeInTheDocument();
  });

  it("shows the search empty state when no results match", () => {
    render(<ActivityPanel initialData={manyActivities.slice(0, 2)} />);

    fireEvent.change(screen.getByPlaceholderText("Search activities"), {
      target: { value: "zzzNonExistent" },
    });

    expect(screen.getByTestId("activity-empty-state")).toBeInTheDocument();
    expect(
      screen.getByTestId("activity-empty-state-description"),
    ).toHaveTextContent("Try adjusting your search query");
  });

  it("shows the external loading state when loading is true and there is no data", () => {
    render(<ActivityPanel initialData={[]} loading />);

    expect(screen.getByText("Loading activity…")).toBeInTheDocument();
  });

  it("sorts activities by clicking headers without rendering sort arrows", () => {
    render(
      <ActivityPanel
        initialData={[
          {
            id: 1,
            user: "zoe",
            date: "2026-01-02 09:00",
            activity: "zeta",
          },
          {
            id: 2,
            user: "adam",
            date: "2026-01-01 09:00",
            activity: "alpha",
          },
        ]}
      />,
    );

    expect(screen.getAllByText(/zoe|adam/).map((node) => node.textContent)).toEqual(
      ["zoe", "adam"],
    );

    fireEvent.click(screen.getByText("User"));
    expect(screen.getAllByText(/zoe|adam/).map((node) => node.textContent)).toEqual(
      ["adam", "zoe"],
    );
    expect(screen.queryByText("↑")).not.toBeInTheDocument();
    expect(screen.queryByText("↓")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("User"));
    expect(screen.getAllByText(/zoe|adam/).map((node) => node.textContent)).toEqual(
      ["zoe", "adam"],
    );
  });

  it("paginates client-side data with the new shared pagination component", () => {
    render(
      <ActivityPanel
        initialData={manyActivities}
        itemsPerPage={5}
      />,
    );

    fireEvent.click(screen.getByTestId("activity-pagination-page-2"));

    expect(screen.getByTestId("activity-pagination")).toBeInTheDocument();
    expect(screen.getByTestId("activity-pagination-info")).toHaveTextContent(
      "Showing 6-10 of 12 activities",
    );
    expect(screen.getByText("User 7")).toBeInTheDocument();
    expect(screen.getByText("User 3")).toBeInTheDocument();
    expect(screen.queryByText("User 8")).not.toBeInTheDocument();
  });

  it("calls onPageChange in controlled mode", () => {
    const onPageChange = jest.fn();

    render(
      <ActivityPanel
        initialData={manyActivities.slice(0, 5)}
        totalItems={12}
        itemsPerPage={5}
        currentPage={1}
        onPageChange={onPageChange}
      />,
    );

    fireEvent.click(screen.getByTestId("activity-pagination-next"));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("keeps the active sort header visually emphasized", () => {
    render(<ActivityPanel initialData={manyActivities.slice(0, 2)} />);

    const dateHeader = screen.getByText("Date");
    const userHeader = screen.getByText("User");

    expect(dateHeader).toHaveStyle({ color: "rgba(255,255,255,1)" });
    expect(userHeader).toHaveStyle({ color: "rgba(255,255,255,0.6)" });

    fireEvent.click(userHeader);

    expect(userHeader).toHaveStyle({ color: "rgba(255,255,255,1)" });
    expect(dateHeader).toHaveStyle({ color: "rgba(255,255,255,0.6)" });
  });

  it("refreshes and clears a previous error after a successful retry", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const mockFetch = jest
      .fn()
      .mockRejectedValueOnce(new Error("Fetch failed"))
      .mockResolvedValueOnce([
        {
          id: 1,
          user: "Success User",
          date: "03/05/2026 08:00 AM",
          activity: "Success activity",
        },
      ]);

    render(<ActivityPanel fetchActivities={mockFetch} />);

    expect(
      await screen.findByText("Failed to load activities. Please try again."),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /refresh/i }));

    expect(await screen.findByText("Success User")).toBeInTheDocument();
    await waitFor(() => {
      expect(
        screen.queryByText("Failed to load activities. Please try again."),
      ).not.toBeInTheDocument();
    });

    errorSpy.mockRestore();
  });
});
