import React, { useState, useMemo, useEffect } from "react";
import { Box, Typography } from "@mui/material";
import PropTypes from "prop-types";

import SecurityAlertsTable from "./SecurityAlertsTable";
import SearchField from "../common/SearchField/SearchField";
import RefreshButton from "../common/RefreshButton/RefreshButton";
import FilterButton from "../common/FilterButton/FilterButton";
import Pagination from "../common/Pagination/Pagination";
import GroupActionsButton from "../common/GroupActionsButton/GroupActionsButton";
import CheckmarkIcon from "../../assets/CheckmarkIcon";
import FalsePositiveIcon from "../../assets/security/FalsePositiveIcon";
import DownloadIcon from "../../assets/DownloadIcon";
import { SECURITY_FILTERS } from "../../config/filterConfigs";
import { createFilterChangeHandler } from "../../utils/filterHelpers";

function SecurityAlertsPanel({ alerts = [], loading = false, error = null, onRefresh, onUpdateAlert = () => {} }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAlerts, setSelectedAlerts] = useState(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [activeFilters, setActiveFilters] = useState({
    risk: new Set(),
    status: new Set(),
    type: new Set(),
  });
  const itemsPerPage = 6;

  // Filter alerts based on search query and active filters
  const filteredAlerts = useMemo(() => {
    let result = alerts;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (alert) =>
          alert.type.toLowerCase().includes(query) ||
          alert.activity.toLowerCase().includes(query) ||
          alert.status.toLowerCase().includes(query),
      );
    }

    // Apply risk filter
    if (activeFilters.risk.size > 0) {
      result = result.filter((alert) => activeFilters.risk.has(alert.risk));
    }

    // Apply status filter
    if (activeFilters.status.size > 0) {
      result = result.filter((alert) => activeFilters.status.has(alert.status));
    }

    // Apply type filter
    if (activeFilters.type.size > 0) {
      result = result.filter((alert) => activeFilters.type.has(alert.type));
    }

    return result;
  }, [alerts, searchQuery, activeFilters]);

  // Pagination
  const paginatedAlerts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredAlerts.slice(startIndex, endIndex);
  }, [filteredAlerts, currentPage, itemsPerPage]);

  // Reset to page 1 when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeFilters]);

  // Filter change handler
  const handleFilterChange = createFilterChangeHandler(setActiveFilters);

  // Selection handlers
  const handleToggleSelectAll = () => {
    if (selectedAlerts.size > 0) {
      // If any items are selected (including all or some), deselect all
      setSelectedAlerts(new Set());
    } else {
      // If nothing is selected, select all
      setSelectedAlerts(new Set(paginatedAlerts.map((a) => a.id)));
    }
  };

  const handleToggleSelect = (id) => {
    const newSelected = new Set(selectedAlerts);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedAlerts(newSelected);
  };

  const handleRefresh = () => {
    if (onRefresh) onRefresh();
  };

  const handleBulkMarkResolved = () => {
    // Backend integration: API call to mark selected alerts as resolved
    console.log("Mark as resolved:", Array.from(selectedAlerts));
    // Clear selection after action
    setSelectedAlerts(new Set());
  };

  const handleBulkMarkFalsePositive = () => {
    // Backend integration: API call to mark selected alerts as false positive
    console.log("Mark as false positive:", Array.from(selectedAlerts));
    // Clear selection after action
    setSelectedAlerts(new Set());
  };

  const handleBulkDownload = () => {
    // Backend integration: API call to download selected alerts
    console.log("Download alerts:", Array.from(selectedAlerts));
  };

  const groupActionsMenuItems = [
    {
      icon: <CheckmarkIcon width={16} height={16} color="#10B981" />,
      label: "Mark as resolved",
      color: "#10B981",
      onClick: handleBulkMarkResolved,
    },
    {
      icon: <FalsePositiveIcon width={16} height={16} color="#EBAF60" />,
      label: "Mark as false positive",
      color: "#EBAF60",
      onClick: handleBulkMarkFalsePositive,
    },
    {
      icon: <DownloadIcon width={16} height={16} color={themeColors.textPrimary} />,
      label: "Download",
      color: themeColors.textPrimary,
      onClick: handleBulkDownload,
    },
  ];

  const allSelected =
    paginatedAlerts.length > 0 &&
    selectedAlerts.size === paginatedAlerts.length;
  const isIndeterminate =
    selectedAlerts.size > 0 && selectedAlerts.size < paginatedAlerts.length;

  // Pagination handler
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const styles = {
    container: {
      backgroundColor: themeColors.bgSecondary,
      borderRadius: "16px",
      padding: "16px",
      border: `1px solid ${themeColors.borderLight}`,
    },
    header: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "12px",
    },
    headerLeft: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
    },
    headerRight: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
    },
    tableWrapper: {
      height: "340px",
      display: "flex",
      flexDirection: "column",
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          {/* FIX: Use themeColors.textPrimary instead of hardcoded "#fff" */}
          <Typography
            sx={{
              color: themeColors.textPrimary, 
              fontWeight: 600,
              fontSize: "1.1rem",
            }}
          >
            Security Alert History
          </Typography>
          {/* FIX: Use themeColors.textPrimary instead of hardcoded "white" */}
          <Box
            sx={{
              backgroundColor: "rgba(255, 255, 255, 0.1)",
              padding: "2px 8px",
              borderRadius: "12px",
              color: themeColors.textPrimary, 
              fontSize: "0.85rem",
              fontWeight: 500,
            }}
          >
            {alerts.length}
          </Box>
        </div>
        <div style={styles.headerRight}>
          <GroupActionsButton
            selectedCount={selectedAlerts.size}
            buttonText="Group Actions"
            menuItems={groupActionsMenuItems}
          />
          <SearchField
            placeholder="Search alerts"
            value={searchQuery}
            onChange={setSearchQuery}
          />
          <FilterButton
            filterGroups={SECURITY_FILTERS}
            activeFilters={activeFilters}
            onFilterChange={handleFilterChange}
          />
          <RefreshButton onClick={handleRefresh} />
        </div>
      </div>
      {error && (
        <p style={{ color: "#EF4444", fontSize: "13px", margin: "0 0 8px" }}>
          Failed to load alerts: {error.message}
        </p>
      )}
      <div style={styles.tableWrapper}>
        <SecurityAlertsTable
          securityAlerts={paginatedAlerts}
          selectedAlerts={selectedAlerts}
          allVisibleSelected={allSelected}
          isIndeterminate={isIndeterminate}
          onToggleSelect={handleToggleSelect}
          onToggleSelectAll={handleToggleSelectAll}
          hasNoAlerts={!loading && alerts.length === 0}
          hasNoResults={!loading && filteredAlerts.length === 0}
          onUpdateAlert={onUpdateAlert}
        />
      </div>

      {/* Pagination */}
      <Pagination
        totalItems={filteredAlerts.length}
        itemsPerPage={itemsPerPage}
        currentPage={currentPage}
        onPageChange={handlePageChange}
        itemLabel="alerts"
      />
    </div>
  );
}

SecurityAlertsPanel.propTypes = {
  alerts:    PropTypes.array,
  loading:   PropTypes.bool,
  error:     PropTypes.instanceOf(Error),
  onRefresh:      PropTypes.func,
  onUpdateAlert:  PropTypes.func,
};

export default SecurityAlertsPanel;
