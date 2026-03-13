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

const mockPageShell = jest.fn(({ children }) => (
  <div data-testid="page-shell">{children}</div>
));

jest.mock("../../components/layout/PageShell.jsx", () => ({
  __esModule: true,
  default: (props) => mockPageShell(props),
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
  return function SecurityAlertsPanel() {
    return <div data-testid="security-alerts-panel">Alerts Panel</div>;
  };
});

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
  beforeEach(() => {
    mockPageShell.mockClear();
  });

  describe("Basic Rendering", () => {
    it("renders without crashing", () => {
      const { container } = render(<SecurityDashboardPage />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it("renders inside PageShell", () => {
      render(<SecurityDashboardPage />);
      expect(screen.getByTestId("page-shell")).toBeInTheDocument();
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

  describe("PageShell Integration", () => {
    it("uses PageShell without title, subtitle, or actions", () => {
      render(<SecurityDashboardPage />);

      expect(mockPageShell).toHaveBeenCalled();

      const props = mockPageShell.mock.calls[0][0];
      expect(props.title).toBeUndefined();
      expect(props.subtitle).toBeUndefined();
      expect(props.actions).toBeUndefined();
    });
  });

  describe("Component Integration", () => {
    it("passes MOCK_SECURITY_ALERTS to SecurityChartsPanel", () => {
      render(<SecurityDashboardPage />);
      const alertsCount = screen.getByTestId("charts-alerts-count");
      expect(alertsCount).toHaveTextContent("3");
    });

    it("SecurityAlertsPanel renders correctly", () => {
      render(<SecurityDashboardPage />);
      expect(screen.getByText("Alerts Panel")).toBeInTheDocument();
    });

    it("renders components in correct order", () => {
      render(<SecurityDashboardPage />);
      const content = screen.getByTestId("security-dashboard-content");
      const children = content.children;

      expect(children[0]).toHaveAttribute("data-testid", "security-charts-panel");
      expect(children[1]).toHaveAttribute("data-testid", "security-alerts-panel");
    });
  });

  describe("Layout and Styling", () => {
    it("applies content container styles", () => {
      render(<SecurityDashboardPage />);
      const content = screen.getByTestId("security-dashboard-content");

      expect(content).toHaveStyle({
        display: "flex",
        flexDirection: "column",
      });
    });

    it("has correct gap styling", () => {
      render(<SecurityDashboardPage />);
      const content = screen.getByTestId("security-dashboard-content");

      expect(content).toHaveStyle({
        gap: "0",
      });
    });

    it("has correct width styling", () => {
      render(<SecurityDashboardPage />);
      const content = screen.getByTestId("security-dashboard-content");

      expect(content).toHaveStyle({
        minWidth: "1150px",
        width: "100%",
      });
    });

    it("dashboard content renders as a div element", () => {
      render(<SecurityDashboardPage />);
      const content = screen.getByTestId("security-dashboard-content");
      expect(content.tagName).toBe("DIV");
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
      render(<SecurityDashboardPage />);
      const content = screen.getByTestId("security-dashboard-content");
      expect(content.children).toHaveLength(2);
    });
  });

  describe("Component Structure", () => {
    it("has a single root container", () => {
      const { container } = render(<SecurityDashboardPage />);
      expect(container.children).toHaveLength(1);
    });

    it("dashboard content has exactly two children", () => {
      render(<SecurityDashboardPage />);
      const content = screen.getByTestId("security-dashboard-content");
      expect(content.children).toHaveLength(2);
    });

    it("SecurityChartsPanel is the first child", () => {
      render(<SecurityDashboardPage />);
      const content = screen.getByTestId("security-dashboard-content");
      const firstChild = content.children[0];

      expect(firstChild).toHaveAttribute("data-testid", "security-charts-panel");
    });

    it("SecurityAlertsPanel is the second child", () => {
      render(<SecurityDashboardPage />);
      const content = screen.getByTestId("security-dashboard-content");
      const secondChild = content.children[1];

      expect(secondChild).toHaveAttribute("data-testid", "security-alerts-panel");
    });
  });

  describe("Data Flow", () => {
    it("passes mock alerts data correctly", () => {
      render(<SecurityDashboardPage />);
      const alertsCount = screen.getByTestId("charts-alerts-count");
      expect(parseInt(alertsCount.textContent, 10)).toBe(3);
    });

    it("SecurityChartsPanel receives alerts prop", () => {
      render(<SecurityDashboardPage />);
      expect(screen.getByTestId("charts-alerts-count")).toBeInTheDocument();
    });
  });

  describe("Render Consistency", () => {
    it("maintains consistent structure across renders", () => {
      const { unmount } = render(<SecurityDashboardPage />);
      const firstContent = screen.getByTestId("security-dashboard-content");
      expect(firstContent.children.length).toBe(2);

      unmount();

      render(<SecurityDashboardPage />);
      const secondContent = screen.getByTestId("security-dashboard-content");
      expect(secondContent.children.length).toBe(2);
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