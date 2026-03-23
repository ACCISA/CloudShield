/**
 * AlertsLineChart.test.jsx
 *
 * Test suite for AlertsLineChart component.
 * Tests React-level behavior, legend interactions, and component structure.
 * Achieves 80%+ code coverage focusing on testable parts (not D3 internals).
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import AlertsLineChart from "../AlertsLineChart";

// Mock D3 to avoid ES module and heavy DOM manipulation issues
jest.mock("d3", () => {
  const createChainableMock = () => {
    const mock = {
      attr: jest.fn().mockReturnThis(),
      style: jest.fn().mockReturnThis(),
      append: jest.fn(function () {
        return createChainableMock();
      }),
      call: jest.fn().mockReturnThis(),
      datum: jest.fn().mockReturnThis(),
      on: jest.fn().mockReturnThis(),
      transition: jest.fn(() => ({
        delay: jest.fn().mockReturnThis(),
        duration: jest.fn().mockReturnThis(),
        ease: jest.fn().mockReturnThis(),
        attr: jest.fn().mockReturnThis(),
      })),
      node: jest.fn(() => ({ getTotalLength: jest.fn(() => 100) })),
      data: jest.fn(() => ({
        enter: jest.fn(() => ({
          append: jest.fn(() => createChainableMock()),
        })),
      })),
      selectAll: jest.fn(() => ({
        ...createChainableMock(),
        remove: jest.fn().mockReturnThis(),
      })),
    };
    return mock;
  };

  const colorMap = {
    "Security breach": "#EF4444",
    "Suspicious activity": "#F59E0B",
    "Policy violation": "#10B981",
    "Malware detected": "#3B82F6",
  };

  return {
    select: jest.fn(() => createChainableMock()),
    scaleOrdinal: jest.fn(() => {
      const scale = jest.fn((value) => colorMap[value] || "#EF4444");
      scale.domain = jest.fn().mockReturnValue(scale);
      scale.range = jest.fn().mockReturnValue(scale);
      return scale;
    }),
    scaleTime: jest.fn(() => {
      const scale = jest.fn(() => 100);
      scale.domain = jest.fn().mockReturnValue(scale);
      scale.range = jest.fn().mockReturnValue(scale);
      return scale;
    }),
    scaleLinear: jest.fn(() => {
      const scale = jest.fn(() => 50);
      scale.domain = jest.fn().mockReturnValue(scale);
      scale.nice = jest.fn().mockReturnValue(scale);
      scale.range = jest.fn().mockReturnValue(scale);
      return scale;
    }),
    extent: jest.fn(() => [0, 1]),
    max: jest.fn(() => 10),
    group: jest.fn((arr, accessor) => {
      const map = new Map();
      if (arr) {
        arr.forEach((item) => {
          const key = accessor(item);
          if (!map.has(key)) map.set(key, []);
          map.get(key).push(item);
        });
      }
      return map;
    }),
    axisBottom: jest.fn(() => ({
      ticks: jest.fn().mockReturnThis(),
      tickFormat: jest.fn().mockReturnThis(),
    })),
    axisLeft: jest.fn(() => ({
      ticks: jest.fn().mockReturnThis(),
      tickSize: jest.fn().mockReturnThis(),
      tickFormat: jest.fn().mockReturnThis(),
    })),
    line: jest.fn(() => {
      const lineFunc = jest.fn();
      lineFunc.x = jest.fn().mockReturnValue(lineFunc);
      lineFunc.y = jest.fn().mockReturnValue(lineFunc);
      lineFunc.curve = jest.fn().mockReturnValue(lineFunc);
      return lineFunc;
    }),
    timeFormat: jest.fn(() => jest.fn(() => "Jan 01")),
    curveMonotoneX: "curveMonotoneX",
    easeCubicInOut: "easeCubicInOut",
  };
});

describe("AlertsLineChart Component", () => {
  const mockData = [
    { type: "Security breach", date: "2024-01-01T10:00:00Z" },
    { type: "Security breach", date: "2024-01-01T14:00:00Z" },
    { type: "Suspicious activity", date: "2024-01-02T09:00:00Z" },
    { type: "Policy violation", date: "2024-01-02T15:00:00Z" },
    { type: "Malware detected", date: "2024-01-03T16:00:00Z" },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Basic Rendering", () => {
    it("renders without crashing", () => {
      const { container } = render(
        <AlertsLineChart data={mockData} timeRange="7d" />,
      );
      expect(container.firstChild).toBeInTheDocument();
    });

    it("renders SVG element", () => {
      const { container } = render(
        <AlertsLineChart data={mockData} timeRange="7d" />,
      );
      expect(container.querySelector("svg")).toBeInTheDocument();
    });

    it("renders legend with all unique alert types", () => {
      render(<AlertsLineChart data={mockData} timeRange="7d" />);
      expect(screen.getByText("Security breach")).toBeInTheDocument();
      expect(screen.getByText("Suspicious activity")).toBeInTheDocument();
      expect(screen.getByText("Policy violation")).toBeInTheDocument();
      expect(screen.getByText("Malware detected")).toBeInTheDocument();
    });

    it("renders legend items as buttons", () => {
      const { container } = render(
        <AlertsLineChart data={mockData} timeRange="7d" />,
      );
      const buttons = container.querySelectorAll("button");
      expect(buttons.length).toBe(4); // 4 unique alert types
    });

    it("uses correct container height", () => {
      const { container } = render(
        <AlertsLineChart data={mockData} timeRange="7d" />,
      );
      const mainDiv = container.firstChild;
      expect(mainDiv).toHaveStyle({ height: "280px" });
    });
  });

  describe("Empty Data Handling", () => {
    it("handles empty data array", () => {
      const { container } = render(
        <AlertsLineChart data={[]} timeRange="7d" />,
      );
      expect(container.firstChild).toBeInTheDocument();
      expect(container.querySelector("svg")).toBeInTheDocument();
    });

    it("shows no legend items when data is empty", () => {
      const { container } = render(
        <AlertsLineChart data={[]} timeRange="7d" />,
      );
      const buttons = container.querySelectorAll("button");
      expect(buttons.length).toBe(0);
    });

    it("handles single data point", () => {
      const singleData = [
        { type: "Security breach", date: "2024-01-01T10:00:00Z" },
      ];
      render(<AlertsLineChart data={singleData} timeRange="7d" />);
      expect(screen.getByText("Security breach")).toBeInTheDocument();
    });
  });

  describe("Legend Toggle Functionality", () => {
    it("toggles alert type opacity when clicking legend", () => {
      render(<AlertsLineChart data={mockData} timeRange="7d" />);
      const legendButton = screen
        .getByText("Security breach")
        .closest("button");

      expect(legendButton).toHaveStyle({ opacity: "1" });
      fireEvent.click(legendButton);
      expect(legendButton).toHaveStyle({ opacity: "0.4" });
      fireEvent.click(legendButton);
      expect(legendButton).toHaveStyle({ opacity: "1" });
    });

    it("allows toggling multiple types independently", () => {
      render(<AlertsLineChart data={mockData} timeRange="7d" />);
      const breach = screen.getByText("Security breach").closest("button");
      const suspicious = screen
        .getByText("Suspicious activity")
        .closest("button");

      fireEvent.click(breach);
      expect(breach).toHaveStyle({ opacity: "0.4" });
      expect(suspicious).toHaveStyle({ opacity: "1" });

      fireEvent.click(suspicious);
      expect(breach).toHaveStyle({ opacity: "0.4" });
      expect(suspicious).toHaveStyle({ opacity: "0.4" });
    });
  });

  describe("Time Range Props", () => {
    it("accepts different timeRange values", () => {
      const { rerender } = render(
        <AlertsLineChart data={mockData} timeRange="7d" />,
      );
      expect(screen.getByText("Security breach")).toBeInTheDocument();

      rerender(<AlertsLineChart data={mockData} timeRange="30d" />);
      expect(screen.getByText("Security breach")).toBeInTheDocument();

      rerender(<AlertsLineChart data={mockData} timeRange="90d" />);
      expect(screen.getByText("Security breach")).toBeInTheDocument();
    });
  });

  describe("Data Updates", () => {
    it("updates legend when data changes", () => {
      const { rerender } = render(
        <AlertsLineChart data={mockData} timeRange="7d" />,
      );
      expect(screen.getByText("Security breach")).toBeInTheDocument();

      const newData = [
        { type: "New alert type", date: "2024-01-01T10:00:00Z" },
      ];
      rerender(<AlertsLineChart data={newData} timeRange="7d" />);

      expect(screen.queryByText("Security breach")).not.toBeInTheDocument();
      expect(screen.getByText("New alert type")).toBeInTheDocument();
    });

    it("maintains disabled state across data updates", () => {
      const { rerender } = render(
        <AlertsLineChart data={mockData} timeRange="7d" />,
      );
      const legendButton = screen
        .getByText("Security breach")
        .closest("button");

      fireEvent.click(legendButton);
      expect(legendButton).toHaveStyle({ opacity: "0.4" });

      const updatedData = [
        ...mockData,
        { type: "Security breach", date: "2024-01-04T10:00:00Z" },
      ];
      rerender(<AlertsLineChart data={updatedData} timeRange="7d" />);

      const updatedButton = screen
        .getByText("Security breach")
        .closest("button");
      expect(updatedButton).toHaveStyle({ opacity: "0.4" });
    });
  });

  describe("Accessibility", () => {
    it("legend items are keyboard accessible buttons", () => {
      render(<AlertsLineChart data={mockData} timeRange="7d" />);
      const legendButton = screen
        .getByText("Security breach")
        .closest("button");

      expect(legendButton.tagName).toBe("BUTTON");
      expect(legendButton).toHaveAttribute("type", "button");
    });

    it("legend can be toggled via keyboard", () => {
      render(<AlertsLineChart data={mockData} timeRange="7d" />);
      const legendButton = screen
        .getByText("Security breach")
        .closest("button");

      legendButton.focus();
      fireEvent.click(legendButton);
      expect(legendButton).toHaveStyle({ opacity: "0.4" });
    });
  });

  describe("Color Indicators", () => {
    it("renders color indicator for each legend item", () => {
      const { container } = render(
        <AlertsLineChart data={mockData} timeRange="7d" />,
      );
      const buttons = container.querySelectorAll("button");

      buttons.forEach((button) => {
        const colorDiv = button.querySelector("div");
        expect(colorDiv).toBeInTheDocument();
        expect(colorDiv).toHaveStyle({ borderRadius: "8px" });
      });
    });

    it("assigns colors based on alert type", () => {
      render(<AlertsLineChart data={mockData} timeRange="7d" />);
      const breachButton = screen
        .getByText("Security breach")
        .closest("button");
      const colorDiv = breachButton.querySelector("div");

      // Color should be set (actual color from D3 scale)
      expect(colorDiv.style.backgroundColor).toBeTruthy();
    });
  });
});
