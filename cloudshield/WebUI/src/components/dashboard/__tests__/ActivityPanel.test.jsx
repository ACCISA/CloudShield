import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ActivityPanel from "../ActivityPanel";

const manyActivities = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1,
  user: `User ${i + 1}`,
  date: `2026-01-${String(i + 1).padStart(2, "0")} 09:00`,
  activity: `Activity ${i + 1}`,
}));

describe("ActivityPanel", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the panel title, search input, and refresh control", () => {
    render(<ActivityPanel initialData={[]} />);

    expect(screen.getByText("Recent Activity")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Search activities"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /refresh/i })).toBeInTheDocument();
  });

  it("shows the default empty state when there are no activities", () => {
    render(<ActivityPanel initialData={[]} />);

    expect(screen.getByTestId("activity-empty-state")).toBeInTheDocument();
    expect(
      screen.getByTestId("activity-empty-state-description"),
    ).toHaveTextContent("Activity will appear here once actions are performed");
  });

  it("loads mock data when refresh is clicked without a fetch handler", async () => {
    render(<ActivityPanel />);

    fireEvent.click(screen.getByRole("button", { name: /refresh/i }));

    await waitFor(() => {
      expect(screen.getAllByText("Michael Scott").length).toBeGreaterThan(0);
    });
    expect(screen.getAllByText("Uploaded file to group").length).toBeGreaterThan(
      0,
    );
  });

  it("uses initialData when provided", () => {
    render(
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
