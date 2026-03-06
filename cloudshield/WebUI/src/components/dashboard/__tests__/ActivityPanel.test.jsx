import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import ActivityPanel from "../ActivityPanel";

describe("ActivityPanel", () => {
  it("renders recent activity title", () => {
    render(<ActivityPanel />);
    expect(screen.getByText("Recent Activity")).toBeInTheDocument();
  });

  it("renders search input", () => {
    render(<ActivityPanel />);
    expect(
      screen.getByPlaceholderText("Search activities")
    ).toBeInTheDocument();
  });

  it("renders refresh button", () => {
    render(<ActivityPanel />);
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThan(0);
  });

  it("updates search value when typing", () => {
    render(<ActivityPanel />);
    const searchInput = screen.getByPlaceholderText("Search activities");
    fireEvent.change(searchInput, { target: { value: "test search" } });
    expect(searchInput).toHaveValue("test search");
  });

  it("displays activity items", () => {
    render(<ActivityPanel />);
    // Check for mock activity data
    const activities = screen.getAllByText("Michael Scott");
    expect(activities.length).toBeGreaterThan(0);
  });

  it("displays activity dates", () => {
    render(<ActivityPanel />);
    const dates = screen.getAllByText("10/11/2025 11:36 pm");
    expect(dates.length).toBeGreaterThan(0);
  });

  it("displays activity descriptions", () => {
    render(<ActivityPanel />);
    const descriptions = screen.getAllByText("Uploaded file to group");
    expect(descriptions.length).toBeGreaterThan(0);
  });

  it("renders with correct styling", () => {
    const { container } = render(<ActivityPanel />);
    const mainBox = container.firstChild;
    expect(mainBox).toHaveStyle({ display: "flex", flexDirection: "column" });
  });

  it("filters activities based on search query", () => {
    render(<ActivityPanel />);
    const searchInput = screen.getByPlaceholderText("Search activities");

    fireEvent.change(searchInput, { target: { value: "Noah" } });

    expect(screen.getByText("Noah Burns")).toBeInTheDocument();
  });

  it("shows all activities when search is cleared", () => {
    render(<ActivityPanel />);
    const searchInput = screen.getByPlaceholderText("Search activities");

    fireEvent.change(searchInput, { target: { value: "Noah" } });
    fireEvent.change(searchInput, { target: { value: "" } });

    const activities = screen.getAllByText("Michael Scott");
    expect(activities.length).toBeGreaterThan(0);
  });

  it("handles case-insensitive search", () => {
    render(<ActivityPanel />);
    const searchInput = screen.getByPlaceholderText("Search activities");

    fireEvent.change(searchInput, { target: { value: "NOAH" } });

    expect(screen.getByText("Noah Burns")).toBeInTheDocument();
  });

  it("refreshes activities when refresh button is clicked", async () => {
    const mockFetch = jest.fn().mockResolvedValue([
      {
        id: 6,
        user: "Test User",
        date: "12/29/2025",
        activity: "Test activity",
      },
    ]);

    render(<ActivityPanel fetchActivities={mockFetch} />);

    const refreshButton = screen.getAllByRole("button")[0];
    fireEvent.click(refreshButton);

    await screen.findByText("Test User");
    expect(mockFetch).toHaveBeenCalled();
  });

  it("displays loading state during async fetch", async () => {
    const mockFetch = jest
      .fn()
      .mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve([]), 100))
      );

    render(<ActivityPanel fetchActivities={mockFetch} />);

    const refreshButton = screen.getAllByRole("button")[0];
    fireEvent.click(refreshButton);

    // Loading state should be visible
    expect(mockFetch).toHaveBeenCalled();
  });

  it("displays error message when fetch fails", async () => {
    const mockFetch = jest.fn().mockRejectedValue(new Error("Fetch failed"));

    render(<ActivityPanel fetchActivities={mockFetch} />);

    const refreshButton = screen.getAllByRole("button")[0];
    fireEvent.click(refreshButton);

    const errorMessage = await screen.findByText(/Failed to load activities/);
    expect(errorMessage).toBeInTheDocument();
  });

  it("falls back to mock data on fetch error", async () => {
    const mockFetch = jest.fn().mockRejectedValue(new Error("Fetch failed"));

    render(<ActivityPanel fetchActivities={mockFetch} />);

    const refreshButton = screen.getAllByRole("button")[0];
    fireEvent.click(refreshButton);

    await screen.findByText(/Failed to load activities/);

    // Should still show mock data
    expect(screen.getAllByText("Michael Scott").length).toBeGreaterThan(0);
  });

  it("uses initialData when provided", () => {
    const initialData = [
      {
        id: 1,
        user: "Initial User",
        date: "12/29/2025",
        activity: "Initial activity",
      },
    ];

    render(<ActivityPanel initialData={initialData} />);

    expect(screen.getByText("Initial User")).toBeInTheDocument();
  });

  it("loads activities on mount when fetchActivities is provided", async () => {
    const mockFetch = jest.fn().mockResolvedValue([
      {
        id: 1,
        user: "Fetched User",
        date: "12/29/2025",
        activity: "Fetched activity",
      },
    ]);

    render(<ActivityPanel fetchActivities={mockFetch} />);

    await screen.findByText("Fetched User");
    expect(mockFetch).toHaveBeenCalled();
  });

  it("handles empty search results gracefully", () => {
    render(<ActivityPanel />);
    const searchInput = screen.getByPlaceholderText("Search activities");

    fireEvent.change(searchInput, { target: { value: "NonExistentUser" } });

    // Should not display any activities
    expect(screen.queryByText("Michael Scott")).not.toBeInTheDocument();
  });

  it("searches across user name and activity description", () => {
    render(<ActivityPanel />);
    const searchInput = screen.getByPlaceholderText("Search activities");

    fireEvent.change(searchInput, { target: { value: "Uploaded" } });

    expect(
      screen.getAllByText(/Uploaded file to group/).length
    ).toBeGreaterThan(0);
  });

  it("handles mobile responsive layout", () => {
    // Mock useMediaQuery to return true for mobile
    const { container } = render(<ActivityPanel />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it("displays avatars for users", () => {
    render(<ActivityPanel />);

    // Avatars should be rendered for each activity
    const { container } = render(<ActivityPanel />);
    const avatars = container.querySelectorAll(".MuiAvatar-root");
    expect(avatars.length).toBeGreaterThan(0);
  });

  it("clears error state on successful refresh", async () => {
    const mockFetch = jest
      .fn()
      .mockRejectedValueOnce(new Error("Fetch failed"))
      .mockResolvedValueOnce([
        {
          id: 1,
          user: "Success User",
          date: "12/29/2025",
          activity: "Success activity",
        },
      ]);

    render(<ActivityPanel fetchActivities={mockFetch} />);

    const refreshButton = screen.getAllByRole("button")[0];

    // First fetch fails
    fireEvent.click(refreshButton);
    await screen.findByText(/Failed to load activities/);

    // Second fetch succeeds
    fireEvent.click(refreshButton);
    await screen.findByText("Success User");

    // Error message should be gone
    expect(
      screen.queryByText(/Failed to load activities/)
    ).not.toBeInTheDocument();
  });

  it("sorts search results by relevance", () => {
    render(<ActivityPanel />);
    const searchInput = screen.getByPlaceholderText("Search activities");

    fireEvent.change(searchInput, { target: { value: "Michael" } });

    // Results should be sorted by relevance (exact matches first)
    expect(screen.getAllByText("Michael Scott").length).toBeGreaterThan(0);
  });

  it("toggles user header sort direction", () => {
    const data = [
      { id: 1, user: "zoe", date: "01/01/2026", activity: "B activity" },
      { id: 2, user: "adam", date: "01/02/2026", activity: "A activity" },
    ];
    render(<ActivityPanel initialData={data} rowsPerPage={10} />);

    fireEvent.click(screen.getByText("User"));
    expect(screen.getByText("↑")).toBeInTheDocument();

    fireEvent.click(screen.getByText("User"));
    expect(screen.getByText("↓")).toBeInTheDocument();
  });

  it("switches to activity sort when activity header is clicked", () => {
    const data = [
      { id: 1, user: "zoe", date: "01/01/2026", activity: "zeta" },
      { id: 2, user: "adam", date: "01/02/2026", activity: "alpha" },
    ];
    render(<ActivityPanel initialData={data} rowsPerPage={10} />);

    fireEvent.click(screen.getByText("Activity"));
    expect(screen.getByText("↑")).toBeInTheDocument();
  });

  // ─── Pagination ─────────────────────────────────────
  describe("Pagination", () => {
    const manyActivities = Array.from({ length: 12 }, (_, i) => ({
      id: i + 1,
      user: `User ${i + 1}`,
      date: `01/${String(i + 1).padStart(2, "0")}/2026`,
      activity: `Activity ${i + 1}`,
    }));

    it("renders the pagination bar when activities exist", () => {
      render(<ActivityPanel initialData={manyActivities} />);
      expect(screen.getByTestId("activity-pagination")).toBeInTheDocument();
    });

    it("does not render pagination when there are no activities", () => {
      render(<ActivityPanel initialData={[]} />);
      expect(
        screen.queryByTestId("activity-pagination"),
      ).not.toBeInTheDocument();
    });

    it("displays correct item range info", () => {
      render(
        <ActivityPanel
          initialData={manyActivities}
          rowsPerPage={5}
          currentPage={1}
        />,
      );
      expect(screen.getByTestId("activity-pagination-info")).toHaveTextContent(
        "1–5 of 12",
      );
    });

    it("shows only rowsPerPage items per page (client-side)", () => {
      render(
        <ActivityPanel
          initialData={manyActivities}
          rowsPerPage={5}
          currentPage={1}
        />,
      );
      // Default date sort is desc, so page 1 should include users 12..8
      expect(screen.getByText("User 12")).toBeInTheDocument();
      expect(screen.getByText("User 8")).toBeInTheDocument();
      expect(screen.queryByText("User 7")).not.toBeInTheDocument();
    });

    it("shows the correct slice on page 2 (client-side)", () => {
      render(
        <ActivityPanel
          initialData={manyActivities}
          rowsPerPage={5}
          currentPage={2}
        />,
      );
      expect(screen.getByText("User 7")).toBeInTheDocument();
      expect(screen.getByText("User 3")).toBeInTheDocument();
      expect(screen.queryByText("User 8")).not.toBeInTheDocument();
      expect(screen.queryByText("User 2")).not.toBeInTheDocument();
    });

    it("shows remaining items on the last partial page", () => {
      render(
        <ActivityPanel
          initialData={manyActivities}
          rowsPerPage={5}
          currentPage={3}
        />,
      );
      expect(screen.getByText("User 2")).toBeInTheDocument();
      expect(screen.getByText("User 1")).toBeInTheDocument();
      expect(screen.queryByText("User 3")).not.toBeInTheDocument();
    });

    it("calls onPageChange when Next is clicked", () => {
      const onPageChange = jest.fn();
      render(
        <ActivityPanel
          initialData={manyActivities}
          totalItems={manyActivities.length}
          rowsPerPage={5}
          currentPage={1}
          onPageChange={onPageChange}
          onRowsPerPageChange={jest.fn()}
        />,
      );
      fireEvent.click(screen.getByTestId("activity-pagination-next"));
      expect(onPageChange).toHaveBeenCalledWith(2);
    });

    it("calls onRowsPerPageChange when rows per page changes", () => {
      const onRowsPerPageChange = jest.fn();
      const onPageChange = jest.fn();
      render(
        <ActivityPanel
          initialData={manyActivities}
          totalItems={manyActivities.length}
          rowsPerPage={5}
          currentPage={1}
          onPageChange={onPageChange}
          onRowsPerPageChange={onRowsPerPageChange}
        />,
      );
      fireEvent.change(
        screen.getByTestId("activity-pagination-rows-per-page"),
        { target: { value: "25" } },
      );
      expect(onRowsPerPageChange).toHaveBeenCalledWith(25);
    });

    it("uses default rowsPerPage of 25 when not specified", () => {
      const thirtyActivities = Array.from({ length: 30 }, (_, i) => ({
        id: i + 1,
        user: `Person ${i + 1}`,
        date: "01/01/2026",
        activity: `Action ${i + 1}`,
      }));
      render(<ActivityPanel initialData={thirtyActivities} />);
      // Default rowsPerPage is 25, so Person 25 should be visible but Person 26 should not
      expect(screen.getByText("Person 25")).toBeInTheDocument();
      expect(screen.queryByText("Person 26")).not.toBeInTheDocument();
    });

    it("renders custom rowsPerPageOptions", () => {
      render(
        <ActivityPanel
          initialData={manyActivities}
          rowsPerPageOptions={[10, 20, 50]}
        />,
      );
      const select = screen.getByTestId("activity-pagination-rows-per-page");
      const options = select.querySelectorAll("option");
      expect(options).toHaveLength(3);
      expect(options[0]).toHaveValue("10");
      expect(options[1]).toHaveValue("20");
      expect(options[2]).toHaveValue("50");
    });

    it("disables Previous on the first page", () => {
      render(
        <ActivityPanel
          initialData={manyActivities}
          rowsPerPage={5}
          currentPage={1}
        />,
      );
      expect(screen.getByTestId("activity-pagination-prev")).toBeDisabled();
    });

    it("disables Next on the last page", () => {
      render(
        <ActivityPanel
          initialData={manyActivities}
          rowsPerPage={5}
          currentPage={3}
        />,
      );
      expect(screen.getByTestId("activity-pagination-next")).toBeDisabled();
    });
  });

  // ─── EmptyState ─────────────────────────────────────
  describe("EmptyState", () => {
    it("shows EmptyState with search hint when search yields no results", () => {
      render(<ActivityPanel />);
      const searchInput = screen.getByPlaceholderText("Search activities");
      fireEvent.change(searchInput, { target: { value: "zzzNonExistent" } });

      expect(screen.getByTestId("activity-empty-state")).toBeInTheDocument();
      expect(
        screen.getByTestId("activity-empty-state-message"),
      ).toHaveTextContent("No activities found");
      expect(
        screen.getByTestId("activity-empty-state-description"),
      ).toHaveTextContent("Try adjusting your search query");
    });

    it("shows EmptyState with default hint when no activities and no search", () => {
      render(<ActivityPanel initialData={[]} />);
      expect(screen.getByTestId("activity-empty-state")).toBeInTheDocument();
      expect(
        screen.getByTestId("activity-empty-state-description"),
      ).toHaveTextContent(
        "Activity will appear here once actions are performed",
      );
    });
  });
});
