/**
 * SecurityDashboardPage.test.jsx
 *
 * Comprehensive test suite for SecurityDashboardPage component.
 * Tests rendering, component integration, and layout.
 * Designed to achieve 80%+ code coverage for SonarQube analysis.
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import SecurityDashboardPage from "../SecurityDashboardPage";

// Mock child components
jest.mock("../../components/security/SecurityChartsPanel", () => {
  return function SecurityChartsPanel({ alerts }) {
    return (
      <div data-testid="security-charts-panel">
        <span data-testid="charts-alerts-count">{alerts.length}</span>
      </div>
    );
  };
});

jest.mock("../../components/security/SecurityAlertsPanel", () => {
  return function SecurityAlertsPanel() {
    return <div data-testid="security-alerts-panel">Alerts Panel</div>;
  };
});

// Mock the mock data
jest.mock("../../data/mockData.js", () => ({
  MOCK_SECURITY_ALERTS: [
    {
      id: 1,
      type: "Ransomware Detection",
      date: "2024-03-07",
      risk: "high",
      status: "active",
    },
    {
      id: 2,
      type: "Malware Detected",
      date: "2024-03-06",
      risk: "moderate",
      status: "active",
    },
    {
      id: 3,
      type: "Unauthorized Access",
      date: "2024-03-05",
      risk: "low",
      status: "resolved",
    },
  ],
}));

describe("SecurityDashboardPage Component", () => {
  describe("Basic Rendering", () => {
    it("renders without crashing", () => {
      const { container } = render(<SecurityDashboardPage />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it("renders SecurityChartsPanel component", () => {
      render(<SecurityDashboardPage />);
      expect(screen.getByTestId("security-charts-panel")).toBeInTheDocument();
    });

    it("renders SecurityAlertsPanel component", () => {
      render(<SecurityDashboardPage />);
      expect(screen.getByTestId("security-alerts-panel")).toBeInTheDocument();
    });

    it("renders both panels together", () => {
      render(<SecurityDashboardPage />);
      expect(screen.getByTestId("security-charts-panel")).toBeInTheDocument();
      expect(screen.getByTestId("security-alerts-panel")).toBeInTheDocument();
    });
  });

  describe("Component Integration", () => {
    it("passes MOCK_SECURITY_ALERTS to SecurityChartsPanel", () => {
      render(<SecurityDashboardPage />);
      const alertsCount = screen.getByTestId("charts-alerts-count");
      expect(alertsCount).toHaveTextContent("3"); // 3 mock alerts
    });

    it("SecurityAlertsPanel renders correctly", () => {
      render(<SecurityDashboardPage />);
      expect(screen.getByText("Alerts Panel")).toBeInTheDocument();
    });

    it("renders components in correct order", () => {
      const { container } = render(<SecurityDashboardPage />);
      const children = container.firstChild.children;

      expect(children[0]).toHaveAttribute(
        "data-testid",
        "security-charts-panel",
      );
      expect(children[1]).toHaveAttribute(
        "data-testid",
        "security-alerts-panel",
      );
    });
  });

  describe("Layout and Styling", () => {
    it("applies container styles", () => {
      const { container } = render(<SecurityDashboardPage />);
      const mainContainer = container.firstChild;

      expect(mainContainer).toHaveStyle({
        display: "flex",
        flexDirection: "column",
      });
    });

    it("has correct gap styling", () => {
      const { container } = render(<SecurityDashboardPage />);
      const mainContainer = container.firstChild;

      expect(mainContainer).toHaveStyle({
        gap: "0px",
      });
    });

    it("has correct width styling", () => {
      const { container } = render(<SecurityDashboardPage />);
      const mainContainer = container.firstChild;

      expect(mainContainer).toHaveStyle({
        minWidth: "1150px",
        width: "100%",
      });
    });

    it("renders as a div element", () => {
      const { container } = render(<SecurityDashboardPage />);
      expect(container.firstChild.tagName).toBe("DIV");
    });
  });

  describe("Edge Cases", () => {
    it("renders correctly when mounted multiple times", () => {
      const { unmount } = render(<SecurityDashboardPage />);
      unmount();

      render(<SecurityDashboardPage />);
      expect(screen.getByTestId("security-charts-panel")).toBeInTheDocument();
      expect(screen.getByTestId("security-alerts-panel")).toBeInTheDocument();
    });

    it("maintains structure with no props", () => {
      const { container } = render(<SecurityDashboardPage />);
      expect(container.firstChild.children).toHaveLength(2);
    });
  });

  describe("Component Structure", () => {
    it("has a single root container", () => {
      const { container } = render(<SecurityDashboardPage />);
      expect(container.children).toHaveLength(1);
    });

    it("root container has exactly two children", () => {
      const { container } = render(<SecurityDashboardPage />);
      expect(container.firstChild.children).toHaveLength(2);
    });

    it("SecurityChartsPanel is the first child", () => {
      const { container } = render(<SecurityDashboardPage />);
      const firstChild = container.firstChild.children[0];
      expect(firstChild).toHaveAttribute(
        "data-testid",
        "security-charts-panel",
      );
    });

    it("SecurityAlertsPanel is the second child", () => {
      const { container } = render(<SecurityDashboardPage />);
      const secondChild = container.firstChild.children[1];
      expect(secondChild).toHaveAttribute(
        "data-testid",
        "security-alerts-panel",
      );
    });
  });

  describe("Data Flow", () => {
    it("passes mock alerts data correctly", () => {
      render(<SecurityDashboardPage />);
      const alertsCount = screen.getByTestId("charts-alerts-count");
      expect(parseInt(alertsCount.textContent)).toBe(3);
    });

    it("SecurityChartsPanel receives alerts prop", () => {
      render(<SecurityDashboardPage />);
      expect(screen.getByTestId("charts-alerts-count")).toBeInTheDocument();
    });
  });

  describe("Snapshot Consistency", () => {
    it("maintains consistent structure across renders", () => {
      const { container: container1 } = render(<SecurityDashboardPage />);
      const { container: container2 } = render(<SecurityDashboardPage />);

      expect(container1.firstChild.children.length).toBe(
        container2.firstChild.children.length,
      );
    });

    it("renders the same components on re-render", () => {
      const { rerender } = render(<SecurityDashboardPage />);

      expect(screen.getByTestId("security-charts-panel")).toBeInTheDocument();
      expect(screen.getByTestId("security-alerts-panel")).toBeInTheDocument();

      rerender(<SecurityDashboardPage />);

      expect(screen.getByTestId("security-charts-panel")).toBeInTheDocument();
      expect(screen.getByTestId("security-alerts-panel")).toBeInTheDocument();
    });
  });
});
