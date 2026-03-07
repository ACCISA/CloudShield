import React, { useState, useEffect, useCallback, useMemo } from "react";
import SearchField from "../common/SearchField/SearchField";
import RefreshButton from "../common/RefreshButton/RefreshButton";
import Pagination from "../common/Pagination/Pagination";
import EmptyState from "../common/EmptyState/EmptyState";
import { searchWithRelevance } from "../../utils/searchUtils";

const PANEL_BG = "#0f0f0f";
const ROW_BG = "#2a2a2a";

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

function getUserInitials(name) {
  if (!name) return "?";
  const parts = name.split(" ").filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export default function ActivityPanel({
  fetchActivities,
  initialData,
  currentPage = 1,
  totalItems = 0,
  itemsPerPage = 10,
  onPageChange,
  loading: externalLoading = false,
}) {
  const [search, setSearch] = useState("");
  const [activities, setActivities] = useState(
    Array.isArray(initialData) ? initialData : []
  );
  const [loading, setLoading] = useState(Boolean(externalLoading));
  const [error, setError] = useState(null);
  const [sortField, setSortField] = useState("date");
  const [sortDir, setSortDir] = useState("desc");
  const [internalPage, setInternalPage] = useState(currentPage);

  const isControlledPagination =
    typeof onPageChange === "function" && totalItems > 0;
  const activePage = isControlledPagination ? currentPage : internalPage;
  const displayTotal = isControlledPagination ? totalItems : 0;

  useEffect(() => {
    setLoading(Boolean(externalLoading));
  }, [externalLoading]);

  useEffect(() => {
    if (Array.isArray(initialData)) {
      setActivities(initialData);
    }
  }, [initialData]);

  useEffect(() => {
    if (!isControlledPagination) {
      setInternalPage(currentPage);
    }
  }, [currentPage, isControlledPagination]);

  const loadActivities = useCallback(async () => {
    if (!fetchActivities) {
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
      setActivities(mockData);
    } finally {
      setLoading(false);
    }
  }, [fetchActivities]);

  useEffect(() => {
    if (!Array.isArray(initialData) && fetchActivities) {
      loadActivities();
    }
  }, [fetchActivities, initialData, loadActivities]);

  useEffect(() => {
    if (!isControlledPagination) {
      setInternalPage(1);
    }
  }, [search, sortField, sortDir, isControlledPagination]);

  const filteredActivities =
    searchWithRelevance(activities, search, [
      { field: "user", weight: 2 },
      { field: "activity", weight: 1.5 },
      { field: "date", weight: 0.5 },
    ]) || [];

  const sortedActivities = useMemo(() => {
    return [...filteredActivities].sort((a, b) => {
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
  }, [filteredActivities, sortField, sortDir]);

  const visibleActivities = isControlledPagination
    ? sortedActivities
    : sortedActivities.slice(
        (activePage - 1) * itemsPerPage,
        activePage * itemsPerPage
      );

  const totalForPagination = isControlledPagination
    ? displayTotal
    : sortedActivities.length;

  const handleRefresh = async () => {
    await loadActivities();
  };

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortField(field);
    setSortDir(field === "date" ? "desc" : "asc");
  };

  const headerStyle = (field) => ({
    fontSize: "13px",
    fontWeight: sortField === field ? 600 : 500,
    color: sortField === field ? "rgba(255,255,255,1)" : "rgba(255,255,255,0.6)",
    cursor: "pointer",
    userSelect: "none",
  });

  const styles = {
    container: {
      backgroundColor: PANEL_BG,
      borderRadius: "16px",
      padding: "16px",
      border: "1px solid rgba(255,255,255,0.08)",
      color: "#fff",
      marginTop: "24px",
    },
    header: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "12px",
      gap: "12px",
      flexWrap: "wrap",
    },
    headerLeft: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
    },
    title: {
      fontSize: "14px",
      fontWeight: "500",
      color: "rgba(255,255,255,1)",
      marginBottom: "12px",
      marginTop: 0,
    },
    headerRight: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      flexWrap: "wrap",
      justifyContent: "flex-end",
      marginLeft: "auto",
    },
    tableWrapper: {
      display: "flex",
      flexDirection: "column",
    },
    tableHeader: {
      display: "grid",
      gridTemplateColumns: "1.6fr 1.2fr 2fr",
      gap: "12px",
      padding: "0 8px 10px",
    },
    rowList: {
      display: "flex",
      flexDirection: "column",
      gap: "6px",
    },
    row: (index) => ({
      display: "grid",
      gridTemplateColumns: "1.6fr 1.2fr 2fr",
      gap: "12px",
      alignItems: "center",
      borderRadius: "12px",
      padding: "12px 16px",
      backgroundColor: index % 2 === 0 ? ROW_BG : "transparent",
    }),
    userCell: {
      display: "flex",
      alignItems: "center",
      gap: "12px",
      minWidth: 0,
    },
    avatar: {
      width: "38px",
      height: "38px",
      borderRadius: "50%",
      backgroundColor: "#fff",
      color: "#111",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "14px",
      fontWeight: "600",
      flexShrink: 0,
    },
    userText: {
      fontSize: "14px",
      color: "#fff",
      fontWeight: 500,
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
    },
    dateText: {
      fontSize: "14px",
      color: "rgba(255,255,255,0.7)",
      whiteSpace: "nowrap",
    },
    activityText: {
      fontSize: "14px",
      color: "#fff",
      lineHeight: 1.4,
    },
    error: {
      marginBottom: "12px",
      padding: "10px 12px",
      borderRadius: "10px",
      border: "1px solid rgba(211,47,47,0.3)",
      backgroundColor: "rgba(211,47,47,0.1)",
      color: "#f44336",
      fontSize: "13px",
    },
    loading: {
      padding: "24px 12px",
      textAlign: "center",
      color: "rgba(255,255,255,0.6)",
      fontSize: "13px",
    },
  };

  const handlePageChange = (nextPage) => {
    if (isControlledPagination) {
      onPageChange(nextPage);
      return;
    }
    setInternalPage(nextPage);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <h3 style={styles.title}>Recent Activity</h3>
        </div>
        <div style={styles.headerRight}>
          <RefreshButton onClick={handleRefresh} disabled={loading} />
          <SearchField
            placeholder="Search activities"
            value={search}
            onChange={setSearch}
          />
        </div>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      <div style={styles.tableWrapper}>
        <div style={styles.tableHeader}>
          <div style={headerStyle("user")} onClick={() => toggleSort("user")}>
            User
          </div>
          <div style={headerStyle("date")} onClick={() => toggleSort("date")}>
            Date
          </div>
          <div
            style={headerStyle("activity")}
            onClick={() => toggleSort("activity")}
          >
            Activity
          </div>
        </div>

        {loading && activities.length === 0 ? (
          <div style={styles.loading}>Loading activity…</div>
        ) : visibleActivities.length === 0 ? (
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
          <div style={styles.rowList}>
            {visibleActivities.map((activity, index) => (
              <div
                key={activity.id || `${activity.date}-${activity.user}`}
                style={styles.row(index)}
              >
                <div style={styles.userCell}>
                  <div style={styles.avatar}>{getUserInitials(activity.user)}</div>
                  <div style={styles.userText}>{activity.user}</div>
                </div>
                <div style={styles.dateText}>{activity.date}</div>
                <div style={styles.activityText}>{activity.activity}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {totalForPagination > 0 && (
        <Pagination
          totalItems={totalForPagination}
          itemsPerPage={itemsPerPage}
          currentPage={activePage}
          onPageChange={handlePageChange}
          itemLabel="activities"
          testId="activity-pagination"
        />
      )}
    </div>
  );
}
