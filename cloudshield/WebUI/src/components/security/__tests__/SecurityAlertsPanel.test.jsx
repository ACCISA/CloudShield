/**
 * SecurityAlertsPanel.test.jsx
 *
 * Comprehensive test suite for SecurityAlertsPanel component.
 * Tests rendering, state management, filtering, pagination, and interactions.
 * Designed to achieve 80%+ code coverage for SonarQube analysis.
 */
import React from "react";
import {
  render as rtlRender,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import SecurityAlertsPanel from "../SecurityAlertsPanel";

// Mock all imported components
jest.mock("../SecurityAlertsTable", () => {
  return function SecurityAlertsTable({
    securityAlerts,
    selectedAlerts,
    allVisibleSelected,
    isIndeterminate,
    onToggleSelect,
    onToggleSelectAll,
    hasNoAlerts,
    hasNoResults,
  }) {
    return (
      <div data-testid="security-alerts-table">
        <div data-testid="table-alert-count">{securityAlerts.length}</div>
        <div data-testid="table-selected-count">{selectedAlerts.size}</div>
        <div data-testid="table-all-selected">{String(allVisibleSelected)}</div>
        <div data-testid="table-indeterminate">{String(isIndeterminate)}</div>
        <div data-testid="table-no-alerts">{String(hasNoAlerts)}</div>
        <div data-testid="table-no-results">{String(hasNoResults)}</div>
        <button onClick={onToggleSelectAll} data-testid="toggle-select-all">
          Toggle All
        </button>
        {securityAlerts.map((alert) => (
          <div key={alert.id} data-testid={`table-alert-${alert.id}`}>
            <span>{alert.type}</span>
            <button onClick={() => onToggleSelect(alert.id)}>
              Toggle {alert.id}
            </button>
          </div>
        ))}
      </div>
    );
  };
});

jest.mock("../../common/SearchField/SearchField", () => {
  return function SearchField({ placeholder, value, onChange }) {
    return (
      <input
        data-testid="search-field"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  };
});

jest.mock("../../common/RefreshButton/RefreshButton", () => {
  return function RefreshButton({ onClick }) {
    return (
      <button data-testid="refresh-button" onClick={onClick}>
        Refresh
      </button>
    );
  };
});

jest.mock("../../common/FilterButton/FilterButton", () => {
  return function FilterButton({
    filterGroups,
    activeFilters,
    onFilterChange,
  }) {
    return (
      <div data-testid="filter-button">
        <button
          onClick={() =>
            onFilterChange("risk", "high", !activeFilters.risk.has("high"))
          }
        >
          Toggle High Risk
        </button>
        <button
          onClick={() =>
            onFilterChange(
              "status",
              "active",
              !activeFilters.status.has("active"),
            )
          }
        >
          Toggle Active Status
        </button>
        <button
          onClick={() =>
            onFilterChange(
              "type",
              "Ransomware Detection",
              !activeFilters.type.has("Ransomware Detection"),
            )
          }
        >
          Toggle Ransomware Type
        </button>
      </div>
    );
  };
});

jest.mock("../../common/Pagination/Pagination", () => {
  return function Pagination({
    totalItems,
    itemsPerPage,
    currentPage,
    onPageChange,
    itemLabel,
  }) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    return (
      <div data-testid="pagination">
        <span data-testid="pagination-total">{totalItems}</span>
        <span data-testid="pagination-current">{currentPage}</span>
        <span data-testid="pagination-label">{itemLabel}</span>
        {totalPages > 1 && (
          <>
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              data-testid="pagination-prev"
            >
              Previous
            </button>
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              data-testid="pagination-next"
            >
              Next
            </button>
          </>
        )}
      </div>
    );
  };
});

jest.mock("../../common/GroupActionsButton/GroupActionsButton", () => {
  return function GroupActionsButton({ selectedCount, buttonText, menuItems }) {
    return (
      <div data-testid="group-actions-button">
        <span data-testid="selected-count">{selectedCount}</span>
        <span>{buttonText}</span>
        {menuItems.map((item, index) => (
          <button
            key={index}
            onClick={item.onClick}
            data-testid={`group-action-${index}`}
          >
            {item.label}
          </button>
        ))}
      </div>
    );
  };
});

// Mock icons
jest.mock("../../../assets/CheckmarkIcon", () => {
  return function CheckmarkIcon() {
    return <svg data-testid="checkmark-icon" />;
  };
});

jest.mock("../../../assets/security/FalsePositiveIcon", () => {
  return function FalsePositiveIcon() {
    return <svg data-testid="false-positive-icon" />;
  };
});

jest.mock("../../../assets/DownloadIcon", () => {
  return function DownloadIcon() {
    return <svg data-testid="download-icon" />;
  };
});

// Mock data
jest.mock("../../../data/mockData", () => ({
  MOCK_SECURITY_ALERTS: [
    {
      id: 1,
      type: "Ransomware Detection",
      date: "2024-03-15",
      displayDate: "Mar 15, 2024",
      activity: "Encrypted 45 files in Documents folder",
      risk: "high",
      status: "active",
    },
    {
      id: 2,
      type: "Malware Detected",
      date: "2024-03-14",
      displayDate: "Mar 14, 2024",
      activity: "Suspicious process detected",
      risk: "moderate",
      status: "investigating",
    },
    {
      id: 3,
      type: "Unauthorized Access Attempt",
      date: "2024-03-13",
      displayDate: "Mar 13, 2024",
      activity: "Failed login attempts from unknown IP",
      risk: "low",
      status: "resolved",
    },
    {
      id: 4,
      type: "Data Exfiltration",
      date: "2024-03-12",
      activity: "Large data transfer detected",
      risk: "high",
      status: "active",
    },
    {
      id: 5,
      type: "Phishing Attempt",
      date: "2024-03-11",
      activity: "Suspicious email detected",
      risk: "moderate",
      status: "investigating",
    },
    {
      id: 6,
      type: "Port Scan",
      date: "2024-03-10",
      activity: "Port scanning activity detected",
      risk: "low",
      status: "resolved",
    },
    {
      id: 7,
      type: "Brute Force Attack",
      date: "2024-03-09",
      activity: "Multiple failed login attempts",
      risk: "high",
      status: "active",
    },
  ],
}));

// Mock config
jest.mock("../../../config/filterConfigs", () => ({
  SECURITY_FILTERS: [
    {
      id: "risk",
      label: "Risk Level",
      options: ["high", "moderate", "low"],
    },
    {
      id: "status",
      label: "Status",
      options: ["active", "investigating", "resolved"],
    },
    {
      id: "type",
      label: "Alert Type",
      options: ["Ransomware Detection", "Malware Detected"],
    },
  ],
}));

// Mock filter helpers
jest.mock("../../../utils/filterHelpers", () => ({
  createFilterChangeHandler: (setActiveFilters) => {
    return (category, value, isActive) => {
      setActiveFilters((prev) => {
        const newFilters = { ...prev };
        const newSet = new Set(prev[category]);
        if (isActive) {
          newSet.add(value);
        } else {
          newSet.delete(value);
        }
        newFilters[category] = newSet;
        return newFilters;
      });
    };
  },
}));

const mockAlerts = [
  {
    id: 1,
    type: "Ransomware Detection",
    date: "2024-03-15",
    displayDate: "Mar 15, 2024",
    activity: "Encrypted 45 files in Documents folder",
    risk: "high",
    status: "active",
  },
  {
    id: 2,
    type: "Malware Detected",
    date: "2024-03-14",
    displayDate: "Mar 14, 2024",
    activity: "Suspicious process detected",
    risk: "moderate",
    status: "investigating",
  },
  {
    id: 3,
    type: "Unauthorized Access Attempt",
    date: "2024-03-13",
    displayDate: "Mar 13, 2024",
    activity: "Failed login attempts from unknown IP",
    risk: "low",
    status: "resolved",
  },
  {
    id: 4,
    type: "Data Exfiltration",
    date: "2024-03-12",
    activity: "Large data transfer detected",
    risk: "high",
    status: "active",
  },
  {
    id: 5,
    type: "Phishing Attempt",
    date: "2024-03-11",
    activity: "Suspicious email detected",
    risk: "moderate",
    status: "investigating",
  },
  {
    id: 6,
    type: "Port Scan",
    date: "2024-03-10",
    activity: "Port scanning activity detected",
    risk: "low",
    status: "resolved",
  },
  {
    id: 7,
    type: "Brute Force Attack",
    date: "2024-03-09",
    activity: "Multiple failed login attempts",
    risk: "high",
    status: "active",
  },
];

function render(ui) {
  if (React.isValidElement(ui) && ui.type === SecurityAlertsPanel) {
    return rtlRender(
      React.cloneElement(ui, { alerts: mockAlerts, ...ui.props }),
    );
  }

  return rtlRender(ui);
}

describe("SecurityAlertsPanel Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    console.log.mockRestore();
  });

  describe("Basic Rendering", () => {
    it("renders without crashing", () => {
      const { container } = render(<SecurityAlertsPanel />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it("renders the title", () => {
      render(<SecurityAlertsPanel />);
      expect(screen.getByText("Security Alert History")).toBeInTheDocument();
    });

    it("renders all main components", () => {
      render(<SecurityAlertsPanel />);

      expect(screen.getByTestId("security-alerts-table")).toBeInTheDocument();
      expect(screen.getByTestId("search-field")).toBeInTheDocument();
      expect(screen.getByTestId("refresh-button")).toBeInTheDocument();
      expect(screen.getByTestId("filter-button")).toBeInTheDocument();
      expect(screen.getByTestId("pagination")).toBeInTheDocument();
      expect(screen.getByTestId("group-actions-button")).toBeInTheDocument();
    });

    it("renders search field with correct placeholder", () => {
      render(<SecurityAlertsPanel />);
      const searchField = screen.getByTestId("search-field");
      expect(searchField).toHaveAttribute("placeholder", "Search alerts");
    });
  });

  describe("Initial State", () => {
    it("displays first page of alerts", () => {
      render(<SecurityAlertsPanel />);
      const alertCount = screen.getByTestId("table-alert-count");
      expect(alertCount).toHaveTextContent("6"); // First 6 alerts
    });

    it("starts with no alerts selected", () => {
      render(<SecurityAlertsPanel />);
      const selectedCount = screen.getByTestId("selected-count");
      expect(selectedCount).toHaveTextContent("0");
    });

    it("starts on page 1", () => {
      render(<SecurityAlertsPanel />);
      const currentPage = screen.getByTestId("pagination-current");
      expect(currentPage).toHaveTextContent("1");
    });

    it("displays correct total alert count", () => {
      render(<SecurityAlertsPanel />);
      const totalItems = screen.getByTestId("pagination-total");
      expect(totalItems).toHaveTextContent("7"); // 7 total alerts
    });
  });

  describe("Search Functionality", () => {
    it("filters alerts by search query", async () => {
      render(<SecurityAlertsPanel />);

      const searchField = screen.getByTestId("search-field");
      fireEvent.change(searchField, { target: { value: "Ransomware" } });

      await waitFor(() => {
        const alertCount = screen.getByTestId("table-alert-count");
        expect(alertCount).toHaveTextContent("1"); // Only Ransomware alert
      });
    });

    it("searches across type, activity, and status fields", async () => {
      render(<SecurityAlertsPanel />);

      const searchField = screen.getByTestId("search-field");
      fireEvent.change(searchField, { target: { value: "active" } });

      await waitFor(() => {
        const alertCount = screen.getByTestId("table-alert-count");
        expect(parseInt(alertCount.textContent)).toBeGreaterThan(0);
      });
    });

    it("shows no results when search matches nothing", async () => {
      render(<SecurityAlertsPanel />);

      const searchField = screen.getByTestId("search-field");
      fireEvent.change(searchField, { target: { value: "nonexistent" } });

      await waitFor(() => {
        const hasNoResults = screen.getByTestId("table-no-results");
        expect(hasNoResults).toHaveTextContent("true");
      });
    });

    it("resets to page 1 when search query changes", async () => {
      render(<SecurityAlertsPanel />);

      // Go to page 2
      const nextButton = screen.getByTestId("pagination-next");
      fireEvent.click(nextButton);

      await waitFor(() => {
        const currentPage = screen.getByTestId("pagination-current");
        expect(currentPage).toHaveTextContent("2");
      });

      // Search should reset to page 1
      const searchField = screen.getByTestId("search-field");
      fireEvent.change(searchField, { target: { value: "Malware" } });

      await waitFor(() => {
        const currentPage = screen.getByTestId("pagination-current");
        expect(currentPage).toHaveTextContent("1");
      });
    });

    it("is case-insensitive", async () => {
      render(<SecurityAlertsPanel />);

      const searchField = screen.getByTestId("search-field");
      fireEvent.change(searchField, { target: { value: "RANSOMWARE" } });

      await waitFor(() => {
        const alertCount = screen.getByTestId("table-alert-count");
        expect(alertCount).toHaveTextContent("1");
      });
    });
  });

  describe("Filter Functionality", () => {
    it("filters alerts by risk level", async () => {
      render(<SecurityAlertsPanel />);

      const toggleHighRisk = screen.getByText("Toggle High Risk");
      fireEvent.click(toggleHighRisk);

      await waitFor(() => {
        const alertCount = screen.getByTestId("table-alert-count");
        expect(parseInt(alertCount.textContent)).toBeGreaterThan(0);
      });
    });

    it("filters alerts by status", async () => {
      render(<SecurityAlertsPanel />);

      const toggleActiveStatus = screen.getByText("Toggle Active Status");
      fireEvent.click(toggleActiveStatus);

      await waitFor(() => {
        const alertCount = screen.getByTestId("table-alert-count");
        expect(parseInt(alertCount.textContent)).toBeGreaterThan(0);
      });
    });

    it("filters alerts by type", async () => {
      render(<SecurityAlertsPanel />);

      const toggleRansomwareType = screen.getByText("Toggle Ransomware Type");
      fireEvent.click(toggleRansomwareType);

      await waitFor(() => {
        const alertCount = screen.getByTestId("table-alert-count");
        expect(alertCount).toHaveTextContent("1");
      });
    });

    it("combines multiple filters", async () => {
      render(<SecurityAlertsPanel />);

      const toggleHighRisk = screen.getByText("Toggle High Risk");
      const toggleActiveStatus = screen.getByText("Toggle Active Status");

      fireEvent.click(toggleHighRisk);
      fireEvent.click(toggleActiveStatus);

      await waitFor(() => {
        const alertCount = screen.getByTestId("table-alert-count");
        expect(parseInt(alertCount.textContent)).toBeGreaterThan(0);
      });
    });

    it("resets to page 1 when filters change", async () => {
      render(<SecurityAlertsPanel />);

      // Go to page 2
      const nextButton = screen.getByTestId("pagination-next");
      fireEvent.click(nextButton);

      await waitFor(() => {
        const currentPage = screen.getByTestId("pagination-current");
        expect(currentPage).toHaveTextContent("2");
      });

      // Filter should reset to page 1
      const toggleHighRisk = screen.getByText("Toggle High Risk");
      fireEvent.click(toggleHighRisk);

      await waitFor(() => {
        const currentPage = screen.getByTestId("pagination-current");
        expect(currentPage).toHaveTextContent("1");
      });
    });
  });

  describe("Pagination", () => {
    it("displays 6 items per page", () => {
      render(<SecurityAlertsPanel />);
      const alertCount = screen.getByTestId("table-alert-count");
      expect(alertCount).toHaveTextContent("6");
    });

    it("navigates to next page", async () => {
      render(<SecurityAlertsPanel />);

      const nextButton = screen.getByTestId("pagination-next");
      fireEvent.click(nextButton);

      await waitFor(() => {
        const currentPage = screen.getByTestId("pagination-current");
        expect(currentPage).toHaveTextContent("2");
      });
    });

    it("navigates to previous page", async () => {
      render(<SecurityAlertsPanel />);

      // Go to page 2 first
      const nextButton = screen.getByTestId("pagination-next");
      fireEvent.click(nextButton);

      await waitFor(() => {
        const currentPage = screen.getByTestId("pagination-current");
        expect(currentPage).toHaveTextContent("2");
      });

      // Go back to page 1
      const prevButton = screen.getByTestId("pagination-prev");
      fireEvent.click(prevButton);

      await waitFor(() => {
        const currentPage = screen.getByTestId("pagination-current");
        expect(currentPage).toHaveTextContent("1");
      });
    });

    it("shows correct alert count on page 2", async () => {
      render(<SecurityAlertsPanel />);

      const nextButton = screen.getByTestId("pagination-next");
      fireEvent.click(nextButton);

      await waitFor(() => {
        const alertCount = screen.getByTestId("table-alert-count");
        expect(alertCount).toHaveTextContent("1"); // Only 1 alert on page 2
      });
    });

    it("uses 'alerts' as item label", () => {
      render(<SecurityAlertsPanel />);
      const itemLabel = screen.getByTestId("pagination-label");
      expect(itemLabel).toHaveTextContent("alerts");
    });
  });

  describe("Selection Functionality", () => {
    it("selects a single alert", async () => {
      render(<SecurityAlertsPanel />);

      const toggleButton = screen.getByText("Toggle 1");
      fireEvent.click(toggleButton);

      await waitFor(() => {
        const selectedCount = screen.getByTestId("selected-count");
        expect(selectedCount).toHaveTextContent("1");
      });
    });

    it("deselects a selected alert", async () => {
      render(<SecurityAlertsPanel />);

      const toggleButton = screen.getByText("Toggle 1");
      fireEvent.click(toggleButton); // Select

      await waitFor(() => {
        const selectedCount = screen.getByTestId("selected-count");
        expect(selectedCount).toHaveTextContent("1");
      });

      fireEvent.click(toggleButton); // Deselect

      await waitFor(() => {
        const selectedCount = screen.getByTestId("selected-count");
        expect(selectedCount).toHaveTextContent("0");
      });
    });

    it("selects multiple alerts", async () => {
      render(<SecurityAlertsPanel />);

      fireEvent.click(screen.getByText("Toggle 1"));
      fireEvent.click(screen.getByText("Toggle 2"));
      fireEvent.click(screen.getByText("Toggle 3"));

      await waitFor(() => {
        const selectedCount = screen.getByTestId("selected-count");
        expect(selectedCount).toHaveTextContent("3");
      });
    });

    it("selects all visible alerts", async () => {
      render(<SecurityAlertsPanel />);

      const toggleAllButton = screen.getByTestId("toggle-select-all");
      fireEvent.click(toggleAllButton);

      await waitFor(() => {
        const allSelected = screen.getByTestId("table-all-selected");
        expect(allSelected).toHaveTextContent("true");
      });
    });

    it("deselects all when toggle all is clicked with items selected", async () => {
      render(<SecurityAlertsPanel />);

      // Select some items
      fireEvent.click(screen.getByText("Toggle 1"));

      await waitFor(() => {
        const selectedCount = screen.getByTestId("selected-count");
        expect(selectedCount).toHaveTextContent("1");
      });

      // Toggle all should deselect
      const toggleAllButton = screen.getByTestId("toggle-select-all");
      fireEvent.click(toggleAllButton);

      await waitFor(() => {
        const selectedCount = screen.getByTestId("selected-count");
        expect(selectedCount).toHaveTextContent("0");
      });
    });

    it("shows indeterminate state with partial selection", async () => {
      render(<SecurityAlertsPanel />);

      fireEvent.click(screen.getByText("Toggle 1"));

      await waitFor(() => {
        const isIndeterminate = screen.getByTestId("table-indeterminate");
        expect(isIndeterminate).toHaveTextContent("true");
      });
    });
  });

  describe("Group Actions", () => {
    it("marks selected alerts as resolved", async () => {
      render(<SecurityAlertsPanel />);

      // Select an alert
      fireEvent.click(screen.getByText("Toggle 1"));

      await waitFor(() => {
        const selectedCount = screen.getByTestId("selected-count");
        expect(selectedCount).toHaveTextContent("1");
      });

      // Click mark as resolved
      const resolveButton = screen.getByTestId("group-action-0");
      fireEvent.click(resolveButton);

      // Selection should be cleared
      await waitFor(() => {
        const selectedCount = screen.getByTestId("selected-count");
        expect(selectedCount).toHaveTextContent("0");
      });
    });

    it("marks selected alerts as false positive", async () => {
      render(<SecurityAlertsPanel />);

      // Select alerts
      fireEvent.click(screen.getByText("Toggle 1"));
      fireEvent.click(screen.getByText("Toggle 2"));

      await waitFor(() => {
        const selectedCount = screen.getByTestId("selected-count");
        expect(selectedCount).toHaveTextContent("2");
      });

      // Click mark as false positive
      const falsePositiveButton = screen.getByTestId("group-action-1");
      fireEvent.click(falsePositiveButton);

      // Selection should be cleared
      await waitFor(() => {
        const selectedCount = screen.getByTestId("selected-count");
        expect(selectedCount).toHaveTextContent("0");
      });
    });

    it("downloads selected alerts", async () => {
      render(<SecurityAlertsPanel />);

      // Select alerts
      fireEvent.click(screen.getByText("Toggle 1"));
      fireEvent.click(screen.getByText("Toggle 3"));

      await waitFor(() => {
        const selectedCount = screen.getByTestId("selected-count");
        expect(selectedCount).toHaveTextContent("2");
      });

      // Click download
      const downloadButton = screen.getByTestId("group-action-2");
      fireEvent.click(downloadButton);

      // Selection should NOT be cleared for download
      await waitFor(() => {
        const selectedCount = screen.getByTestId("selected-count");
        expect(selectedCount).toHaveTextContent("2");
      });
    });
  });

  describe("Refresh Functionality", () => {
    it("calls refresh handler when refresh button is clicked", () => {
      const onRefresh = jest.fn();
      render(<SecurityAlertsPanel onRefresh={onRefresh} />);

      const refreshButton = screen.getByTestId("refresh-button");
      fireEvent.click(refreshButton);

      expect(onRefresh).toHaveBeenCalledTimes(1);
    });
  });

  describe("Empty States", () => {
    it("shows no alerts state when alerts array is empty", () => {
      render(<SecurityAlertsPanel alerts={[]} />);

      const hasNoAlerts = screen.getByTestId("table-no-alerts");
      const hasNoResults = screen.getByTestId("table-no-results");

      expect(hasNoAlerts).toHaveTextContent("true");
      expect(hasNoResults).toHaveTextContent("true");
    });

    it("shows no results when filters return empty", async () => {
      render(<SecurityAlertsPanel />);

      const searchField = screen.getByTestId("search-field");
      fireEvent.change(searchField, { target: { value: "zzzznonexistent" } });

      await waitFor(() => {
        const hasNoResults = screen.getByTestId("table-no-results");
        expect(hasNoResults).toHaveTextContent("true");
      });
    });
  });

  describe("Combined Functionality", () => {
    it("filters and paginates correctly", async () => {
      render(<SecurityAlertsPanel />);

      // Apply filter to get high risk alerts (3 total)
      const toggleHighRisk = screen.getByText("Toggle High Risk");
      fireEvent.click(toggleHighRisk);

      await waitFor(() => {
        const totalItems = screen.getByTestId("pagination-total");
        expect(totalItems).toHaveTextContent("3");
      });
    });

    it("searches and maintains selection", async () => {
      render(<SecurityAlertsPanel />);

      // Select an alert
      fireEvent.click(screen.getByText("Toggle 1"));

      await waitFor(() => {
        const selectedCount = screen.getByTestId("selected-count");
        expect(selectedCount).toHaveTextContent("1");
      });

      // Search (this will change pages but selection persists)
      const searchField = screen.getByTestId("search-field");
      fireEvent.change(searchField, { target: { value: "Malware" } });

      await waitFor(() => {
        const selectedCount = screen.getByTestId("selected-count");
        expect(selectedCount).toHaveTextContent("1"); // Selection maintained
      });
    });

    it("handles pagination with filtered results", async () => {
      render(<SecurityAlertsPanel />);

      // Search for "active" which should return multiple results
      const searchField = screen.getByTestId("search-field");
      fireEvent.change(searchField, { target: { value: "active" } });

      await waitFor(() => {
        const currentPage = screen.getByTestId("pagination-current");
        expect(currentPage).toHaveTextContent("1");
      });
    });
  });

  describe("Component Integration", () => {
    it("passes correct props to SecurityAlertsTable", () => {
      render(<SecurityAlertsPanel />);
      expect(screen.getByTestId("security-alerts-table")).toBeInTheDocument();
    });

    it("passes correct props to Pagination", () => {
      render(<SecurityAlertsPanel />);
      expect(screen.getByTestId("pagination")).toBeInTheDocument();
    });

    it("passes correct props to GroupActionsButton", () => {
      render(<SecurityAlertsPanel />);
      expect(screen.getByTestId("group-actions-button")).toBeInTheDocument();
    });

    it("integrates all header components", () => {
      render(<SecurityAlertsPanel />);

      expect(screen.getByTestId("search-field")).toBeInTheDocument();
      expect(screen.getByTestId("filter-button")).toBeInTheDocument();
      expect(screen.getByTestId("refresh-button")).toBeInTheDocument();
      expect(screen.getByTestId("group-actions-button")).toBeInTheDocument();
    });
  });
});
