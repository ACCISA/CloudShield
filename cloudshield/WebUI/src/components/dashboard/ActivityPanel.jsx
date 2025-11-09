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
  useTheme,
  useMediaQuery,
} from "@mui/material";
import SearchField from "../common/SearchField/SearchField";
import RefreshButton from "../common/RefreshButton/RefreshButton";
import { searchWithRelevance } from "../../utils/searchUtils";

/**
 * Displays a searchable list of recent user activities.
 * @param {Function} fetchActivities - Optional async function to fetch activities from backend
 * @param {Array} initialData - Optional initial data to display
 * @returns {JSX.Element} Activity panel with search and refresh controls
 */
export default function ActivityPanel({ fetchActivities, initialData }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(theme.breakpoints.down("md"));

  // State management
  const [search, setSearch] = useState("");
  const [activities, setActivities] = useState(initialData || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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
      setActivities(data);
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
  ]);

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
        flex: 1,
        minWidth: 0,
        backgroundColor: "#1a1a1a",
        borderRadius: "16px",
        border: "1px solid rgba(255,255,255,0.1)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
        color: "#fff",
        padding: isMobile ? "16px" : "24px",
        mt: "24px",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
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
          Recent activity
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
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            mb: 1,
          }}
        >
          <Typography
            sx={{
              color: "rgba(255,255,255,0.6)",
              fontSize: "0.75rem",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            User ↑
          </Typography>
          {!isTablet && (
            <Typography
              sx={{
                color: "rgba(255,255,255,0.6)",
                fontSize: "0.75rem",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              Date ↑
            </Typography>
          )}
          <Typography
            sx={{
              color: "rgba(255,255,255,0.6)",
              fontSize: "0.75rem",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            Activity ↑
          </Typography>
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
        ) : filteredActivities.length === 0 ? (
          <Box
            sx={{ textAlign: "center", py: 4, color: "rgba(255,255,255,0.5)" }}
          >
            <Typography>No activities found</Typography>
          </Box>
        ) : (
          filteredActivities.map((activity, index) => (
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
                backgroundColor: index % 2 === 0 ? "#2a2a2a" : "transparent",
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
    </Box>
  );
}
