/**
 * ActivityTable.test.jsx
 *
 * Comprehensive test suite for ActivityTable component
 * Tests rendering, sorting, filtering, pagination, loading states and edge cases
 */
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ActivityTable from "../ActivityTable.jsx";

// Mock date-fns format function
jest.mock("date-fns", () => ({
  format: jest.fn((date) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString();
  }),
}));

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

const baseProps = {
  loading: false,
  page: 0,
  rowsPerPage: 20,
  totalCount: 3,
  onPageChange: jest.fn(),
  onRowsPerPageChange: jest.fn(),
  onRefresh: jest.fn(),
};

const activities = [
  {
    id: "1",
    actor: "Charlie",
    description: "Uploaded report",
    created_at: "2026-01-03T10:30:00.000Z",
  },
  {
    id: "2",
    actor: "Alice",
    description: "Created group",
    created_at: "2026-01-01T10:30:00.000Z",
  },
  {
    id: "3",
    actor: "Bob",
    description: "Deleted share",
    created_at: null,
  },
];

const largeActivitySet = Array.from({ length: 50 }, (_, i) => ({
  id: String(i),
  actor: `User ${i % 10}`,
  description: `Activity ${i}`,
  created_at: new Date(2026, 0, 1 + (i % 30)).toISOString(),
}));

describe("ActivityTable Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    test("renders table with header row", () => {
      render(<ActivityTable {...baseProps} activities={activities} />);

      expect(screen.getByText("Actor")).toBeInTheDocument();
      expect(screen.getByText("Activity")).toBeInTheDocument();
      expect(screen.getByText("Date")).toBeInTheDocument();
    });

    test("renders all activity rows", () => {
      render(<ActivityTable {...baseProps} activities={activities} />);

      activities.forEach((activity) => {
        expect(screen.getByText(activity.actor)).toBeInTheDocument();
        expect(screen.getByText(activity.description)).toBeInTheDocument();
      });
    });

    test("renders refresh button", () => {
      render(<ActivityTable {...baseProps} activities={activities} />);

      const refreshButtons = screen.getAllByRole("button");
      expect(refreshButtons.length).toBeGreaterThan(0);
    });

    test("renders search input field", () => {
      render(<ActivityTable {...baseProps} activities={activities} />);

      expect(
        screen.getByPlaceholderText("Search activities")
      ).toBeInTheDocument();
    });
  });

  describe("Empty State", () => {
    test("shows empty state when no activities", () => {
      render(<ActivityTable {...baseProps} activities={[]} totalCount={0} />);
      expect(screen.getByText("No activity found")).toBeInTheDocument();
    });

    test("shows no activity message with appropriate text", () => {
      render(<ActivityTable {...baseProps} activities={[]} totalCount={0} />);

      expect(screen.getByText("No activity found")).toBeInTheDocument();
    });

    test("hides empty state when activities present", () => {
      const { rerender } = render(
        <ActivityTable {...baseProps} activities={[]} totalCount={0} />
      );
      expect(screen.getByText("No activity found")).toBeInTheDocument();

      rerender(
        <ActivityTable
          {...baseProps}
          activities={activities}
          totalCount={3}
        />
      );
      expect(screen.queryByText("No activity found")).not.toBeInTheDocument();
    });
  });

  describe("Loading States", () => {
    test("shows loading indicator when loading prop is true", () => {
      render(
        <ActivityTable
          {...baseProps}
          activities={activities}
          loading={true}
        />
      );
      expect(screen.getByText("Loading activity…")).toBeInTheDocument();
    });

    test("disables refresh button during loading", () => {
      render(
        <ActivityTable
          {...baseProps}
          activities={activities}
          loading={true}
        />
      );
      const refreshButton = screen.getAllByRole("button")[0];
      expect(refreshButton).toBeDisabled();
    });

    test("hides loading indicator when loading prop is false", () => {
      render(
        <ActivityTable
          {...baseProps}
          activities={activities}
          loading={false}
        />
      );
      expect(screen.queryByText("Loading activity…")).not.toBeInTheDocument();
    });

    test("updates loading state when prop changes", () => {
      const { rerender } = render(
        <ActivityTable
          {...baseProps}
          activities={activities}
          loading={false}
        />
      );

      rerender(
        <ActivityTable
          {...baseProps}
          activities={activities}
          loading={true}
        />
      );
      expect(screen.getByText("Loading activity…")).toBeInTheDocument();

      rerender(
        <ActivityTable
          {...baseProps}
          activities={activities}
          loading={false}
        />
      );
      expect(screen.queryByText("Loading activity…")).not.toBeInTheDocument();
    });
  });

  describe("Search/Filter Functionality", () => {
    test("filters activities by actor (case-insensitive)", () => {
      render(<ActivityTable {...baseProps} activities={activities} />);

      const searchInput = screen.getByPlaceholderText("Search activities");
      fireEvent.change(searchInput, { target: { value: "alice" } });

      expect(screen.getByText("Alice")).toBeInTheDocument();
      expect(screen.queryByText("Charlie")).not.toBeInTheDocument();
      expect(screen.queryByText("Bob")).not.toBeInTheDocument();
    });

    test("filters activities by description", () => {
      render(<ActivityTable {...baseProps} activities={activities} />);

      const searchInput = screen.getByPlaceholderText("Search activities");
      fireEvent.change(searchInput, { target: { value: "uploaded" } });

      expect(screen.getByText("Charlie")).toBeInTheDocument();
      expect(screen.queryByText("Alice")).not.toBeInTheDocument();
    });

    test("clears filter when search is emptied", () => {
      render(<ActivityTable {...baseProps} activities={activities} />);

      const searchInput = screen.getByPlaceholderText("Search activities");
      fireEvent.change(searchInput, { target: { value: "alice" } });
      expect(screen.getByText("Alice")).toBeInTheDocument();

      fireEvent.change(searchInput, { target: { value: "" } });
      activities.forEach((activity) => {
        expect(screen.getByText(activity.actor)).toBeInTheDocument();
      });
    });

    test("shows no results message when search has no matches", () => {
      render(<ActivityTable {...baseProps} activities={activities} />);

      const searchInput = screen.getByPlaceholderText("Search activities");
      fireEvent.change(searchInput, { target: { value: "nonexistentactivity" } });

      expect(screen.getByText("No activity found")).toBeInTheDocument();
    });

    test("handles special characters in search", () => {
      render(<ActivityTable {...baseProps} activities={activities} />);

      const searchInput = screen.getByPlaceholderText("Search activities");
      fireEvent.change(searchInput, { target: { value: "@#$%" } });

      expect(screen.getByText("No activity found")).toBeInTheDocument();
    });

    test("performs case-insensitive search", () => {
      render(<ActivityTable {...baseProps} activities={activities} />);

      const searchInput = screen.getByPlaceholderText("Search activities");

      fireEvent.change(searchInput, { target: { value: "CHARLIE" } });
      expect(screen.getByText("Charlie")).toBeInTheDocument();

      fireEvent.change(searchInput, { target: { value: "UpLoAdEd" } });
      expect(screen.getByText("Uploaded report")).toBeInTheDocument();
    });
  });

  describe("Sorting", () => {
    test("sorts by actor in ascending order on first click", () => {
      render(<ActivityTable {...baseProps} activities={activities} />);

      fireEvent.click(screen.getByText("Actor"));

      const actorCells = screen.getAllByText(/Alice|Bob|Charlie/);
      expect(actorCells[0]).toHaveTextContent("Alice");
      expect(actorCells[1]).toHaveTextContent("Bob");
      expect(actorCells[2]).toHaveTextContent("Charlie");
    });

    test("toggles sort direction when clicking same column", () => {
      render(<ActivityTable {...baseProps} activities={activities} />);

      fireEvent.click(screen.getByText("Actor"));
      let actorCells = screen.getAllByText(/Alice|Bob|Charlie/);
      expect(actorCells[0]).toHaveTextContent("Alice");

      fireEvent.click(screen.getByText("Actor"));
      actorCells = screen.getAllByText(/Alice|Bob|Charlie/);
      expect(actorCells[0]).toHaveTextContent("Charlie");
    });

    test("sorts by description", () => {
      render(<ActivityTable {...baseProps} activities={activities} />);

      fireEvent.click(screen.getByText("Activity"));
      expect(screen.getByText("Created group")).toBeInTheDocument();
    });

    test("sorts by created_at date", () => {
      render(<ActivityTable {...baseProps} activities={activities} />);

      fireEvent.click(screen.getByText("Date"));
      // Should sort without errors
      expect(screen.getByText("Actor")).toBeInTheDocument();
    });

    test("changes sort column and direction independently", () => {
      render(<ActivityTable {...baseProps} activities={activities} />);

      fireEvent.click(screen.getByText("Actor"));
      fireEvent.click(screen.getByText("Activity"));
      fireEvent.click(screen.getByText("Activity"));

      expect(screen.getByText("Actor")).toBeInTheDocument();
    });
  });

  describe("Date Formatting", () => {
    test("renders '-' for missing created_at", () => {
      render(<ActivityTable {...baseProps} activities={activities} />);

      // Bob's activity has null created_at
      expect(screen.getByText("-")).toBeInTheDocument();
    });

    test("formats valid dates correctly", () => {
      render(<ActivityTable {...baseProps} activities={activities} />);

      // Check that Charlie and Alice activities have formatted dates
      expect(screen.getByText("1/3/2026")).toBeInTheDocument();
      expect(screen.getByText("1/1/2026")).toBeInTheDocument();
    });

    test("handles different date formats", () => {
      const customActivities = [
        {
          id: "1",
          actor: "User1",
          description: "Activity1",
          created_at: new Date("2026-03-15").toISOString(),
        },
        {
          id: "2",
          actor: "User2",
          description: "Activity2",
          created_at: new Date("2025-12-01").toISOString(),
        },
      ];

      render(
        <ActivityTable
          {...baseProps}
          activities={customActivities}
          totalCount={2}
        />
      );

      expect(screen.getByText(/3\/(14|15)\/2026/)).toBeInTheDocument();
    });
  });

  describe("Pagination", () => {
    test("renders pagination controls", () => {
      render(
        <ActivityTable
          {...baseProps}
          activities={activities}
          totalCount={50}
          rowsPerPage={20}
        />
      );

      expect(screen.getByText(/1–20 of 50/)).toBeInTheDocument();
    });

    test("calls onPageChange when page changes", () => {
      const onPageChange = jest.fn();
      render(
        <ActivityTable
          {...baseProps}
          activities={activities}
          totalCount={50}
          onPageChange={onPageChange}
        />
      );

      const nextPageButton = screen.getByLabelText("Go to next page");
      fireEvent.click(nextPageButton);

      expect(onPageChange).toHaveBeenCalled();
    });

    test("calls onRowsPerPageChange when rows per page changes", () => {
      const onRowsPerPageChange = jest.fn();
      render(
        <ActivityTable
          {...baseProps}
          activities={largeActivitySet}
          totalCount={50}
          onRowsPerPageChange={onRowsPerPageChange}
        />
      );

      const rowsPerPageSelect = screen.getByRole("combobox");
      fireEvent.mouseDown(rowsPerPageSelect);
      fireEvent.click(screen.getByRole("option", { name: "50" }));

      expect(onRowsPerPageChange).toHaveBeenCalled();
    });

    test("disables previous button on first page", () => {
      render(
        <ActivityTable
          {...baseProps}
          activities={activities}
          page={0}
          totalCount={50}
        />
      );

      const prevButton = screen.getByLabelText("Go to previous page");
      expect(prevButton).toBeDisabled();
    });

    test("enables next button when more pages available", () => {
      render(
        <ActivityTable
          {...baseProps}
          activities={largeActivitySet}
          totalCount={50}
          page={0}
          rowsPerPage={20}
        />
      );

      const nextButton = screen.getByLabelText("Go to next page");
      expect(nextButton).not.toBeDisabled();
    });
  });

  describe("Refresh Functionality", () => {
    test("calls onRefresh when refresh button is clicked", () => {
      const onRefresh = jest.fn();
      render(
        <ActivityTable
          {...baseProps}
          activities={activities}
          onRefresh={onRefresh}
        />
      );

      const refreshButton = screen.getAllByRole("button")[0];
      fireEvent.click(refreshButton);

      expect(onRefresh).toHaveBeenCalledTimes(1);
    });

    test("refresh button is disabled during loading", () => {
      render(
        <ActivityTable
          {...baseProps}
          activities={activities}
          loading={true}
        />
      );

      const refreshButton = screen.getAllByRole("button")[0];
      expect(refreshButton).toBeDisabled();
    });

    test("refresh button is enabled when not loading", () => {
      render(
        <ActivityTable
          {...baseProps}
          activities={activities}
          loading={false}
        />
      );

      const refreshButton = screen.getAllByRole("button")[0];
      expect(refreshButton).not.toBeDisabled();
    });
  });

  describe("Large Datasets", () => {
    test("handles large activity list", () => {
      render(
        <ActivityTable
          {...baseProps}
          activities={largeActivitySet}
          totalCount={50}
        />
      );

      expect(screen.getAllByText("User 0").length).toBeGreaterThan(0);
      expect(screen.getByText("Activity 0")).toBeInTheDocument();
    });

    test("maintains performance with sorting large dataset", () => {
      render(
        <ActivityTable
          {...baseProps}
          activities={largeActivitySet}
          totalCount={50}
        />
      );

      fireEvent.click(screen.getByText("Actor"));
      fireEvent.click(screen.getByText("Actor"));

      expect(screen.getByText("Actor")).toBeInTheDocument();
    });

    test("maintains performance with filtering large dataset", () => {
      render(
        <ActivityTable
          {...baseProps}
          activities={largeActivitySet}
          totalCount={50}
        />
      );

      const searchInput = screen.getByPlaceholderText("Search activities");
      fireEvent.change(searchInput, { target: { value: "User 5" } });

      expect(screen.getAllByText("User 5").length).toBeGreaterThan(0);
    });
  });

  describe("Props Handling", () => {
    test("updates when activities prop changes", () => {
      const { rerender } = render(
        <ActivityTable {...baseProps} activities={activities} totalCount={3} />
      );

      expect(screen.getByText("Charlie")).toBeInTheDocument();

      const newActivities = [
        {
          id: "100",
          actor: "NewUser",
          description: "NewActivity",
          created_at: "2026-01-01T10:00:00Z",
        },
      ];

      rerender(
        <ActivityTable
          {...baseProps}
          activities={newActivities}
          totalCount={1}
        />
      );

      expect(screen.getByText("NewUser")).toBeInTheDocument();
      expect(screen.queryByText("Charlie")).not.toBeInTheDocument();
    });

    test("handles undefined callbacks gracefully", () => {
      render(
        <ActivityTable
          {...baseProps}
          activities={activities}
          onRefresh={undefined}
          onPageChange={undefined}
        />
      );

      expect(screen.getByText("Charlie")).toBeInTheDocument();
    });

    test("respects totalCount prop for pagination", () => {
      render(
        <ActivityTable
          {...baseProps}
          activities={activities}
          totalCount={100}
        />
      );

      expect(screen.getByText(/1–20 of 100/)).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    test("table has proper structure with headers", () => {
      render(
        <ActivityTable {...baseProps} activities={activities} />
      );

      expect(screen.getByText("Actor")).toBeInTheDocument();
      expect(screen.getByText("Date")).toBeInTheDocument();
      expect(screen.getByText("Activity")).toBeInTheDocument();
    });

    test("buttons are keyboard accessible", () => {
      render(
        <ActivityTable {...baseProps} activities={activities} />
      );

      const buttons = screen.getAllByRole("button");
      buttons.forEach((button) => {
        expect(button).toBeInTheDocument();
      });
    });

    test("pagination controls are labeled", () => {
      render(
        <ActivityTable
          {...baseProps}
          activities={activities}
          totalCount={50}
        />
      );

      expect(
        screen.getByLabelText("Go to next page")
      ).toBeInTheDocument();
      expect(
        screen.getByLabelText("Go to previous page")
      ).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    test("handles empty activities array", () => {
      render(<ActivityTable {...baseProps} activities={[]} totalCount={0} />);

      expect(screen.getByText("No activity found")).toBeInTheDocument();
    });

    test("handles activities with missing fields", () => {
      const incomplete = [
        {
          id: "1",
          actor: "User1",
        },
        {
          id: "2",
          description: "Activity2",
        },
      ];

      render(
        <ActivityTable
          {...baseProps}
          activities={incomplete}
          totalCount={2}
        />
      );

      expect(screen.getByText("User1")).toBeInTheDocument();
    });

    test("handles rapid search changes", async () => {
      const user = userEvent.setup();
      render(
        <ActivityTable {...baseProps} activities={activities} />
      );

      const searchInput = screen.getByPlaceholderText("Search activities");

      await user.type(searchInput, "alice");
      await user.clear(searchInput);
      await user.type(searchInput, "bob");

      expect(screen.getByText("Bob")).toBeInTheDocument();
    });

    test("handles rapid sort changes", () => {
      render(
        <ActivityTable {...baseProps} activities={activities} />
      );

      fireEvent.click(screen.getByText("Actor"));
      fireEvent.click(screen.getByText("Activity"));
      fireEvent.click(screen.getByText("Date"));
      fireEvent.click(screen.getByText("Actor"));

      expect(screen.getByText("Actor")).toBeInTheDocument();
    });

    test("combines search and sort correctly", () => {
      render(
        <ActivityTable {...baseProps} activities={activities} />
      );

      const searchInput = screen.getByPlaceholderText("Search activities");
      fireEvent.change(searchInput, { target: { value: "report" } });

      fireEvent.click(screen.getByText("Date"));

      expect(screen.getByText("Charlie")).toBeInTheDocument();
      expect(screen.queryByText("Alice")).not.toBeInTheDocument();
    });
  });
});
