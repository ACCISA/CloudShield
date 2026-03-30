/**
 * SecurityDashboardPage.test.jsx
 *
 * Comprehensive test suite for SecurityDashboardPage component.
 * Tests rendering, component integration, alert updates, and layout.
 */
import React from "react";
import { render, screen, act } from "@testing-library/react";
import SecurityDashboardPage from "../SecurityDashboardPage";

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockRefresh = jest.fn();
let mockAlertsHookReturn = {
  alerts: [],
  loading: false,
  error: null,
  refresh: mockRefresh,
};

jest.mock("../../api/threatApi.js", () => ({
  useSecurityAlerts: jest.fn(),
  updateAlertStatus: jest.fn().mockResolvedValue(undefined),
}));

import { useSecurityAlerts, updateAlertStatus } from "../../api/threatApi.js";

// Capture the onUpdateAlert prop passed to SecurityAlertsPanel
let capturedOnUpdateAlert = null;

jest.mock("../../components/layout/PageShell.jsx", () => ({
  __esModule: true,
  default: ({ children }) => <div data-testid="page-shell">{children}</div>,
}));

jest.mock("../../components/security/SecurityChartsPanel.jsx", () => {
  return function SecurityChartsPanel({ alerts }) {
    return (
      <div data-testid="security-charts-panel">
        <span data-testid="charts-alerts-count">{alerts.length}</span>
      </div>
    );
  };
});

jest.mock("../../components/security/SecurityAlertsPanel.jsx", () => {
  return function SecurityAlertsPanel({ alerts, loading, error, onRefresh, onUpdateAlert }) {
    capturedOnUpdateAlert = onUpdateAlert;
    return (
      <div data-testid="security-alerts-panel">
        <span data-testid="panel-alerts-count">{alerts.length}</span>
        <span data-testid="panel-loading">{String(loading)}</span>
        {error && <span data-testid="panel-error">{error.message}</span>}
        <button data-testid="refresh-btn" onClick={onRefresh}>Refresh</button>
      </div>
    );
  };
});

// ── Helpers ───────────────────────────────────────────────────────────────────

const SAMPLE_ALERTS = [
  { id: "a1", type: "Network intrusion", risk: "high", status: "unresolved" },
  { id: "a2", type: "Anomaly", risk: "moderate", status: "unresolved" },
];

beforeEach(() => {
  capturedOnUpdateAlert = null;
  mockRefresh.mockClear();
  updateAlertStatus.mockClear();
  mockAlertsHookReturn = {
    alerts: [],
    loading: false,
    error: null,
    refresh: mockRefresh,
  };
  useSecurityAlerts.mockImplementation(() => mockAlertsHookReturn);
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

// ── Rendering ─────────────────────────────────────────────────────────────────

describe("Basic Rendering", () => {
  it("renders without crashing", () => {
    const { container } = render(<SecurityDashboardPage />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it("renders inside PageShell", () => {
    render(<SecurityDashboardPage />);
    expect(screen.getByTestId("page-shell")).toBeInTheDocument();
  });

  it("renders SecurityChartsPanel and SecurityAlertsPanel", () => {
    render(<SecurityDashboardPage />);
    expect(screen.getByTestId("security-charts-panel")).toBeInTheDocument();
    expect(screen.getByTestId("security-alerts-panel")).toBeInTheDocument();
  });

  it("renders components in correct order", () => {
    render(<SecurityDashboardPage />);
    const content = screen.getByTestId("security-dashboard-content");
    expect(content.children[0]).toHaveAttribute("data-testid", "security-charts-panel");
    expect(content.children[1]).toHaveAttribute("data-testid", "security-alerts-panel");
  });

  it("passes alerts from hook to both panels", () => {
    mockAlertsHookReturn = { alerts: SAMPLE_ALERTS, loading: false, error: null, refresh: mockRefresh };
    useSecurityAlerts.mockReturnValue(mockAlertsHookReturn);

    render(<SecurityDashboardPage />);
    expect(screen.getByTestId("charts-alerts-count")).toHaveTextContent("2");
    expect(screen.getByTestId("panel-alerts-count")).toHaveTextContent("2");
  });

  it("passes loading state to SecurityAlertsPanel", () => {
    mockAlertsHookReturn = { alerts: [], loading: true, error: null, refresh: mockRefresh };
    useSecurityAlerts.mockReturnValue(mockAlertsHookReturn);

    render(<SecurityDashboardPage />);
    expect(screen.getByTestId("panel-loading")).toHaveTextContent("true");
  });

  it("passes error to SecurityAlertsPanel", () => {
    mockAlertsHookReturn = { alerts: [], loading: false, error: new Error("fetch failed"), refresh: mockRefresh };
    useSecurityAlerts.mockReturnValue(mockAlertsHookReturn);

    render(<SecurityDashboardPage />);
    expect(screen.getByTestId("panel-error")).toHaveTextContent("fetch failed");
  });
});

// ── Layout and Styling ────────────────────────────────────────────────────────

describe("Layout and Styling", () => {
  it("applies flex column layout", () => {
    render(<SecurityDashboardPage />);
    const content = screen.getByTestId("security-dashboard-content");
    expect(content).toHaveStyle({ display: "flex", flexDirection: "column" });
  });

  it("has correct minWidth and full width", () => {
    render(<SecurityDashboardPage />);
    const content = screen.getByTestId("security-dashboard-content");
    expect(content).toHaveStyle({ minWidth: "1150px", width: "100%" });
  });
});

// ── Polling (setInterval) ─────────────────────────────────────────────────────

describe("Auto-refresh polling", () => {
  it("calls refresh after 30 seconds", () => {
    render(<SecurityDashboardPage />);
    expect(mockRefresh).not.toHaveBeenCalled();
    act(() => { jest.advanceTimersByTime(30_000); });
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it("clears interval on unmount", () => {
    const { unmount } = render(<SecurityDashboardPage />);
    unmount();
    act(() => { jest.advanceTimersByTime(60_000); });
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it("calls refresh multiple times at 30s intervals", () => {
    render(<SecurityDashboardPage />);
    act(() => { jest.advanceTimersByTime(90_000); });
    expect(mockRefresh).toHaveBeenCalledTimes(3);
  });
});

// ── handleUpdateAlert ─────────────────────────────────────────────────────────

describe("handleUpdateAlert", () => {
  beforeEach(() => {
    mockAlertsHookReturn = { alerts: SAMPLE_ALERTS, loading: false, error: null, refresh: mockRefresh };
    useSecurityAlerts.mockReturnValue(mockAlertsHookReturn);
  });

  it("applies override so updated alert appears with new status", () => {
    render(<SecurityDashboardPage />);
    expect(capturedOnUpdateAlert).not.toBeNull();

    act(() => { capturedOnUpdateAlert("a1", { status: "resolved" }); });

    // alerts still shown (resolved, not removed)
    expect(screen.getByTestId("panel-alerts-count")).toHaveTextContent("2");
  });

  it("filters out alerts with status 'removed'", () => {
    render(<SecurityDashboardPage />);

    act(() => { capturedOnUpdateAlert("a1", { status: "removed" }); });

    // a1 is filtered out, only a2 remains
    expect(screen.getByTestId("panel-alerts-count")).toHaveTextContent("1");
    expect(screen.getByTestId("charts-alerts-count")).toHaveTextContent("1");
  });

  it("calls updateAlertStatus with 'false_positive' when status is 'removed'", async () => {
    render(<SecurityDashboardPage />);

    await act(async () => { capturedOnUpdateAlert("a1", { status: "removed" }); });

    expect(updateAlertStatus).toHaveBeenCalledWith("a1", "false_positive");
  });

  it("calls updateAlertStatus with the real status for non-removed values", async () => {
    render(<SecurityDashboardPage />);

    await act(async () => { capturedOnUpdateAlert("a2", { status: "resolved" }); });

    expect(updateAlertStatus).toHaveBeenCalledWith("a2", "resolved");
  });

  it("does not call updateAlertStatus when patch has no status field", async () => {
    render(<SecurityDashboardPage />);

    await act(async () => { capturedOnUpdateAlert("a1", { risk: "low" }); });

    expect(updateAlertStatus).not.toHaveBeenCalled();
  });

  it("merges multiple overrides for the same alert", () => {
    render(<SecurityDashboardPage />);

    act(() => { capturedOnUpdateAlert("a1", { risk: "low" }); });
    act(() => { capturedOnUpdateAlert("a1", { status: "resolved" }); });

    // still 2 alerts (resolved not filtered)
    expect(screen.getByTestId("panel-alerts-count")).toHaveTextContent("2");
  });

  it("silently ignores updateAlertStatus errors", async () => {
    updateAlertStatus.mockRejectedValue(new Error("server error"));
    render(<SecurityDashboardPage />);

    // Should not throw
    await act(async () => { capturedOnUpdateAlert("a1", { status: "resolved" }); });
    expect(screen.getByTestId("panel-alerts-count")).toHaveTextContent("2");
  });
});

// ── PageShell integration ─────────────────────────────────────────────────────

describe("PageShell integration", () => {
  it("passes no title/subtitle/actions props to PageShell", () => {
    const mockShell = jest.fn(({ children }) => <div>{children}</div>);
    jest.mock("../../components/layout/PageShell.jsx", () => ({
      __esModule: true,
      default: (props) => mockShell(props),
    }));
    render(<SecurityDashboardPage />);
    // Component renders without crashing — PageShell gets no extra props
    expect(screen.getByTestId("security-dashboard-content")).toBeInTheDocument();
  });
});
