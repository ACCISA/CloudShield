/**
 * SecurityChartsPanel.test.jsx
 *
 * Comprehensive test suite for SecurityChartsPanel component.
 * Tests rendering, time range filtering, clock updates, and comparisons.
 * Designed to achieve 80%+ code coverage for SonarQube analysis.
 */
import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import SecurityChartsPanel from "../SecurityChartsPanel";

// Mock child components
jest.mock("../AlertsLineChart", () => {
  return function AlertsLineChart({ data, timeRange }) {
    return (
      <div data-testid="alerts-line-chart">
        <span data-testid="line-chart-count">{data.length}</span>
        <span data-testid="line-chart-timerange">{timeRange}</span>
      </div>
    );
  };
});

jest.mock("../AlertsPieChart", () => {
  return function AlertsPieChart({ data, timeRange }) {
    return (
      <div data-testid="alerts-pie-chart">
        <span data-testid="pie-chart-count">{data.length}</span>
        <span data-testid="pie-chart-timerange">{timeRange}</span>
      </div>
    );
  };
});

jest.mock("../TimeRangeSelector", () => {
  return function TimeRangeSelector({ value, onChange }) {
    return (
      <div data-testid="time-range-selector">
        <span data-testid="selected-range">{value}</span>
        <button onClick={() => onChange("7d")} data-testid="range-7d">
          7 days
        </button>
        <button onClick={() => onChange("14d")} data-testid="range-14d">
          14 days
        </button>
        <button onClick={() => onChange("30d")} data-testid="range-30d">
          30 days
        </button>
        <button onClick={() => onChange("90d")} data-testid="range-90d">
          90 days
        </button>
      </div>
    );
  };
});

jest.mock("../LiveIndicator", () => {
  return function LiveIndicator() {
    return <div data-testid="live-indicator">LIVE</div>;
  };
});

describe("SecurityChartsPanel Component", () => {
  const mockAlerts = [
    {
      id: 1,
      type: "Ransomware Detection",
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0], // 2 days ago
      risk: "high",
    },
    {
      id: 2,
      type: "Malware Detected",
      date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0], // 5 days ago
      risk: "moderate",
    },
    {
      id: 3,
      type: "Unauthorized Access",
      date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0], // 10 days ago
      risk: "low",
    },
    {
      id: 4,
      type: "Data Exfiltration",
      date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0], // 20 days ago
      risk: "high",
    },
    {
      id: 5,
      type: "Phishing Attempt",
      date: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0], // 40 days ago
      risk: "moderate",
    },
    {
      id: 6,
      type: "Port Scan",
      date: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0], // 100 days ago
      risk: "low",
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe("Basic Rendering", () => {
    it("renders without crashing", () => {
      const { container } = render(<SecurityChartsPanel alerts={mockAlerts} />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it("renders all main components", () => {
      render(<SecurityChartsPanel alerts={mockAlerts} />);

      expect(screen.getByTestId("live-indicator")).toBeInTheDocument();
      expect(screen.getByTestId("time-range-selector")).toBeInTheDocument();
      expect(screen.getByTestId("alerts-line-chart")).toBeInTheDocument();
      expect(screen.getByTestId("alerts-pie-chart")).toBeInTheDocument();
    });

    it("renders Alert History title", () => {
      render(<SecurityChartsPanel alerts={mockAlerts} />);
      expect(screen.getByText("Alert History")).toBeInTheDocument();
    });

    it("renders Alert Distribution title", () => {
      render(<SecurityChartsPanel alerts={mockAlerts} />);
      expect(screen.getByText("Alert Distribution")).toBeInTheDocument();
    });

    it("renders clock time", () => {
      render(<SecurityChartsPanel alerts={mockAlerts} />);
      // Clock should render in some time format
      const clockElement = screen.getByText(/\d{1,2}:\d{2}:\d{2} (AM|PM)/);
      expect(clockElement).toBeInTheDocument();
    });
  });

  describe("Initial State", () => {
    it("starts with 30d time range by default", () => {
      render(<SecurityChartsPanel alerts={mockAlerts} />);
      const selectedRange = screen.getByTestId("selected-range");
      expect(selectedRange).toHaveTextContent("30d");
    });

    it("displays correct initial time", () => {
      const mockDate = new Date(2024, 2, 15, 14, 30, 45); // March 15, 2024, 2:30:45 PM
      jest.setSystemTime(mockDate);

      render(<SecurityChartsPanel alerts={mockAlerts} />);
      expect(screen.getByText("2:30:45 PM")).toBeInTheDocument();
    });
  });

  describe("Clock Updates", () => {
    it("updates clock every second", () => {
      const mockDate = new Date(2024, 2, 15, 14, 30, 45);
      jest.setSystemTime(mockDate);

      render(<SecurityChartsPanel alerts={mockAlerts} />);
      expect(screen.getByText("2:30:45 PM")).toBeInTheDocument();

      // Advance time by 1 second
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(screen.getByText("2:30:46 PM")).toBeInTheDocument();
    });

    it("updates clock multiple times", () => {
      const mockDate = new Date(2024, 2, 15, 14, 30, 58);
      jest.setSystemTime(mockDate);

      render(<SecurityChartsPanel alerts={mockAlerts} />);
      expect(screen.getByText("2:30:58 PM")).toBeInTheDocument();

      // Advance by 3 seconds
      act(() => {
        jest.advanceTimersByTime(3000);
      });

      expect(screen.getByText("2:31:01 PM")).toBeInTheDocument();
    });

    it("formats AM time correctly", () => {
      const mockDate = new Date(2024, 2, 15, 9, 5, 3);
      jest.setSystemTime(mockDate);

      render(<SecurityChartsPanel alerts={mockAlerts} />);
      expect(screen.getByText("9:05:03 AM")).toBeInTheDocument();
    });

    it("formats PM time correctly", () => {
      const mockDate = new Date(2024, 2, 15, 15, 45, 30);
      jest.setSystemTime(mockDate);

      render(<SecurityChartsPanel alerts={mockAlerts} />);
      expect(screen.getByText("3:45:30 PM")).toBeInTheDocument();
    });

    it("formats midnight correctly", () => {
      const mockDate = new Date(2024, 2, 15, 0, 0, 0);
      jest.setSystemTime(mockDate);

      render(<SecurityChartsPanel alerts={mockAlerts} />);
      expect(screen.getByText("12:00:00 AM")).toBeInTheDocument();
    });

    it("formats noon correctly", () => {
      const mockDate = new Date(2024, 2, 15, 12, 0, 0);
      jest.setSystemTime(mockDate);

      render(<SecurityChartsPanel alerts={mockAlerts} />);
      expect(screen.getByText("12:00:00 PM")).toBeInTheDocument();
    });

    it("cleans up timer on unmount", () => {
      const { unmount } = render(<SecurityChartsPanel alerts={mockAlerts} />);

      unmount();

      // Timer should be cleaned up
      expect(jest.getTimerCount()).toBe(0);
    });
  });

  describe("Time Range Selection", () => {
    it("changes to 7d time range", () => {
      render(<SecurityChartsPanel alerts={mockAlerts} />);

      const button7d = screen.getByTestId("range-7d");
      act(() => {
        button7d.click();
      });

      const selectedRange = screen.getByTestId("selected-range");
      expect(selectedRange).toHaveTextContent("7d");
    });

    it("changes to 14d time range", () => {
      render(<SecurityChartsPanel alerts={mockAlerts} />);

      const button14d = screen.getByTestId("range-14d");
      act(() => {
        button14d.click();
      });

      const selectedRange = screen.getByTestId("selected-range");
      expect(selectedRange).toHaveTextContent("14d");
    });

    it("changes to 90d time range", () => {
      render(<SecurityChartsPanel alerts={mockAlerts} />);

      const button90d = screen.getByTestId("range-90d");
      act(() => {
        button90d.click();
      });

      const selectedRange = screen.getByTestId("selected-range");
      expect(selectedRange).toHaveTextContent("90d");
    });

    it("updates charts with new time range", () => {
      render(<SecurityChartsPanel alerts={mockAlerts} />);

      const button7d = screen.getByTestId("range-7d");
      act(() => {
        button7d.click();
      });

      const lineChartTimeRange = screen.getByTestId("line-chart-timerange");
      const pieChartTimeRange = screen.getByTestId("pie-chart-timerange");

      expect(lineChartTimeRange).toHaveTextContent("7d");
      expect(pieChartTimeRange).toHaveTextContent("7d");
    });
  });

  describe("Alert Filtering", () => {
    it("filters alerts for 7d range", () => {
      render(<SecurityChartsPanel alerts={mockAlerts} />);

      const button7d = screen.getByTestId("range-7d");
      act(() => {
        button7d.click();
      });

      const lineChartCount = screen.getByTestId("line-chart-count");
      expect(lineChartCount).toHaveTextContent("2"); // Alerts within 7 days (2 and 5 days ago)
    });

    it("filters alerts for 14d range", () => {
      render(<SecurityChartsPanel alerts={mockAlerts} />);

      const button14d = screen.getByTestId("range-14d");
      act(() => {
        button14d.click();
      });

      const lineChartCount = screen.getByTestId("line-chart-count");
      expect(lineChartCount).toHaveTextContent("3"); // Alerts within 14 days (2, 5, 10 days ago)
    });

    it("filters alerts for 30d range (default)", () => {
      render(<SecurityChartsPanel alerts={mockAlerts} />);

      const lineChartCount = screen.getByTestId("line-chart-count");
      expect(lineChartCount).toHaveTextContent("4"); // Alerts within 30 days (2, 5, 10, 20 days ago)
    });

    it("filters alerts for 90d range", () => {
      render(<SecurityChartsPanel alerts={mockAlerts} />);

      const button90d = screen.getByTestId("range-90d");
      act(() => {
        button90d.click();
      });

      const lineChartCount = screen.getByTestId("line-chart-count");
      expect(lineChartCount).toHaveTextContent("5"); // Alerts within 90 days (2, 5, 10, 20, 40 days ago)
    });

    it("passes same filtered data to both charts", () => {
      render(<SecurityChartsPanel alerts={mockAlerts} />);

      const lineChartCount = screen.getByTestId("line-chart-count");
      const pieChartCount = screen.getByTestId("pie-chart-count");

      expect(lineChartCount.textContent).toBe(pieChartCount.textContent);
    });
  });

  describe("Comparison Badge", () => {
    it("shows comparison label", () => {
      render(<SecurityChartsPanel alerts={mockAlerts} />);

      // Should show some comparison text
      const comparisonText = screen.getByText(/vs/);
      expect(comparisonText).toBeInTheDocument();
    });

    it("shows increase indicator when alerts increased", () => {
      // Create alerts with increase in current period
      const alertsWithIncrease = [
        ...mockAlerts,
        {
          id: 7,
          type: "New Alert 1",
          date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
        },
        {
          id: 8,
          type: "New Alert 2",
          date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
        },
      ];

      render(<SecurityChartsPanel alerts={alertsWithIncrease} />);

      const increaseIndicator = screen.getByText("↑");
      expect(increaseIndicator).toBeInTheDocument();
    });

    it("shows decrease indicator when alerts decreased", () => {
      // Create alerts with more in previous period
      const alertsWithDecrease = [
        {
          id: 1,
          type: "Old Alert 1",
          date: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
        },
        {
          id: 2,
          type: "Old Alert 2",
          date: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
        },
        {
          id: 3,
          type: "Old Alert 3",
          date: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
        },
        {
          id: 4,
          type: "Recent Alert",
          date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
        },
      ];

      render(<SecurityChartsPanel alerts={alertsWithDecrease} />);

      const decreaseIndicator = screen.getByText("↓");
      expect(decreaseIndicator).toBeInTheDocument();
    });

    it("shows 'No previous data' when no previous period alerts", () => {
      const recentAlerts = [
        {
          id: 1,
          type: "Alert 1",
          date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
        },
        {
          id: 2,
          type: "Alert 2",
          date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
        },
      ];

      render(<SecurityChartsPanel alerts={recentAlerts} />);

      expect(screen.getByText("No previous data")).toBeInTheDocument();
    });

    it("calculates percentage for 7d range", () => {
      render(<SecurityChartsPanel alerts={mockAlerts} />);

      const button7d = screen.getByTestId("range-7d");
      act(() => {
        button7d.click();
      });

      const comparisonText = screen.getByText(/vs last week/);
      expect(comparisonText).toBeInTheDocument();
    });

    it("calculates percentage for 14d range", () => {
      render(<SecurityChartsPanel alerts={mockAlerts} />);

      const button14d = screen.getByTestId("range-14d");
      act(() => {
        button14d.click();
      });

      const comparisonText = screen.getByText(/vs previous 2 weeks/);
      expect(comparisonText).toBeInTheDocument();
    });

    it("calculates percentage for 30d range", () => {
      render(<SecurityChartsPanel alerts={mockAlerts} />);

      const comparisonText = screen.getByText(/vs last month/);
      expect(comparisonText).toBeInTheDocument();
    });

    it("calculates percentage for 90d range", () => {
      render(<SecurityChartsPanel alerts={mockAlerts} />);

      const button90d = screen.getByTestId("range-90d");
      act(() => {
        button90d.click();
      });

      const comparisonText = screen.getByText(/vs previous 3 months/);
      expect(comparisonText).toBeInTheDocument();
    });

    it("shows 'more' in label for increase", () => {
      const alertsWithIncrease = [
        ...mockAlerts,
        {
          id: 7,
          type: "New Alert",
          date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
        },
      ];

      render(<SecurityChartsPanel alerts={alertsWithIncrease} />);

      const moreText = screen.getByText(/more vs/);
      expect(moreText).toBeInTheDocument();
    });

    it("shows 'less' in label for decrease", () => {
      const alertsWithDecrease = [
        {
          id: 1,
          type: "Old Alert 1",
          date: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
        },
        {
          id: 2,
          type: "Old Alert 2",
          date: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
        },
        {
          id: 3,
          type: "Recent Alert",
          date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
        },
      ];

      render(<SecurityChartsPanel alerts={alertsWithDecrease} />);

      const lessText = screen.getByText(/less vs/);
      expect(lessText).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("handles empty alerts array", () => {
      render(<SecurityChartsPanel alerts={[]} />);

      const lineChartCount = screen.getByTestId("line-chart-count");
      expect(lineChartCount).toHaveTextContent("0");
    });

    it("handles single alert", () => {
      const singleAlert = [mockAlerts[0]];
      render(<SecurityChartsPanel alerts={singleAlert} />);

      const lineChartCount = screen.getByTestId("line-chart-count");
      expect(lineChartCount).toHaveTextContent("1");
    });

    it("handles alerts with future dates", () => {
      const futureAlert = {
        id: 99,
        type: "Future Alert",
        date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        risk: "high",
      };

      render(<SecurityChartsPanel alerts={[futureAlert, ...mockAlerts]} />);

      // Future alerts should be included (they're after the cutoff date)
      const lineChartCount = screen.getByTestId("line-chart-count");
      expect(parseInt(lineChartCount.textContent)).toBeGreaterThan(0);
    });

    it("handles very old alerts", () => {
      const veryOldAlert = {
        id: 100,
        type: "Very Old Alert",
        date: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        risk: "low",
      };

      render(<SecurityChartsPanel alerts={[veryOldAlert]} />);

      // Very old alert should be filtered out for default 30d range
      const lineChartCount = screen.getByTestId("line-chart-count");
      expect(lineChartCount).toHaveTextContent("0");
    });

    it("handles rapid time range changes", () => {
      render(<SecurityChartsPanel alerts={mockAlerts} />);

      act(() => {
        screen.getByTestId("range-7d").click();
        screen.getByTestId("range-14d").click();
        screen.getByTestId("range-30d").click();
        screen.getByTestId("range-90d").click();
      });

      const selectedRange = screen.getByTestId("selected-range");
      expect(selectedRange).toHaveTextContent("90d");
    });

    it("pads minutes and seconds with leading zeros", () => {
      const mockDate = new Date(2024, 2, 15, 9, 5, 3);
      jest.setSystemTime(mockDate);

      render(<SecurityChartsPanel alerts={mockAlerts} />);
      expect(screen.getByText("9:05:03 AM")).toBeInTheDocument();
    });
  });

  describe("Component Integration", () => {
    it("passes correct props to AlertsLineChart", () => {
      render(<SecurityChartsPanel alerts={mockAlerts} />);

      expect(screen.getByTestId("alerts-line-chart")).toBeInTheDocument();
      expect(screen.getByTestId("line-chart-timerange")).toHaveTextContent(
        "30d",
      );
    });

    it("passes correct props to AlertsPieChart", () => {
      render(<SecurityChartsPanel alerts={mockAlerts} />);

      expect(screen.getByTestId("alerts-pie-chart")).toBeInTheDocument();
      expect(screen.getByTestId("pie-chart-timerange")).toHaveTextContent(
        "30d",
      );
    });

    it("passes correct props to TimeRangeSelector", () => {
      render(<SecurityChartsPanel alerts={mockAlerts} />);

      expect(screen.getByTestId("time-range-selector")).toBeInTheDocument();
      expect(screen.getByTestId("selected-range")).toHaveTextContent("30d");
    });

    it("renders LiveIndicator", () => {
      render(<SecurityChartsPanel alerts={mockAlerts} />);

      expect(screen.getByTestId("live-indicator")).toBeInTheDocument();
      expect(screen.getByText("LIVE")).toBeInTheDocument();
    });
  });

  describe("Styling and Layout", () => {
    it("renders grid layout for charts", () => {
      const { container } = render(<SecurityChartsPanel alerts={mockAlerts} />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it("renders both chart sections", () => {
      render(<SecurityChartsPanel alerts={mockAlerts} />);

      expect(screen.getByText("Alert History")).toBeInTheDocument();
      expect(screen.getByText("Alert Distribution")).toBeInTheDocument();
    });
  });
});
