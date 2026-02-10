import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import DashboardPage from "../DashboardPage";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { trackButton } from "../../lib/analytics";

const navigateMock = jest.fn();
const activityTableRenderMock = jest.fn();

jest.mock("../../lib/analytics", () => ({
  trackButton: jest.fn(),
}));

jest.mock("../../context/AuthContext.jsx", () => ({
  useAuth: jest.fn(),
}));

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: jest.fn(),
}));

jest.mock("../../components/dashboard/StatCard.jsx", () => {
  return function MockStatCard({ title, onAdd }) {
    return (
      <button type="button" onClick={onAdd}>
        Add {title}
      </button>
    );
  };
});

jest.mock("../../components/dashboard/ActivityTable.jsx", () => {
  return function MockActivityTable(props) {
    activityTableRenderMock(props);
    return (
      <div data-testid="activity-table">
        <div data-testid="activity-size">{props.activities.length}</div>
        <div data-testid="activity-total">{props.totalCount}</div>
        <div data-testid="activity-page">{props.page}</div>
        <div data-testid="activity-rpp">{props.rowsPerPage}</div>
        <button type="button" onClick={props.onRefresh}>
          refresh
        </button>
        <button type="button" onClick={(event) => props.onPageChange(event, 2)}>
          change-page
        </button>
        <button
          type="button"
          onClick={() => props.onRowsPerPageChange({ target: { value: "50" } })}
        >
          change-rpp
        </button>
      </div>
    );
  };
});

describe("DashboardPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
    useNavigate.mockReturnValue(navigateMock);
    useAuth.mockReturnValue({ user: { org_id: "org-from-auth" } });
    localStorage.setItem("org_id", "org-123");
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    localStorage.clear();
  });

  it("fetches activity on mount and passes data to ActivityTable", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [{ id: "a1", actor: "Alice", description: "Created group" }],
        total: 1,
      }),
    });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "http://localhost:5050/api/activity/org-123?page=1&limit=20"
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId("activity-size")).toHaveTextContent("1");
      expect(screen.getByTestId("activity-total")).toHaveTextContent("1");
      expect(screen.getByTestId("activity-page")).toHaveTextContent("0");
      expect(screen.getByTestId("activity-rpp")).toHaveTextContent("20");
    });
  });

  it("does not fetch activity when org_id is missing in localStorage", async () => {
    localStorage.removeItem("org_id");
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByTestId("activity-table")).toBeInTheDocument();
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("refreshes activity when ActivityTable onRefresh is called", async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [], total: 0 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [{ id: "a2" }], total: 1 }),
      });

    render(<DashboardPage />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByText("refresh"));
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
    expect(screen.getByTestId("activity-size")).toHaveTextContent("1");
    expect(screen.getByTestId("activity-total")).toHaveTextContent("1");
  });

  it("re-fetches using next API page when page changes", async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [], total: 0 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [], total: 0 }),
      });

    render(<DashboardPage />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByText("change-page"));
    await waitFor(() => {
      expect(global.fetch).toHaveBeenLastCalledWith(
        "http://localhost:5050/api/activity/org-123?page=3&limit=20"
      );
    });
  });

  it("resets page and fetches with updated limit when rowsPerPage changes", async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [], total: 0 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [], total: 0 }),
      });

    render(<DashboardPage />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByText("change-rpp"));
    await waitFor(() => {
      expect(global.fetch).toHaveBeenLastCalledWith(
        "http://localhost:5050/api/activity/org-123?page=1&limit=50"
      );
    });
  });

  it("tracks analytics and navigates when stat card actions are clicked", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: [], total: 0 }),
    });

    render(<DashboardPage />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByText("Add Users"));
    expect(trackButton).toHaveBeenCalledWith("dashboard/statcard/add", {
      page: "dashboard",
      entity: "users",
    });
    expect(navigateMock).toHaveBeenCalledWith("/employees", {
      state: { openModal: true },
    });

    fireEvent.click(screen.getByText("Add Workstations"));
    expect(navigateMock).toHaveBeenCalledWith("/workstations", {
      state: { openModal: true },
    });

    fireEvent.click(screen.getByText("Add Groups"));
    expect(navigateMock).toHaveBeenCalledWith("/groups", {
      state: { openModal: true },
    });

    fireEvent.click(screen.getByText("Add Shares"));
    expect(navigateMock).toHaveBeenCalledWith("/files", {
      state: { openModal: true },
    });
  });

  it("logs an error when fetchActivities receives a non-ok response", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ items: [{ id: "ignored" }], total: 99 }),
    });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
    expect(console.error).toHaveBeenCalledWith("Failed to fetch activities");
    expect(screen.getByTestId("activity-size")).toHaveTextContent("0");
    expect(screen.getByTestId("activity-total")).toHaveTextContent("0");
  });

  it("logs an error when fetchActivities throws", async () => {
    const networkError = new Error("network down");
    global.fetch.mockRejectedValueOnce(networkError);

    render(<DashboardPage />);

    await waitFor(() => {
      expect(console.error).toHaveBeenCalledWith(
        "Error fetching activities:",
        networkError
      );
    });
    expect(screen.getByTestId("activity-size")).toHaveTextContent("0");
    expect(screen.getByTestId("activity-total")).toHaveTextContent("0");
  });

  it("uses safe defaults when API response omits items and total", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByTestId("activity-size")).toHaveTextContent("0");
    expect(screen.getByTestId("activity-total")).toHaveTextContent("0");
  });

  it("toggles loading prop around fetchActivities execution", async () => {
    let resolveFetch;
    global.fetch.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        })
    );

    render(<DashboardPage />);

    await waitFor(() => {
      const anyLoadingTrue = activityTableRenderMock.mock.calls.some(
        ([props]) => props.loading === true
      );
      expect(anyLoadingTrue).toBe(true);
    });

    resolveFetch({
      ok: true,
      json: async () => ({ items: [], total: 0 }),
    });

    await waitFor(() => {
      const lastCallProps =
        activityTableRenderMock.mock.calls[
          activityTableRenderMock.mock.calls.length - 1
        ][0];
      expect(lastCallProps.loading).toBe(false);
    });
  });
});
