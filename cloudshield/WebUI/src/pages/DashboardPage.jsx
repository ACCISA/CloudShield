import React, { useEffect, useState, useCallback } from "react";
import { Alert, Box, LinearProgress, Paper, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { trackButton } from "../lib/analytics";
import { useAppTheme } from "../context/ThemeContext.jsx";
import { useThemeColors } from "../hooks/useThemeColors.js";

import StatCard from "../components/dashboard/StatCard.jsx";
import ActivityPanel from "../components/dashboard/ActivityPanel.jsx";
import PageShell from "../components/layout/PageShell.jsx";
import TableSurface from "../components/table/TableSurface.jsx";

import { useAuth } from "../context/AuthContext.jsx";
import { useOrgMetrics } from "../api/useOrgMetrics.js";
import { apiGet } from "../api/client.js";

import { safeAsync } from "../lib/safeAsync.js";
import { getUserErrorMessage } from "../lib/errors.js";
import { formatShares } from "../lib/format.js";

function normalizeActivityItem(item, index) {
  const createdAt = item?.created_at || item?.date || item?.timestamp;
  let date = item?.date || "-";

  if (createdAt && !item?.date) {
    const parsed = new Date(createdAt);
    if (!Number.isNaN(parsed.getTime())) {
      const datePart = parsed.toLocaleDateString("en-US", {
        month: "2-digit",
        day: "2-digit",
        year: "numeric",
      });
      const timePart = parsed.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
      date = `${datePart} ${timePart}`;
    }
  }

  return {
    id: item?.id || item?._id || `activity-${index}`,
    user: item?.user || item?.actor || "System",
    date,
    activity:
      item?.activity ||
      item?.description ||
      item?.action ||
      "Performed an action",
  };
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const auth = useAuth();
  const { effectiveTheme } = useAppTheme();
  const themeColors = useThemeColors();

  const [provisioningStatus] = useState("pending");
  const [loadingText] = useState("Initializing infrastructure...");

  const { stats = {}, loading: statsLoading } = useOrgMetrics();

  const [activityLoading, setActivityLoading] = useState(false);
  const [activityError, setActivityError] = useState("");
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  const [activities, setActivities] = useState([]);
  const [totalActivities, setTotalActivities] = useState(0);

  const org_id =
    localStorage.getItem("org_id") ||
    auth?.currentUser?.org_id ||
    auth?.user?.org_id ||
    null;

  const fetchActivities = useCallback(async () => {
    if (!org_id) {
      setActivities([]);
      setTotalActivities(0);
      setActivityError("");
      return [];
    }

    setActivityLoading(true);
    setActivityError("");

    try {
      const response = await safeAsync(() =>
        apiGet(`/activity/${org_id}?page=${page}&limit=${itemsPerPage}`)
      );
      const data =
        typeof response?.json === "function" ? await response.json() : response;

      const items = Array.isArray(data?.items) ? data.items : [];
      const normalized = items.map((item, idx) =>
        normalizeActivityItem(item, idx)
      );

      setActivities(normalized);
      setTotalActivities(data?.total ?? 0);
      return normalized;
    } catch (error) {
      console.error("Error fetching activities:", error);

      setActivityError(getUserErrorMessage(error));
      setActivities([]);
      setTotalActivities(0);
      return [];
    } finally {
      setActivityLoading(false);
    }
  }, [org_id, page]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const handleChangePage = (newPage) => {
    setPage(newPage);
  };

  const handleAddUser = () => {
    trackButton("dashboard/statcard/add", {
      page: "dashboard",
      entity: "users",
    });
    navigate("/employees", { state: { openModal: true } });
  };

  const handleAddWorkstation = () => {
    trackButton("dashboard/statcard/add", {
      page: "dashboard",
      entity: "workstations",
    });
    navigate("/workstations", { state: { openModal: true } });
  };

  const handleAddGroup = () => {
    trackButton("dashboard/statcard/add", {
      page: "dashboard",
      entity: "groups",
    });
    navigate("/groups", { state: { openModal: true } });
  };

  const handleAddFile = () => {
    trackButton("dashboard/statcard/add", {
      page: "dashboard",
      entity: "files",
    });
    navigate("/files", { state: { openModal: true } });
  };

  return (
    <PageShell>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 3,
          color: "text.primary",
          height: "100%",
          minHeight: 0,
        }}
      >
        {provisioningStatus === "in_progress" && (
          <Paper
            sx={{
              p: 3,
              bgcolor: "background.paper",
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 2,
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Typography variant="h6" sx={{ color: "text.primary", fontWeight: 600 }}>
                Cloud Infrastructure Provisioning
              </Typography>
              <Typography variant="body2" sx={{ color: "#aaa" }}>
                In Progress
              </Typography>
            </Box>

            <Typography variant="body2" sx={{ color: "#aaa" }}>
              {loadingText}
            </Typography>

            <LinearProgress
              sx={{
                height: 8,
                borderRadius: 4,
                backgroundColor: themeColors.isDark ? "#333" : "#e8e8e8",
                "& .MuiLinearProgress-bar": {
                  background: "linear-gradient(90deg, #6a4fcf 0%, #ad8bff 100%)",
                },
              }}
            />
          </Paper>
        )}

        {activityError ? <Alert severity="error">{activityError}</Alert> : null}

        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
          <StatCard
            title="Users"
            value={stats.users ?? (statsLoading ? "…" : 0)}
            gradientFrom="#6a4fcf"
            gradientTo="#ad8bff"
            onAdd={handleAddUser}
          />
          <StatCard
            title="Workstations"
            value={stats.workstations ?? (statsLoading ? "…" : 0)}
            gradientFrom="#c94b4b"
            gradientTo="#de6f6f"
            onAdd={handleAddWorkstation}
          />
          <StatCard
            title="Groups"
            value={stats.groups ?? (statsLoading ? "…" : 0)}
            gradientFrom="#2656d8"
            gradientTo="#4d7fff"
            onAdd={handleAddGroup}
          />
          <StatCard
            title="Shares"
            value={formatShares(stats.shares ?? (statsLoading ? "…" : 0))}
            gradientFrom="#c57a1c"
            gradientTo="#f0a24f"
            onAdd={handleAddFile}
          />
        </Box>

        <TableSurface>
          <ActivityPanel
            fetchActivities={fetchActivities}
            initialData={activities}
            currentPage={page}
            totalItems={totalActivities}
            itemsPerPage={itemsPerPage}
            onPageChange={handleChangePage}
            loading={activityLoading}
          />
        </TableSurface>
      </Box>
    </PageShell>
  );
}