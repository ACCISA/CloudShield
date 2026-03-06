/**
 * ActivityPanel.jsx
 *
 * Purpose:
 *   List recent activities with a small search and refresh control. Used on dashboard.
 *
 * Notes:
 *   - Ready for backend integration via fetchActivities prop
 *   - Fully responsive design with mobile-friendly layout
 *   - Best-effort search with relevance scoring (most relevant results first)
 */
import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Alert,
  Avatar,
  CircularProgress,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import SearchField from "../common/SearchField/SearchField";
import RefreshButton from "../common/RefreshButton/RefreshButton";
import Pagination from "../common/Pagination/Pagination";
import EmptyState from "../common/EmptyState/EmptyState";
import { searchWithRelevance } from "../../utils/searchUtils";

const SIDEBAR_ACTIVE_BG = "#2a2a2a";

/**
 * Displays a searchable list of recent user activities.
 * @param {Function} fetchActivities - Optional async function to fetch activities from backend
 * @param {Array} initialData - Optional initial data to display
 * @returns {JSX.Element} Activity panel with search and refresh controls
 */
export default function ActivityPanel({
  fetchActivities,
  initialData,
  currentPage = 1,
  totalItems = 0,
  rowsPerPage = 25,
  rowsPerPageOptions = [10, 25, 50, 100],
  onPageChange,
  onRowsPerPageChange,
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(theme.breakpoints.down("md"));
  const appFontFamily = theme.typography.fontFamily;

  // State management
  const [search, setSearch] = useState("");
  const [activities, setActivities] = useState(initialData || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sortField, setSortField] = useState("date");
  const [sortDir, setSortDir] = useState("desc");

  // Mock activity data (fallback when no backend is connected)
  const mockData = [
    {
      id: 1,
      user: "Michael Scott",
      date: "10/11/2025 11:36 pm",
      activity: "Uploaded file to group",
    },
    {
      id: 2,
      user: "Noah Burns",
      date: "10/11/2025 11:36 pm",
      activity: "Uploaded file to group",
    },
    {
      id: 3,
      user: "Michael Scott",
      date: "10/11/2025 11:36 pm",
      activity: "Uploaded file to group",
    },
    {
      id: 4,
      user: "Michael Scott",
      date: "10/11/2025 11:36 pm",
      activity: "Uploaded file to group",
    },
    {
      id: 5,
      user: "Michael Scott",
      date: "10/11/2025 11:36 pm",
      activity: "Uploaded file to group",
    },
  ];

  // Load activities on mount
  useEffect(() => {
    if (!initialData) {
      loadActivities();
    }
  }, []);

  // Keep local list in sync with parent-provided activity data.
  useEffect(() => {
    if (Array.isArray(initialData)) {
      setActivities(initialData);
    }
  }, [initialData]);

  // Load activities from backend or use mock data
  const loadActivities = useCallback(async () => {
    if (!fetchActivities) {
      // Use mock data if no backend function provided
      setActivities(mockData);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await fetchActivities();
      setActivities(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch activities:", err);
      setError("Failed to load activities. Please try again.");
      // Fallback to mock data on error
      setActivities(mockData);
    } finally {
      setLoading(false);
    }
  }, [fetchActivities]);

  // Handle refresh button click
  const handleRefresh = () => {
    loadActivities();
  };

  // Filter activities based on search with relevance scoring
  // Most relevant results appear first
  const filteredActivities = searchWithRelevance(activities, search, [
    { field: "user", weight: 2 }, // User name is most important
    { field: "activity", weight: 1.5 }, // Activity description is important
    { field: "date", weight: 0.5 }, // Date is least important
  ]) || [];

  const sortedActivities = [...filteredActivities].sort((a, b) => {
    let left;
    let right;

    if (sortField === "date") {
      const leftTs = Date.parse(a?.date || "");
      const rightTs = Date.parse(b?.date || "");
      left = Number.isNaN(leftTs) ? 0 : leftTs;
      right = Number.isNaN(rightTs) ? 0 : rightTs;
    } else {
      left = String(a?.[sortField] || "").toLowerCase();
      right = String(b?.[sortField] || "").toLowerCase();
    }

    if (left < right) return sortDir === "asc" ? -1 : 1;
    if (left > right) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortField(field);
    setSortDir(field === "date" ? "desc" : "asc");
  };

  const sortArrow = (field) => {
    if (sortField !== field) return "↕";
    return sortDir === "asc" ? "↑" : "↓";
  };

  const headerColor = (field) =>
    sortField === field ? "#fff" : "rgba(255,255,255,0.6)";

  // Client-side pagination: slice the filtered list for the current page
  const isServerPaginated = Boolean(onPageChange && onRowsPerPageChange);
  const paginatedActivities = isServerPaginated
    ? sortedActivities
    : sortedActivities.slice(
        (currentPage - 1) * rowsPerPage,
        currentPage * rowsPerPage,
      );
  const displayTotal = isServerPaginated ? totalItems : sortedActivities.length;

  // Get user initials for avatar
  const getUserInitials = (name) => {
    if (!name) return "?";
    const parts = name.split(" ");
    return parts.length >= 2
      ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
      : name.substring(0, 2).toUpperCase();
  };

  return (
    <Box
      sx={{
        flex: "0 0 auto",
        minWidth: 0,
        backgroundColor: "#0F0F0F",
        borderRadius: "16px",
        border: "1px solid rgba(255,255,255,0.1)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
        color: "#fff",
        fontFamily: appFontFamily,
        padding: isMobile ? "16px" : "24px",
        mt: "24px",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        "& .MuiTypography-root": {
          fontFamily: appFontFamily,
        },
        "& .MuiInputBase-input": {
          fontFamily: appFontFamily,
        },
        "& .MuiButtonBase-root": {
          fontFamily: appFontFamily,
        },
      }}
    >
      {/* Header row */}
      <Box
        sx={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          alignItems: isMobile ? "stretch" : "center",
          gap: "12px",
          mb: 3,
        }}
      >
        <Typography
          sx={{
            color: "#fff",
            fontSize: isMobile ? "1.25rem" : "1.5rem",
            fontWeight: 600,
            lineHeight: 1.2,
            flexShrink: 0,
          }}
        >
          Recent Activity
        </Typography>

        <Box sx={{ flex: 1, minWidth: isMobile ? undefined : "16px" }} />

        <Box
          sx={{
            display: "flex",
            gap: "12px",
            flexDirection: isMobile ? "column" : "row",
            alignItems: "stretch",
            flexShrink: 0,
          }}
        >
          <RefreshButton
            onClick={handleRefresh}
            loading={loading}
            tooltip="Refresh activities"
            fullWidthMobile={true}
          />
          <SearchField
            value={search}
            onChange={setSearch}
            placeholder="Search activities"
            width="360px"
            fullWidthMobile={true}
          />
        </Box>
      </Box>

      {/* Error message */}
      {error && (
        <Alert
          severity="error"
          sx={{
            mb: 2,
            backgroundColor: "rgba(211, 47, 47, 0.1)",
            color: "#f44336",
            border: "1px solid rgba(211, 47, 47, 0.3)",
          }}
        >
          {error}
        </Alert>
      )}

      {/* Table header - hidden on mobile */}
      {!isMobile && (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: isTablet ? "2fr 3fr" : "2fr 1.5fr 3fr",
            gap: "16px",
            px: "16px",
            py: "12px",
            mb: 1,
          }}
        >
          <Box
            onClick={() => toggleSort("user")}
            sx={{ display: "inline-flex", alignItems: "center", gap: "6px", cursor: "pointer", userSelect: "none" }}
          >
            <Typography
              sx={{
                color: headerColor("user"),
                fontSize: "0.85rem",
                fontWeight: 600,
              }}
            >
              User
            </Typography>
            <Typography sx={{ color: headerColor("user"), fontSize: "0.7rem" }}>
              {sortArrow("user")}
            </Typography>
          </Box>
          {!isTablet && (
            <Box
              onClick={() => toggleSort("date")}
              sx={{ display: "inline-flex", alignItems: "center", gap: "6px", cursor: "pointer", userSelect: "none" }}
            >
              <Typography
                sx={{
                  color: headerColor("date"),
                  fontSize: "0.85rem",
                  fontWeight: 600,
                }}
              >
                Date
              </Typography>
              <Typography sx={{ color: headerColor("date"), fontSize: "0.7rem" }}>
                {sortArrow("date")}
              </Typography>
            </Box>
          )}
          <Box
            onClick={() => toggleSort("activity")}
            sx={{ display: "inline-flex", alignItems: "center", gap: "6px", cursor: "pointer", userSelect: "none" }}
          >
            <Typography
              sx={{
                color: headerColor("activity"),
                fontSize: "0.85rem",
                fontWeight: 600,
              }}
            >
              Activity
            </Typography>
            <Typography sx={{ color: headerColor("activity"), fontSize: "0.7rem" }}>
              {sortArrow("activity")}
            </Typography>
          </Box>
        </Box>
      )}

      {/* Activity rows */}
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: "6px",
          overflowY: "auto",
          maxHeight: "500px",
          pr: 1,
          "&::-webkit-scrollbar": {
            width: "8px",
          },
          "&::-webkit-scrollbar-track": {
            backgroundColor: "transparent",
          },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: "rgba(255,255,255,0.2)",
            borderRadius: "4px",
            "&:hover": {
              backgroundColor: "rgba(255,255,255,0.3)",
            },
          },
        }}
      >
        {loading && activities.length === 0 ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress sx={{ color: "#fff" }} />
          </Box>
        ) : paginatedActivities.length === 0 ? (
          <EmptyState
            message="No activities found"
            description={
              search
                ? "Try adjusting your search query"
                : "Activity will appear here once actions are performed"
            }
            testId="activity-empty-state"
          />
        ) : (
          paginatedActivities.map((activity, index) => (
            <Box
              key={activity.id || activity.date + activity.user}
              sx={{
                display: isMobile ? "flex" : "grid",
                flexDirection: isMobile ? "column" : undefined,
                gridTemplateColumns:
                  isTablet && !isMobile
                    ? "2fr 3fr"
                    : !isMobile
                    ? "2fr 1.5fr 3fr"
                    : undefined,
                gap: isMobile ? "8px" : "16px",
                backgroundColor:
                  index % 2 === 0 ? SIDEBAR_ACTIVE_BG : "transparent",
                borderRadius: "12px",
                px: "16px",
                py: "14px",
                alignItems: "center",
              }}
            >
              {/* User column */}
              <Box sx={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <Avatar
                  sx={{
                    width: 32,
                    height: 32,
                    backgroundColor: "#fff",
                    color: "#000",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    flexShrink: 0,
                  }}
                >
                  {getUserInitials(activity.user)}
                </Avatar>
                <Typography
                  sx={{
                    fontWeight: 500,
                    fontSize: "0.875rem",
                    color: "#fff",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {activity.user}
                </Typography>
              </Box>

              {/* Date column - hidden on tablet in grid, shown separately on mobile */}
              {!isTablet && !isMobile && (
                <Typography
                  sx={{
                    fontSize: "0.875rem",
                    color: "rgba(255,255,255,0.7)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {activity.date}
                </Typography>
              )}

              {/* Activity column with date on mobile */}
              <Box
                sx={{ display: "flex", flexDirection: "column", gap: "4px" }}
              >
                <Typography
                  sx={{
                    fontSize: "0.875rem",
                    color: "#fff",
                    fontWeight: 400,
                  }}
                >
                  {activity.activity}
                </Typography>
                {(isMobile || isTablet) && (
                  <Typography
                    sx={{
                      fontSize: "0.75rem",
                      color: "rgba(255,255,255,0.5)",
                    }}
                  >
                    {activity.date}
                  </Typography>
                )}
              </Box>
            </Box>
          ))
        )}
      </Box>

      {/* Pagination bar */}
      {displayTotal > 0 && (
        <Pagination
          currentPage={currentPage}
          totalItems={displayTotal}
          rowsPerPage={rowsPerPage}
          rowsPerPageOptions={rowsPerPageOptions}
          onPageChange={onPageChange || (() => {})}
          onRowsPerPageChange={onRowsPerPageChange || (() => {})}
          testId="activity-pagination"
        />
      )}
    </Box>
  );
}
