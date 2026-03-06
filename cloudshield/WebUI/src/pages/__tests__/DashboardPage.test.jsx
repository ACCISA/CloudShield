import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import DashboardPage from "../DashboardPage";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { useOrgMetrics } from "../../api/useOrgMetrics.js";
import { apiGet } from "../../api/client.js";
import { trackButton } from "../../lib/analytics";

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: jest.fn(),
}));

jest.mock("../../context/AuthContext.jsx", () => ({
  useAuth: jest.fn(),
}));

jest.mock("../../api/useOrgMetrics.js", () => ({
  useOrgMetrics: jest.fn(),
}));

jest.mock("../../api/client.js", () => ({
  apiGet: jest.fn(),
}));

jest.mock("../../lib/analytics", () => ({
  trackButton: jest.fn(),
}));

jest.mock("../../components/dashboard/StatCard.jsx", () => {
  return function MockStatCard({ title, value, onAdd }) {
    return (
      <button type="button" onClick={onAdd}>
        {title}:{value}
      </button>
    );
  };
});

jest.mock("../../components/dashboard/ActivityPanel.jsx", () => {
  return function MockActivityPanel(props) {
    return (
      <div data-testid="activity-panel">
        <div data-testid="initial-count">{props.initialData.length}</div>
        <div data-testid="total-items">{props.totalItems}</div>
        <div data-testid="current-page">{props.currentPage}</div>
        <div data-testid="rows-per-page">{props.rowsPerPage}</div>
        <div data-testid="first-activity">
          {props.initialData[0] ? JSON.stringify(props.initialData[0]) : ""}
        </div>
        <div data-testid="third-activity">
          {props.initialData[2] ? JSON.stringify(props.initialData[2]) : ""}
        </div>
        <button type="button" onClick={props.fetchActivities}>
          refresh-activity
        </button>
        <button type="button" onClick={() => props.onPageChange(3)}>
          set-page-3
        </button>
        <button type="button" onClick={() => props.onRowsPerPageChange(50)}>
          set-rpp-50
        </button>
      </div>
    );
  };
});

function renderDashboard() {
  return render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>,
  );
}

describe("DashboardPage activity fetching and normalization", () => {
  let navigateMock;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    navigateMock = jest.fn();
    useNavigate.mockReturnValue(navigateMock);
    useOrgMetrics.mockReturnValue({
      stats: { users: 1, workstations: 2, groups: 3, shares: 4 },
      loading: false,
    });
    useAuth.mockReturnValue({
      currentUser: { org_id: "auth-current-org" },
      user: { org_id: "auth-user-org" },
    });
  });

  it("uses org_id from localStorage before auth fallbacks", async () => {
    localStorage.setItem("org_id", "local-org");
    apiGet.mockResolvedValueOnce({ items: [], total: 0 });

    renderDashboard();

    await waitFor(() => {
      expect(apiGet).toHaveBeenCalledWith("/activity/local-org?page=1&limit=20");
    });
  });

  it("falls back to auth.currentUser.org_id when localStorage org_id is missing", async () => {
    apiGet.mockResolvedValueOnce({ items: [], total: 0 });
    useAuth.mockReturnValueOnce({
      currentUser: { org_id: "current-user-org" },
      user: { org_id: "auth-user-org" },
    });

    renderDashboard();

    await waitFor(() => {
      expect(apiGet).toHaveBeenCalledWith(
        "/activity/current-user-org?page=1&limit=20",
      );
    });
  });

  it("falls back to auth.user.org_id when currentUser.org_id is missing", async () => {
    apiGet.mockResolvedValueOnce({ items: [], total: 0 });
    useAuth.mockReturnValueOnce({
      currentUser: null,
      user: { org_id: "auth-user-only-org" },
    });

    renderDashboard();

    await waitFor(() => {
      expect(apiGet).toHaveBeenCalledWith(
        "/activity/auth-user-only-org?page=1&limit=20",
      );
    });
  });

  it("returns early and does not fetch when org_id cannot be resolved", async () => {
    useAuth.mockReturnValueOnce({ currentUser: null, user: null });

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByTestId("activity-panel")).toBeInTheDocument();
    });
    expect(apiGet).not.toHaveBeenCalled();
    expect(screen.getByTestId("initial-count")).toHaveTextContent("0");
    expect(screen.getByTestId("total-items")).toHaveTextContent("0");
  });

  it("normalizes activity items from mixed payload fields", async () => {
    localStorage.setItem("org_id", "org-123");
    apiGet.mockResolvedValueOnce({
      items: [
        {
          _id: "mongo-1",
          actor: "Alice",
          action: "Added user",
          created_at: "2026-03-05T08:00:00.000Z",
        },
        {
          id: "explicit-2",
          user: "Bob",
          activity: "Updated policy",
          date: "03/05/2026 09:15 AM",
        },
        {},
      ],
      total: 3,
    });

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByTestId("initial-count")).toHaveTextContent("3");
      expect(screen.getByTestId("total-items")).toHaveTextContent("3");
    });

    const first = JSON.parse(screen.getByTestId("first-activity").textContent);
    expect(first.id).toBe("mongo-1");
    expect(first.user).toBe("Alice");
    expect(first.activity).toBe("Added user");
    expect(first.date).not.toBe("-");

    const third = JSON.parse(screen.getByTestId("third-activity").textContent);
    expect(third.id).toBe("activity-2");
    expect(third.user).toBe("System");
    expect(third.activity).toBe("Performed an action");
    expect(third.date).toBe("-");
  });

  it("handles non-array items by setting empty activities while preserving total", async () => {
    localStorage.setItem("org_id", "org-123");
    apiGet.mockResolvedValueOnce({
      items: null,
      total: 100,
    });

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByTestId("initial-count")).toHaveTextContent("0");
      expect(screen.getByTestId("total-items")).toHaveTextContent("100");
    });
  });

  it("handles fetchActivities errors and returns empty activities", async () => {
    localStorage.setItem("org_id", "org-123");
    apiGet.mockRejectedValueOnce(new Error("network error"));
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    renderDashboard();

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith(
        "Error fetching activities:",
        expect.any(Error),
      );
      expect(screen.getByTestId("initial-count")).toHaveTextContent("0");
      expect(screen.getByTestId("total-items")).toHaveTextContent("0");
    });
  });

  it("re-fetches with updated page and rowsPerPage values", async () => {
    localStorage.setItem("org_id", "org-123");
    apiGet.mockResolvedValue({ items: [], total: 0 });

    renderDashboard();

    await waitFor(() => {
      expect(apiGet).toHaveBeenCalledWith("/activity/org-123?page=1&limit=20");
    });

    apiGet.mockClear();
    fireEvent.click(screen.getByText("set-page-3"));
    await waitFor(() => {
      expect(apiGet).toHaveBeenCalledWith("/activity/org-123?page=3&limit=20");
    });

    apiGet.mockClear();
    fireEvent.click(screen.getByText("set-rpp-50"));
    await waitFor(() => {
      expect(apiGet).toHaveBeenCalledWith("/activity/org-123?page=1&limit=50");
    });
  });

  it("refresh button triggers fetchActivities again", async () => {
    localStorage.setItem("org_id", "org-123");
    apiGet.mockResolvedValue({ items: [], total: 0 });

    renderDashboard();

    await waitFor(() => {
      expect(apiGet).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByText("refresh-activity"));

    await waitFor(() => {
      expect(apiGet).toHaveBeenCalledTimes(2);
      expect(apiGet).toHaveBeenLastCalledWith("/activity/org-123?page=1&limit=20");
    });
  });

  it("tracks and navigates when stat cards are clicked (including Groups and Shares)", async () => {
    localStorage.setItem("org_id", "org-123");
    apiGet.mockResolvedValueOnce({ items: [], total: 0 });

    renderDashboard();

    await waitFor(() => {
      expect(apiGet).toHaveBeenCalledWith("/activity/org-123?page=1&limit=20");
    });

    fireEvent.click(screen.getByRole("button", { name: "Users:1" }));
    fireEvent.click(screen.getByRole("button", { name: "Workstations:2" }));
    fireEvent.click(screen.getByRole("button", { name: "Groups:3" }));
    fireEvent.click(screen.getByRole("button", { name: "Shares:4" }));

    expect(trackButton).toHaveBeenCalledWith("dashboard/statcard/add", {
      page: "dashboard",
      entity: "users",
    });
    expect(trackButton).toHaveBeenCalledWith("dashboard/statcard/add", {
      page: "dashboard",
      entity: "workstations",
    });
    expect(trackButton).toHaveBeenCalledWith("dashboard/statcard/add", {
      page: "dashboard",
      entity: "groups",
    });
    expect(trackButton).toHaveBeenCalledWith("dashboard/statcard/add", {
      page: "dashboard",
      entity: "files",
    });

    expect(navigateMock).toHaveBeenCalledWith("/employees", {
      state: { openModal: true },
    });
    expect(navigateMock).toHaveBeenCalledWith("/workstations", {
      state: { openModal: true },
    });
    expect(navigateMock).toHaveBeenCalledWith("/groups", {
      state: { openModal: true },
    });
    expect(navigateMock).toHaveBeenCalledWith("/files", {
      state: { openModal: true },
    });
  });
});
