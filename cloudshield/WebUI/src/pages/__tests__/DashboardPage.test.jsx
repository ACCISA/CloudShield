import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import DashboardPage from "../DashboardPage";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { trackButton } from "../../lib/analytics";

const navigateMock = jest.fn();
let mockActivityTableRenderMock;

const renderDashboard = () =>
  render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>
  );

jest.mock("react-router-dom", () => {
  const actual = jest.requireActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => jest.fn(),
  };
});

jest.mock("../../api/useOrgMetrics.js", () => ({
  useOrgMetrics: jest.fn(),
}));

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
    if (mockActivityTableRenderMock) {
      mockActivityTableRenderMock(props);
    }
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

import { useAuth } from "../../context/AuthContext.jsx";
import { trackButton } from "../../lib/analytics";
import DashboardPage from "../DashboardPage";
import { MemoryRouter } from "react-router-dom";
import { useOrgMetrics } from "../../api/useOrgMetrics.js";


describe("DashboardPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
    useNavigate.mockReturnValue(navigateMock);
    useAuth.mockReturnValue({ user: { org_id: "org-from-auth" } });
    localStorage.setItem("org_id", "org-123");
    jest.spyOn(console, "error").mockImplementation(() => {});

    useOrgMetrics.mockReturnValue({
      stats: {
        users: 16,
        workstations: 12,
        groups: 3,
        shares: 33,
      },
      loading: false,
    });
    mockActivityTableRenderMock = jest.fn();
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

    renderDashboard();
    expect(screen.getByText("Users")).toBeInTheDocument();
    expect(screen.getByText("Workstations")).toBeInTheDocument();
    expect(screen.getByText("Groups")).toBeInTheDocument();
    expect(screen.getByText("Files")).toBeInTheDocument();
  });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "http://localhost:5050/api/activity/org-123?page=1&limit=20"
      );
    });

    renderDashboard();
    expect(screen.getByText("16")).toBeInTheDocument(); // Users
    expect(screen.getByText("12")).toBeInTheDocument(); // Workstations
    expect(screen.getByText("3")).toBeInTheDocument(); // Groups
    expect(screen.getByText("33")).toBeInTheDocument(); // Files
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

    renderDashboard();
    expect(screen.getByTestId("activity-panel")).toBeInTheDocument();
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

    const { container } = renderDashboard();
    const mainBox = container.firstChild;
    expect(mainBox).toHaveStyle({ display: "flex", flexDirection: "column" });
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

    renderDashboard();
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

    renderDashboard();
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

    renderDashboard();

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

    renderDashboard();

    await waitFor(() => {
      const anyLoadingTrue = mockActivityTableRenderMock.mock.calls.some(
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
        mockActivityTableRenderMock.mock.calls[
          mockActivityTableRenderMock.mock.calls.length - 1
        ][0];
      expect(lastCallProps.loading).toBe(false);
    });
  });

  describe("fetchActivities - Comprehensive Coverage", () => {
    beforeEach(() => {
      mockActivityTableRenderMock = jest.fn();
    });

    it("should fetch activities with correct pagination parameters", async () => {
      const mockActivities = [
        { id: "1", actor: "Alice", description: "Created user", timestamp: "2025-01-01" },
        { id: "2", actor: "Bob", description: "Deleted file", timestamp: "2025-01-02" },
      ];
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: mockActivities, total: 42 }),
      });

      render(<DashboardPage />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          "http://localhost:5050/api/activity/org-123?page=1&limit=20"
        );
        expect(screen.getByTestId("activity-size")).toHaveTextContent("2");
        expect(screen.getByTestId("activity-total")).toHaveTextContent("42");
      });
    });

    it("should convert 0-indexed page to 1-indexed API page", async () => {
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ items: [], total: 0 }),
        })
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

      // Page 0 -> API page 1
      expect(global.fetch.mock.calls[0][0]).toContain("page=1");

      // Click to page 1
      fireEvent.click(screen.getByText("change-page"));
      await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));

      // Page 2 -> API page 3
      expect(global.fetch.mock.calls[1][0]).toContain("page=3");
    });

    it("should handle API response with partial data (only items, no total)", async () => {
      const mockActivities = [{ id: "1" }, { id: "2" }];
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: mockActivities }),
      });

      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByTestId("activity-size")).toHaveTextContent("2");
        expect(screen.getByTestId("activity-total")).toHaveTextContent("0");
      });
    });

    it("should handle API response with partial data (only total, no items)", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ total: 100 }),
      });

      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByTestId("activity-size")).toHaveTextContent("0");
        expect(screen.getByTestId("activity-total")).toHaveTextContent("100");
      });
    });

    it("should handle empty activities array and zero total", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [], total: 0 }),
      });

      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByTestId("activity-size")).toHaveTextContent("0");
        expect(screen.getByTestId("activity-total")).toHaveTextContent("0");
      });
    });

    it("should set loading state to true before fetch and false after", async () => {
      let resolveFetch;
      const fetchPromise = new Promise((resolve) => {
        resolveFetch = resolve;
      });
      global.fetch.mockReturnValueOnce(fetchPromise);

      render(<DashboardPage />);

      // Check that loading is set to true during fetch
      await waitFor(() => {
        const propositionWithLoading = mockActivityTableRenderMock.mock.calls.some(
          ([props]) => props.loading === true
        );
        expect(propositionWithLoading).toBe(true);
      });

      resolveFetch({
        ok: true,
        json: async () => ({ items: [], total: 0 }),
      });

      // Check that loading is set to false after fetch
      await waitFor(() => {
        const lastProps =
          mockActivityTableRenderMock.mock.calls[
            mockActivityTableRenderMock.mock.calls.length - 1
          ][0];
        expect(lastProps.loading).toBe(false);
      });
    });

    it("should still set loading to false even when response.ok is false", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({}),
      });

      render(<DashboardPage />);

      await waitFor(() => {
        const lastProps =
          mockActivityTableRenderMock.mock.calls[
            mockActivityTableRenderMock.mock.calls.length - 1
          ][0];
        expect(lastProps.loading).toBe(false);
      });
    });

    it("should still set loading to false even when fetch throws", async () => {
      global.fetch.mockRejectedValueOnce(new Error("Network error"));

      render(<DashboardPage />);

      await waitFor(() => {
        const lastProps =
          mockActivityTableRenderMock.mock.calls[
            mockActivityTableRenderMock.mock.calls.length - 1
          ][0];
        expect(lastProps.loading).toBe(false);
      });
    });

    it("should construct correct API URL with org_id from localStorage", async () => {
      localStorage.setItem("org_id", "special-org-456");
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [], total: 0 }),
      });

      render(<DashboardPage />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          "http://localhost:5050/api/activity/special-org-456?page=1&limit=20"
        );
      });
    });

    it("should not fetch when org_id is not in localStorage", async () => {
      localStorage.removeItem("org_id");
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByTestId("activity-table")).toBeInTheDocument();
      });

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("should include correct rowsPerPage in API URL", async () => {
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

      expect(global.fetch.mock.calls[0][0]).toContain("limit=20");

      fireEvent.click(screen.getByText("change-rpp"));
      await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));

      expect(global.fetch.mock.calls[1][0]).toContain("limit=50");
    });

    it("should handle multiple rapid refreshes correctly", async () => {
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ items: [{ id: "1" }], total: 1 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ items: [{ id: "2" }], total: 1 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ items: [{ id: "3" }], total: 1 }),
        });

      render(<DashboardPage />);
      await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

      fireEvent.click(screen.getByText("refresh"));
      fireEvent.click(screen.getByText("refresh"));

      await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(3));
      expect(screen.getByTestId("activity-size")).toHaveTextContent("1");
    });

    it("should handle 400 Bad Request response", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: "Invalid request" }),
      });

      render(<DashboardPage />);

      await waitFor(() => {
        expect(console.error).toHaveBeenCalledWith("Failed to fetch activities");
      });

      expect(screen.getByTestId("activity-size")).toHaveTextContent("0");
    });

    it("should handle 401 Unauthorized response", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: "Unauthorized" }),
      });

      render(<DashboardPage />);

      await waitFor(() => {
        expect(console.error).toHaveBeenCalledWith("Failed to fetch activities");
      });

      expect(screen.getByTestId("activity-size")).toHaveTextContent("0");
    });

    it("should handle 403 Forbidden response", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ error: "Forbidden" }),
      });

      render(<DashboardPage />);

      await waitFor(() => {
        expect(console.error).toHaveBeenCalledWith("Failed to fetch activities");
      });

      expect(screen.getByTestId("activity-size")).toHaveTextContent("0");
    });

    it("should handle 404 Not Found response", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: "Not found" }),
      });

      render(<DashboardPage />);

      await waitFor(() => {
        expect(console.error).toHaveBeenCalledWith("Failed to fetch activities");
      });

      expect(screen.getByTestId("activity-size")).toHaveTextContent("0");
    });

    it("should handle 500 Server Error response", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: "Internal server error" }),
      });

      render(<DashboardPage />);

      await waitFor(() => {
        expect(console.error).toHaveBeenCalledWith("Failed to fetch activities");
      });

      expect(screen.getByTestId("activity-size")).toHaveTextContent("0");
    });

    it("should handle network errors gracefully", async () => {
      const networkError = new Error("Failed to fetch");
      global.fetch.mockRejectedValueOnce(networkError);

      render(<DashboardPage />);

      await waitFor(() => {
        expect(console.error).toHaveBeenCalledWith(
          "Error fetching activities:",
          networkError
        );
      });

      expect(screen.getByTestId("activity-size")).toHaveTextContent("0");
    });

    it("should handle timeout errors", async () => {
      const timeoutError = new Error("The operation was aborted");
      global.fetch.mockRejectedValueOnce(timeoutError);

      render(<DashboardPage />);

      await waitFor(() => {
        expect(console.error).toHaveBeenCalledWith(
          "Error fetching activities:",
          timeoutError
        );
      });
    });

    it("should handle JSON parsing errors in response", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error("Invalid JSON");
        },
      });

      render(<DashboardPage />);

      await waitFor(() => {
        expect(console.error).toHaveBeenCalledWith(
          "Error fetching activities:",
          expect.any(Error)
        );
      });
    });

    it("should maintain correct state after successful fetch", async () => {
      const mockActivities = [
        { id: "act-1", actor: "Alice", description: "Action 1" },
        { id: "act-2", actor: "Bob", description: "Action 2" },
        { id: "act-3", actor: "Charlie", description: "Action 3" },
      ];
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: mockActivities, total: 150 }),
      });

      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByTestId("activity-size")).toHaveTextContent("3");
        expect(screen.getByTestId("activity-total")).toHaveTextContent("150");
        expect(screen.getByTestId("activity-page")).toHaveTextContent("0");
        expect(screen.getByTestId("activity-rpp")).toHaveTextContent("20");
      });
    });

    it("should respect page and rowsPerPage from state when fetching", async () => {
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ items: [], total: 0 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ items: [], total: 0 }),
        })
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

      // Initial: page=0, limit=20 -> API page=1, limit=20
      expect(global.fetch.mock.calls[0][0]).toContain("page=1&limit=20");

      // Change page to 5
      fireEvent.click(screen.getByText("change-page"));
      await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
      expect(global.fetch.mock.calls[1][0]).toContain("page=3&limit=20");

      // Change rowsPerPage to 50 (resets page to 0)
      fireEvent.click(screen.getByText("change-rpp"));
      await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(3));
      expect(global.fetch.mock.calls[2][0]).toContain("page=1&limit=50");
    });

    it("should handle response with large arrays of activities", async () => {
      const largeActivityArray = Array.from({ length: 100 }, (_, i) => ({
        id: `activity-${i}`,
        actor: `Actor ${i}`,
        description: `Action ${i}`,
      }));
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: largeActivityArray, total: 500 }),
      });

      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByTestId("activity-size")).toHaveTextContent("100");
        expect(screen.getByTestId("activity-total")).toHaveTextContent("500");
      });
    });

    it("should handle response with null items field", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: null, total: 50 }),
      });

      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByTestId("activity-size")).toHaveTextContent("0");
        expect(screen.getByTestId("activity-total")).toHaveTextContent("50");
      });
    });

    it("should handle response with null total field", async () => {
      const mockActivities = [{ id: "1" }, { id: "2" }];
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: mockActivities, total: null }),
      });

      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByTestId("activity-size")).toHaveTextContent("2");
        expect(screen.getByTestId("activity-total")).toHaveTextContent("0");
      });
    });

    it("should trigger fetchActivities again when page dependency changes", async () => {
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
      await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
    });

    it("tracks add users", () => {
      renderDashboard();
      const userCard = screen.getByTestId("stat-card-users");
      fireEvent.click(userCard.querySelector("button"));
      expect(trackButton).toHaveBeenCalledWith("dashboard/statcard/add", {
        page: "dashboard",
        entity: "users",
      });
    });

    it("tracks add workstations", () => {
      renderDashboard();
      const card = screen.getByTestId("stat-card-workstations");
      fireEvent.click(card.querySelector("button"));
      expect(trackButton).toHaveBeenCalledWith("dashboard/statcard/add", {
        page: "dashboard",
        entity: "workstations",
      });
    });

    it("tracks add groups", () => {
      renderDashboard();
      const card = screen.getByTestId("stat-card-groups");
      fireEvent.click(card.querySelector("button"));
      expect(trackButton).toHaveBeenCalledWith("dashboard/statcard/add", {
        page: "dashboard",
        entity: "groups",
      });
    });

    it("tracks add files", () => {
      renderDashboard();
      const card = screen.getByTestId("stat-card-files");
      fireEvent.click(card.querySelector("button"));
      expect(trackButton).toHaveBeenCalledWith("dashboard/statcard/add", {
        page: "dashboard",
        entity: "files",
      });

      render(<DashboardPage />);

      await waitFor(() => {
        const url = global.fetch.mock.calls[0][0];
        expect(url).toMatch(/^http:\/\/localhost:5050/);
      });
    });

    it("should construct URL with correct endpoint format", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [], total: 0 }),
      });

      render(<DashboardPage />);

      await waitFor(() => {
        const url = global.fetch.mock.calls[0][0];
        expect(url).toMatch(/\/api\/activity\/org-123/);
      });
    });

    it("should handle response with extra fields in activity objects", async () => {
      const mockActivities = [
        {
          id: "1",
          actor: "Alice",
          description: "action",
          timestamp: "2025-01-01",
          metadata: { key: "value" },
          extra: "field",
        },
      ];
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: mockActivities, total: 1 }),
      });

      render(<DashboardPage />);

      await waitFor(() => {
        const lastCall = mockActivityTableRenderMock.mock.calls[
          mockActivityTableRenderMock.mock.calls.length - 1
        ][0];
        expect(lastCall.activities[0]).toEqual(mockActivities[0]);
      });
    });

    it("should handle 502 Bad Gateway response", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 502,
        json: async () => ({ error: "Bad Gateway" }),
      });

      render(<DashboardPage />);

      await waitFor(() => {
        expect(console.error).toHaveBeenCalledWith("Failed to fetch activities");
      });

      expect(screen.getByTestId("activity-size")).toHaveTextContent("0");
    });

    it("should handle 503 Service Unavailable response", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => ({ error: "Service Unavailable" }),
      });

      render(<DashboardPage />);

      await waitFor(() => {
        expect(console.error).toHaveBeenCalledWith("Failed to fetch activities");
      });

      expect(screen.getByTestId("activity-size")).toHaveTextContent("0");
    });

    it("should handle DOMException (typical browser fetch error)", async () => {
      const domError = new DOMException("The user aborted a request");
      global.fetch.mockRejectedValueOnce(domError);

      render(<DashboardPage />);

      await waitFor(() => {
        expect(console.error).toHaveBeenCalledWith(
          "Error fetching activities:",
          domError
        );
      });
    });

    it("should handle TypeError from fetch", async () => {
      const typeError = new TypeError("Failed to fetch");
      global.fetch.mockRejectedValueOnce(typeError);

      render(<DashboardPage />);

      await waitFor(() => {
        expect(console.error).toHaveBeenCalledWith(
          "Error fetching activities:",
          typeError
        );
      });
    });

    it("should not update state if response is not ok", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ items: [{ id: "should-not-appear" }], total: 99 }),
      });

      render(<DashboardPage />);

      await waitFor(() => {
        expect(console.error).toHaveBeenCalledWith("Failed to fetch activities");
      });

      // State should remain at default values
      expect(screen.getByTestId("activity-size")).toHaveTextContent("0");
      expect(screen.getByTestId("activity-total")).toHaveTextContent("0");
    });

    it("should fetch again when org_id changes", async () => {
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ items: [{ id: "1" }], total: 1 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ items: [{ id: "2" }], total: 1 }),
        });

      const { rerender } = render(<DashboardPage />);
      await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

      // Change org_id
      localStorage.setItem("org_id", "new-org-789");
      rerender(<DashboardPage />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(2);
        const lastCall = global.fetch.mock.calls[1][0];
        expect(lastCall).toContain("new-org-789");
      });
    });

    it("should handle response with boolean false in items field", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: false, total: 0 }),
      });

      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByTestId("activity-size")).toHaveTextContent("0");
      });
    });

    it("should handle response with boolean false in total field", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [{ id: "1" }], total: false }),
      });

      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByTestId("activity-total")).toHaveTextContent("0");
      });
    });

    it("should handle 429 Too Many Requests response", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({ error: "Too many requests" }),
      });

      render(<DashboardPage />);

      await waitFor(() => {
        expect(console.error).toHaveBeenCalledWith("Failed to fetch activities");
      });
    });

    it("should handle response with special characters in activity data", async () => {
      const mockActivities = [
        {
          id: "1",
          actor: "用户",
          description: 'Created "special" <file>',
        },
      ];
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: mockActivities, total: 1 }),
      });

      render(<DashboardPage />);

      await waitFor(() => {
        const lastCall = mockActivityTableRenderMock.mock.calls[
          mockActivityTableRenderMock.mock.calls.length - 1
        ][0];
        expect(lastCall.activities[0].actor).toBe("用户");
        expect(lastCall.activities[0].description).toBe(
          'Created "special" <file>'
        );
      });
    });

    it("should handle concurrent page and rowsPerPage changes", async () => {
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

      // Both actions should trigger a fetch (rowsPerPage change resets page)
      fireEvent.click(screen.getByText("change-rpp"));
      await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));

      expect(global.fetch.mock.calls[1][0]).toContain("page=1&limit=50");
    });

    it("should maintain pagination state in UI after load", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [], total: 50 }),
      });

      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByTestId("activity-page")).toHaveTextContent("0");
        expect(screen.getByTestId("activity-rpp")).toHaveTextContent("20");
        expect(screen.getByTestId("activity-total")).toHaveTextContent("50");
      });
    });

    it("should handle response with undefined in items array", async () => {
      const mockActivities = [
        { id: "1", actor: "Alice", description: "Action 1" },
        undefined,
        { id: "2", actor: "Bob", description: "Action 2" },
      ];
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: mockActivities, total: 3 }),
      });

      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByTestId("activity-size")).toHaveTextContent("3");
      });
    });

    it("should handle very large total count value", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [], total: 999999999 }),
      });

      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByTestId("activity-total")).toHaveTextContent(
          "999999999"
        );
      });
    });

    it("should handle 0 page and rowsPerPage correctly", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [], total: 0 }),
      });

      render(<DashboardPage />);

      await waitFor(() => {
        const url = global.fetch.mock.calls[0][0];
        // page 0 + 1 = 1
        expect(url).toContain("page=1&limit=20");
      });
    });

    it("should handle mixed success and error scenarios", async () => {
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ items: [{ id: "1" }], total: 1 }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: async () => ({}),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ items: [{ id: "2" }], total: 1 }),
        });

      render(<DashboardPage />);
      await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

      // First fetch succeeds
      expect(screen.getByTestId("activity-size")).toHaveTextContent("1");

      // Second fetch fails
      fireEvent.click(screen.getByText("refresh"));
      await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
      expect(console.error).toHaveBeenCalledWith("Failed to fetch activities");

      // State should not change after failed fetch
      expect(screen.getByTestId("activity-size")).toHaveTextContent("1");

      // Third fetch succeeds
      fireEvent.click(screen.getByText("refresh"));
      await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(3));
      expect(screen.getByTestId("activity-size")).toHaveTextContent("1");
    });

    it("should handle response with numeric strings in total", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [], total: "100" }),
      });

      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByTestId("activity-total")).toHaveTextContent("100");
      });
    });

    it("should handle response with numeric strings in items length", async () => {
      const mockActivities = [
        { id: "1", actor: "Alice", description: "Action" },
      ];
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: mockActivities, total: "50" }),
      });

      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByTestId("activity-size")).toHaveTextContent("1");
        expect(screen.getByTestId("activity-total")).toHaveTextContent("50");
      });
    });

    it("should call fetch with correct parameters in specific order", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [], total: 0 }),
      });

      render(<DashboardPage />);

      await waitFor(() => {
        const [url] = global.fetch.mock.calls[0];
        const parts = url.split("?");
        expect(parts.length).toBe(2);
        expect(parts[0]).toBe("http://localhost:5050/api/activity/org-123");
        expect(parts[1]).toMatch(/page=\d+&limit=\d+/);
      });
    });

    it("should handle response with extra top-level fields", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [{ id: "1" }],
          total: 1,
          status: "success",
          message: "Data retrieved",
          timestamp: "2025-01-01T00:00:00Z",
        }),
      });

      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByTestId("activity-size")).toHaveTextContent("1");
        expect(screen.getByTestId("activity-total")).toHaveTextContent("1");
      });
    });

    it("should handle refresh when at different page positions", async () => {
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ items: [], total: 100 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ items: [], total: 100 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ items: [], total: 100 }),
        });

      render(<DashboardPage />);
      await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

      // Go to page 2
      fireEvent.click(screen.getByText("change-page"));
      await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));

      // Refresh at page 2
      fireEvent.click(screen.getByText("refresh"));
      await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(3));

      // Should still be at page 2
      expect(global.fetch.mock.calls[2][0]).toContain("page=3");
    });
  });

  describe("Org metrics rendering (useOrgMetrics)", () => {
    beforeEach(() => {
      useOrgMetrics.mockClear();
    });


    it('shows "…" when stats are missing and statsLoading=true', () => {
      useOrgMetrics.mockReturnValue({ stats: {}, loading: true });

      renderDashboard();

      expect(screen.getByTestId("stat-card-users")).toHaveTextContent("…");
      expect(screen.getByTestId("stat-card-workstations")).toHaveTextContent("…");
      expect(screen.getByTestId("stat-card-groups")).toHaveTextContent("…");

      const sharesOrFiles =
        screen.queryByTestId("stat-card-shares") ||
        screen.queryByTestId("stat-card-files");
      expect(sharesOrFiles).toBeTruthy();
      expect(sharesOrFiles).toHaveTextContent("…");
    });

    it("shows 0 when stats are missing and statsLoading=false", () => {
      useOrgMetrics.mockReturnValue({ stats: {}, loading: false });

      renderDashboard();

      expect(screen.getByTestId("stat-card-users")).toHaveTextContent("0");
      expect(screen.getByTestId("stat-card-workstations")).toHaveTextContent("0");
      expect(screen.getByTestId("stat-card-groups")).toHaveTextContent("0");

      const sharesOrFiles =
        screen.queryByTestId("stat-card-shares") ||
        screen.queryByTestId("stat-card-files");
      expect(sharesOrFiles).toBeTruthy();
      expect(sharesOrFiles).toHaveTextContent("0");
    });
  });
});

