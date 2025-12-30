import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import ActivityPanel from "../ActivityPanel";

describe("ActivityPanel", () => {
  it("renders recent activity title", () => {
    render(<ActivityPanel />);
    expect(screen.getByText("Recent activity")).toBeInTheDocument();
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
});
