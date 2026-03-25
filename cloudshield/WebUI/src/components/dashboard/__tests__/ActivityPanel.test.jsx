import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import ActivityPanel from "../ActivityPanel";

jest.mock("../../../hooks/useThemeColors.js", () => ({
  useThemeColors: () => ({
    isDark: true,
    isLight: false,
    bgPrimary: "#0A0A0A",
    bgSecondary: "#111111",
    borderLight: "rgba(255,255,255,0.08)",
    lightOverlaySubtle: "rgba(255,255,255,0.03)",
    text: "#FFFFFF",
    textPrimary: "#FFFFFF",
    textSecondary: "#9E9E9E",
    textTertiary: "#777777",
  }),
}));

jest.mock("../../common/SearchField/SearchField.jsx", () => {
  return function MockSearchField({ value, onChange, placeholder }) {
    return (
      <input
        data-testid="search-input"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  };
});

jest.mock("../../common/RefreshButton/RefreshButton.jsx", () => {
  return function MockRefreshButton({ onClick, disabled }) {
    return (
      <button data-testid="refresh-btn" disabled={disabled} onClick={onClick}>
        Refresh
      </button>
    );
  };
});

jest.mock("../../common/Pagination/Pagination.jsx", () => {
  return function MockPagination({
    totalItems,
    itemsPerPage,
    currentPage,
    onPageChange,
    itemLabel,
    testId,
  }) {
    const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
    const start = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
    const end = Math.min(currentPage * itemsPerPage, totalItems);

    return (
      <div data-testid={testId}>
        <div data-testid={`${testId}-info`}>
          Showing {start}-{end} of {totalItems} {itemLabel}
        </div>
        <button
          data-testid={`${testId}-prev`}
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        >
          Prev
        </button>
        <button
          data-testid={`${testId}-next`}
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        >
          Next
        </button>
        <button data-testid={`${testId}-page-2`} onClick={() => onPageChange(2)}>
          2
        </button>
      </div>
    );
  };
});

jest.mock("../../common/EmptyState/EmptyState.jsx", () => {
  return function MockEmptyState({ message, description, testId = "empty-state" }) {
    return (
      <div data-testid={testId}>
        <p>{message}</p>
        <p data-testid={`${testId}-description`}>{description}</p>
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

describe("ActivityPanel", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders title, controls, and initial activity rows", () => {
    render(<ActivityPanel initialData={manyActivities.slice(0, 2)} />);

    expect(screen.getByText("Recent Activity")).toBeInTheDocument();
    expect(screen.getByTestId("refresh-btn")).toBeInTheDocument();
    expect(screen.getByTestId("search-input")).toBeInTheDocument();
    expect(screen.getByText("User 1")).toBeInTheDocument();
    expect(screen.getByText("Activity 1")).toBeInTheDocument();
  });

  it("shows default empty state when no activity exists", () => {
    render(<ActivityPanel initialData={[]} />);

    expect(screen.getByTestId("activity-empty-state")).toBeInTheDocument();
    expect(screen.getByTestId("activity-empty-state-description")).toHaveTextContent(
      "Activity will appear here once actions are performed",
    );
  });

  it("filters activities using search", () => {
    render(<ActivityPanel initialData={manyActivities.slice(0, 3)} />);

    fireEvent.change(screen.getByTestId("search-input"), {
      target: { value: "user 2" },
    });

    expect(screen.getByText("User 2")).toBeInTheDocument();
    expect(screen.queryByTestId("activity-empty-state")).not.toBeInTheDocument();
  });

  it("shows search-specific empty message when no matches", () => {
    render(<ActivityPanel initialData={manyActivities.slice(0, 2)} />);

    fireEvent.change(screen.getByTestId("search-input"), {
      target: { value: "zzzNonExistent" },
    });

    expect(screen.getByTestId("activity-empty-state")).toBeInTheDocument();
    expect(screen.getByTestId("activity-empty-state-description")).toHaveTextContent(
      "Try adjusting your search query",
    );
  });

  it("sorts by user when user header is clicked", () => {
    render(
      <ActivityPanel
        initialData={[
          { id: 1, user: "zoe", date: "2026-01-02 09:00", activity: "zeta" },
          { id: 2, user: "adam", date: "2026-01-01 09:00", activity: "alpha" },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "User" }));
    expect(screen.getAllByText(/^(zoe|adam)$/i)[0]).toHaveTextContent("adam");

    fireEvent.click(screen.getByRole("button", { name: "User" }));
    expect(screen.getAllByText(/^(zoe|adam)$/i)[0]).toHaveTextContent("zoe");
  });

  it("supports client-side pagination", () => {
    render(<ActivityPanel initialData={manyActivities} itemsPerPage={5} />);

    expect(screen.getByText("User 12")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("activity-pagination-page-2"));

    expect(screen.getByTestId("activity-pagination")).toBeInTheDocument();
    expect(screen.getByTestId("activity-pagination-info")).toHaveTextContent(
      "Showing 6-10 of 12 activities",
    );
    expect(screen.getByText("User 7")).toBeInTheDocument();
    expect(screen.queryByText("User 12")).not.toBeInTheDocument();
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

  it("loads activities on mount when fetchActivities is provided and initialData is missing", async () => {
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

  it("shows an error and falls back to built-in mock data when fetch fails", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const mockFetch = jest.fn().mockRejectedValue(new Error("Fetch failed"));

    render(<ActivityPanel fetchActivities={mockFetch} />);

    expect(
      await screen.findByText("Failed to load activities. Please try again."),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Michael Scott").length).toBeGreaterThan(0);

    consoleSpy.mockRestore();
  });

  it("shows loading state when externally loading and no activities exist", () => {
    render(<ActivityPanel initialData={[]} loading />);

    expect(screen.getByText("Loading activity…")).toBeInTheDocument();
  });

  it("refresh button triggers fetchActivities", async () => {
    const mockFetch = jest.fn().mockResolvedValue(manyActivities.slice(0, 1));

    render(
      <ActivityPanel
        initialData={[{ id: 99, user: "Initial User", date: "03/05/2026", activity: "Initial" }]}
        fetchActivities={mockFetch}
      />,
    );

    fireEvent.click(screen.getByTestId("refresh-btn"));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });
});
