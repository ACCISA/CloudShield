import React, { useState, useMemo } from "react";
import PropTypes from "prop-types";
import AlertsLineChart from "./AlertsLineChart";
import AlertsPieChart from "./AlertsPieChart";
import TimeRangeSelector from "./TimeRangeSelector";
import LiveIndicator from "./LiveIndicator";
import { useThemeColors } from "../../hooks/useThemeColors.js";

// 1. ISOLATE THE CLOCK: This prevents the ticking time from forcing 
// the heavy D3 charts to re-render every single second.
function Clock({ color }) {
  const [currentTime, setCurrentTime] = React.useState(new Date());

  React.useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date) => {
    const hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes}:${seconds} ${ampm}`;
  };

  return (
    <span style={{ fontSize: "13px", fontWeight: "500", color, fontVariantNumeric: "tabular-nums" }}>
      {formatTime(currentTime)}
    </span>
  );
}

function SecurityChartsPanel({ alerts }) {
  const themeColors = useThemeColors();
  const [timeRange, setTimeRange] = useState("30d");

  // Filter alerts based on time range
  const filteredAlerts = useMemo(() => {
    const now = new Date();
    const daysMap = {
      "7d": 7,
      "14d": 14,
      "30d": 30,
      "90d": 90,
    };

    const days = daysMap[timeRange] || 30;
    const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    return alerts.filter((alert) => {
      const alertDate = new Date(alert.date);
      return alertDate >= cutoffDate;
    });
  }, [alerts, timeRange]);

  // Calculate percentage change vs previous period
  const alertComparison = useMemo(() => {
    const now = new Date();
    const daysMap = {
      "7d": 7,
      "14d": 14,
      "30d": 30,
      "90d": 90,
    };

    const days = daysMap[timeRange] || 30;
    const currentPeriodStart = new Date(
      now.getTime() - days * 24 * 60 * 60 * 1000,
    );
    const previousPeriodStart = new Date(
      currentPeriodStart.getTime() - days * 24 * 60 * 60 * 1000,
    );

    const currentCount = alerts.filter((alert) => {
      const alertDate = new Date(alert.date);
      return alertDate >= currentPeriodStart && alertDate <= now;
    }).length;

    const previousCount = alerts.filter((alert) => {
      const alertDate = new Date(alert.date);
      return alertDate >= previousPeriodStart && alertDate < currentPeriodStart;
    }).length;

    if (previousCount === 0) {
      return { percentChange: 0, isIncrease: false, label: "No previous data" };
    }

    const percentChange = Math.round(
      ((currentCount - previousCount) / previousCount) * 100,
    );
    const isIncrease = percentChange > 0;

    const timeLabels = {
      "7d": "last week",
      "14d": "previous 2 weeks",
      "30d": "last month",
      "90d": "previous 3 months",
    };

    const label = `${Math.abs(percentChange)}% ${isIncrease ? "more" : "less"} vs ${timeLabels[timeRange]}`;

    return { percentChange, isIncrease, label };
  }, [alerts, timeRange]);

  const styles = {
    container: {
      paddingBottom: "16px",
    },
    header: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "16px",
    },
    title: {
      fontSize: "20px",
      fontWeight: "600",
      color: themeColors.textPrimary,
      margin: 0,
    },
    headerRight: {
      display: "flex",
      alignItems: "center",
      gap: "12px",
    },
    chartsGrid: {
      display: "grid",
      gridTemplateColumns: "1fr 340px",
      gap: "16px",
      alignItems: "start",
    },
    chartSection: {
      backgroundColor: themeColors.bgSecondary,
      borderRadius: "16px",
      padding: "16px",
      border: `1px solid ${themeColors.borderLight}`,
    },
    chartTitle: {
      fontSize: "14px",
      fontWeight: "500",
      color: themeColors.textPrimary,
      marginBottom: "12px",
      marginTop: 0,
    },
    chartHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
    },
    comparisonBadge: {
      fontSize: "11px",
      fontWeight: "500",
      padding: "4px 8px",
      borderRadius: "8px",
      display: "inline-flex",
      alignItems: "center",
      gap: "4px",
    },
    comparisonIncrease: {
      color: "#EF4444",
      backgroundColor: "rgba(239, 68, 68, 0.1)",
    },
    comparisonDecrease: {
      color: "#10B981",
      backgroundColor: "rgba(16, 185, 129, 0.1)",
    },
    comparisonNeutral: {
      color: themeColors.textSecondary,
      backgroundColor: themeColors.lightOverlaySubtle,
    },
  };

  const getBadgeStyle = () => {
    if (alertComparison.percentChange === 0) {
      return styles.comparisonNeutral;
    }
    return alertComparison.isIncrease
      ? styles.comparisonIncrease
      : styles.comparisonDecrease;
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerRight}>
          <LiveIndicator />
          <Clock color={themeColors.textSecondary} />
          <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
        </div>
      </div>

      <div style={styles.chartsGrid}>
        <div style={styles.chartSection}>
          <h3 style={styles.chartTitle}>Alert History</h3>
          <AlertsLineChart data={filteredAlerts} timeRange={timeRange} />
        </div>

        <div style={styles.chartSection}>
          <div style={styles.chartHeader}>
            <h3 style={styles.chartTitle}>Alert Distribution</h3>
            <div
              style={{
                ...styles.comparisonBadge,
                ...getBadgeStyle(),
              }}
            >
              {alertComparison.percentChange !== 0 && (
                <span>{alertComparison.isIncrease ? "↑" : "↓"}</span>
              )}
              <span>{alertComparison.label}</span>
            </div>
          </div>
          <AlertsPieChart data={filteredAlerts} timeRange={timeRange} />
        </div>
      </div>
    </div>
  );
}

SecurityChartsPanel.propTypes = {
  alerts: PropTypes.arrayOf(
    PropTypes.shape({
      type: PropTypes.string.isRequired,
      date: PropTypes.string.isRequired,
    }),
  ).isRequired,
};

export default SecurityChartsPanel;