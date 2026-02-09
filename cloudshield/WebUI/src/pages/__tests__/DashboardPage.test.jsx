import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

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

jest.mock("../../components/dashboard/ActivityPanel.jsx", () => {
  return function MockActivityPanel() {
    return <div data-testid="activity-panel">Activity</div>;
  };
});

jest.mock("../../components/dashboard/StatCard.jsx", () => {
  return function MockStatCard({ title, value, onAdd }) {
    return (
      <div data-testid={`stat-card-${title.toLowerCase()}`}>
        <div>{title}</div>
        <div>{String(value)}</div>
        <button type="button" onClick={onAdd}>
          Add
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
  let mockFetch;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch = jest.fn();
    global.fetch = mockFetch;
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
  });


  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("renders all stat cards", () => {
    useAuth.mockReturnValue({ user: { org_id: "org123" } });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ provisioning_status: "completed" }),
    });

    renderDashboard();
    expect(screen.getByText("Users")).toBeInTheDocument();
    expect(screen.getByText("Workstations")).toBeInTheDocument();
    expect(screen.getByText("Groups")).toBeInTheDocument();
    expect(screen.getByText("Files")).toBeInTheDocument();
  });

  it("displays correct stat values", () => {
    useAuth.mockReturnValue({ user: { org_id: "org123" } });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ provisioning_status: "completed" }),
    });

    renderDashboard();
    expect(screen.getByText("16")).toBeInTheDocument(); // Users
    expect(screen.getByText("12")).toBeInTheDocument(); // Workstations
    expect(screen.getByText("3")).toBeInTheDocument(); // Groups
    expect(screen.getByText("33")).toBeInTheDocument(); // Files
  });

  it("renders activity panel", () => {
    useAuth.mockReturnValue({ user: { org_id: "org123" } });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ provisioning_status: "completed" }),
    });

    renderDashboard();
    expect(screen.getByTestId("activity-panel")).toBeInTheDocument();
  });

  it("applies correct layout styles", () => {
    useAuth.mockReturnValue({ user: { org_id: "org123" } });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ provisioning_status: "completed" }),
    });

    const { container } = renderDashboard();
    const mainBox = container.firstChild;
    expect(mainBox).toHaveStyle({ display: "flex", flexDirection: "column" });
  });

  it("does not poll provisioning status without org_id", async () => {
    useAuth.mockReturnValue({ user: null });

    renderDashboard();

    // Give effects a tick.
    await waitFor(() => {
      expect(screen.getByText("Users")).toBeInTheDocument();
    });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("fetches provisioning status immediately and shows progress UI when in_progress", async () => {
    jest.useFakeTimers();
    useAuth.mockReturnValue({ user: { org_id: "org123" } });

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ provisioning_status: "in_progress" }),
    });

    renderDashboard();

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/organization/org123");
    });

    // Progress panel visible + loading text updated
    await waitFor(() => {
      expect(
        screen.getByText("Cloud Infrastructure Provisioning"),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          "Provisioning cloud infrastructure... This may take a few minutes.",
        ),
      ).toBeInTheDocument();
    });

    // After status flips to in_progress, component should start polling every 10s
    const initialCalls = mockFetch.mock.calls.length;
    jest.advanceTimersByTime(10000);

    await waitFor(() => {
      expect(mockFetch.mock.calls.length).toBeGreaterThan(initialCalls);
    });
  });

  it("hides progress UI when provisioning_status is missing (defaults to completed)", async () => {
    useAuth.mockReturnValue({ user: { org_id: "org123" } });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    renderDashboard();

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/organization/org123");
    });

    expect(
      screen.queryByText("Cloud Infrastructure Provisioning"),
    ).not.toBeInTheDocument();
  });

  it("logs an error if provisioning status fetch fails", async () => {
    useAuth.mockReturnValue({ user: { org_id: "org123" } });
    mockFetch.mockRejectedValueOnce(new Error("boom"));

    renderDashboard();

    await waitFor(() => {
      expect(console.error).toHaveBeenCalledWith(
        "Failed to fetch provisioning status",
        expect.any(Error),
      );
    });
  });

  describe("Add Button Handlers", () => {
    beforeEach(() => {
      useAuth.mockReturnValue({ user: { org_id: "org123" } });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ provisioning_status: "completed" }),
      });
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

