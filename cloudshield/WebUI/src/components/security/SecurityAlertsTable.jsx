import React from "react";
import PropTypes from "prop-types";

import Checkbox from "../common/Checkbox/Checkbox.jsx";
import SecurityAlertsItem from "./SecurityAlertsItem.jsx";
import { useThemeColors } from "../../hooks/useThemeColors.js";

function SecurityAlertsTable({
  securityAlerts = [],
  selectedAlerts = new Set(),
  allVisibleSelected = false,
  isIndeterminate = false,
  onToggleSelect = () => {},
  onToggleSelectAll = () => {},
  hasNoAlerts = false,
  hasNoResults = false,
}) {
  const themeColors = useThemeColors();
  const styles = {
    tableHeaders: {
      display: "grid",
      gridTemplateColumns: "40px 1fr 1.2fr 2fr 1fr 1fr 40px",
      alignItems: "center",
      gap: "12px",
      padding: "10px 16px",
      position: "sticky",
      top: 0,
      zIndex: 10,
      backgroundColor: themeColors.bgSecondary, // Inherit panel background
    },
    checkboxWrapper: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: "40px",
    },
    headerLabel: {
      fontSize: "0.85rem",
      color: themeColors.textPrimary,
      fontWeight: "500",
      display: "flex",
      alignItems: "center",
      gap: "4px",
    },
    headerLabelBright: {
      fontSize: "0.85rem",
      color: themeColors.textSecondary,
      fontWeight: "500",
      display: "flex",
      alignItems: "center",
      gap: "4px",
    },
    actionWrapper: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: "40px",
    },
    tableBody: {
      display: "flex",
      flexDirection: "column",
      minHeight: "300px",
    },
    emptyState: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "300px",
      color: themeColors.textSecondary,
      textAlign: "center",
      gap: "8px",
    },
    emptyStateTitle: {
      fontSize: "16px",
      fontWeight: "500",
      color: themeColors.textSecondary,
    },
    emptyStateSubtitle: {
      fontSize: "14px",
      color: themeColors.textSecondary,
    },
  };

  return (
    <>
      <div style={styles.tableHeaders}>
        <div style={styles.checkboxWrapper}>
          <Checkbox
            checked={allVisibleSelected}
            indeterminate={isIndeterminate}
            onChange={onToggleSelectAll}
          />
        </div>
        <span style={styles.headerLabelBright}>Alert</span>
        <span style={styles.headerLabel}>Date</span>
        <span style={styles.headerLabel}>Description</span>
        <span style={styles.headerLabel}>Risk</span>
        <span style={styles.headerLabelBright}>Status</span>
        <div style={styles.actionWrapper}></div>
      </div>

      <div style={styles.tableBody}>
        {hasNoResults ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyStateTitle}>
              {hasNoAlerts ? "No security alerts" : "No alerts found"}
            </div>
            <div style={styles.emptyStateSubtitle}>
              {hasNoAlerts
                ? "There are no security alerts to display"
                : "Try adjusting your search or filter criteria"}
            </div>
          </div>
        ) : (
          securityAlerts.map((alert, index) => (
            <SecurityAlertsItem
              key={alert.id}
              securityAlert={alert}
              isSelected={selectedAlerts.has(alert.id)}
              onToggleSelect={onToggleSelect}
              isEven={index % 2 === 0}
            />
          ))
        )}
      </div>
    </>
  );
}

SecurityAlertsTable.propTypes = {
  securityAlerts: PropTypes.array,
  selectedAlerts: PropTypes.instanceOf(Set),
  allVisibleSelected: PropTypes.bool,
  isIndeterminate: PropTypes.bool,
  onToggleSelect: PropTypes.func,
  onToggleSelectAll: PropTypes.func,
  hasNoAlerts: PropTypes.bool,
  hasNoResults: PropTypes.bool,
};

export default SecurityAlertsTable;