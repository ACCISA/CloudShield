import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import ActivityTable from "../ActivityTable.jsx";

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

describe("ActivityTable", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders empty state when there are no activities", () => {
    render(<ActivityTable {...baseProps} activities={[]} totalCount={0} />);
    expect(screen.getByText("No activity found")).toBeInTheDocument();
  });

  it("renders loading state and disables refresh while loading", () => {
    render(<ActivityTable {...baseProps} activities={activities} loading />);
    expect(screen.getByText("Loading activity…")).toBeInTheDocument();
    const [refreshButton] = screen.getAllByRole("button");
    expect(refreshButton).toBeDisabled();
  });

  it("filters activities by actor or description (case-insensitive)", () => {
    render(<ActivityTable {...baseProps} activities={activities} />);

    fireEvent.change(screen.getByPlaceholderText("Search activities"), {
      target: { value: "uploaded" },
    });
    expect(screen.getByText("Charlie")).toBeInTheDocument();
    expect(screen.queryByText("Alice")).not.toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Search activities"), {
      target: { value: "alice" },
    });
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.queryByText("Charlie")).not.toBeInTheDocument();
  });

  it("sorts by actor and toggles sort direction", () => {
    render(<ActivityTable {...baseProps} activities={activities} />);

    fireEvent.click(screen.getByText("Actor"));
    let actorCells = screen.getAllByText(/Alice|Bob|Charlie/);
    expect(actorCells[0]).toHaveTextContent("Alice");
    expect(actorCells[1]).toHaveTextContent("Bob");
    expect(actorCells[2]).toHaveTextContent("Charlie");

    fireEvent.click(screen.getByText("Actor"));
    actorCells = screen.getAllByText(/Alice|Bob|Charlie/);
    expect(actorCells[0]).toHaveTextContent("Charlie");
    expect(actorCells[2]).toHaveTextContent("Alice");
  });

  it("renders '-' for missing created_at values", () => {
    render(<ActivityTable {...baseProps} activities={activities} />);
    expect(screen.getByText("-")).toBeInTheDocument();
  });

  it("calls refresh and page change handlers", () => {
    render(<ActivityTable {...baseProps} activities={activities} totalCount={50} />);

    const [refreshButton] = screen.getAllByRole("button");
    fireEvent.click(refreshButton);
    expect(baseProps.onRefresh).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByLabelText("Go to next page"));
    expect(baseProps.onPageChange).toHaveBeenCalledTimes(1);
  });
});
