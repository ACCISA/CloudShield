/**
 * DashboardPage.jsx
 *
 * Purpose:
 * Dashboard page assembling StatCard(s) and the ActivityTable.
 * Includes data fetching logic and state management for backend integration.
 */
import React, { useEffect, useState, useCallback } from "react";
import { Box, LinearProgress, Paper, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { trackButton } from "../lib/analytics";

import StatCard from "../components/dashboard/StatCard.jsx";
import ActivityPanel from "../components/dashboard/ActivityPanel.jsx";
import ActivityTable from "../components/dashboard/ActivityTable.jsx";
import { useAuth } from "../context/AuthContext.jsx"; // Assuming you have AuthContext for org_id
import { useOrgMetrics } from "../api/useOrgMetrics.js"; // Custom hook to fetch org metrics
const API_BASE_URL = "http://localhost:5050"; // Base URL for API calls 

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth(); // Get current logged-in user data

  const [provisioningStatus, setProvisioningStatus] = useState("pending");
  const [loadingText, setLoadingText] = useState("Initializing infrastructure...");

  const { stats, loading: statsLoading } = useOrgMetrics();

  // Polling logic to check provisioning status
  useEffect(() => {
    if (!user?.org_id) return;
  }, [user?.org_id]);
   
  const [activityLoading, setActivityLoading] = useState(false);
  const [page, setPage] = useState(0); // 0-indexed for MUI
  const [rowsPerPage, setRowsPerPage] = useState(20);   

  const [activities, setActivities] = useState([]);
  const [totalActivities, setTotalActivities] = useState(0);

  const org_id = localStorage.getItem("org_id");

  // useEffect(() => {
  //   if (!org_id) return;

  //   const checkStatus = async () => {
  //     try {
  //       const response = await fetch(`/api/organization/${org_id}`);
  //       const data = await response.json();

  //       setProvisioningStatus(data.provisioning_status || "completed");

  //       if (data.provisioning_status === "in_progress") {
  //         setLoadingText("Provisioning cloud infrastructure. This may take a few minutes.");
  //       }
  //     } catch (error) {
  //       console.error("Failed to fetch provisioning status", error);
  //     }
  //   };

  //   checkStatus();

  //   let intervalId;
  //   if (provisioningStatus === "in_progress") {
  //     intervalId = setInterval(checkStatus, 10000);
  //   }

  //   return () => clearInterval(intervalId);
  // }, [user?.org_id, provisioningStatus]);


  const fetchActivities = useCallback(async () => {
    if (!org_id) return;

    setActivityLoading(true);
    try {
      const apiPage = page + 1;
      const response = await fetch(
        `${API_BASE_URL}/api/activity/${org_id}?page=${apiPage}&limit=${rowsPerPage}`
      );

      if (response.ok) {
        const data = await response.json();
        setActivities(data.items || []);
        setTotalActivities(data.total || 0);
      } else {
        console.error("Failed to fetch activities");
      }
    } catch (error) {
      console.error("Error fetching activities:", error);
    } finally {
      setActivityLoading(false);
    }
  }, [org_id, page, rowsPerPage]);

  const handleRefreshActivities = () => {
    fetchActivities();
  };

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);


  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
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
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: "24px",
        color: "#fff",
      }}
    >
      {/* CONDITIONAL PROVISIONING PROGRESS BAR */}
      {provisioningStatus === "in_progress" && (
        <Paper
          sx={{
            p: 3,
            bgcolor: "#1E1E1E",
            border: "1px solid #333",
            borderRadius: 2,
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography variant="h6" sx={{ color: "#fff", fontWeight: 600 }}>
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
              backgroundColor: "#333",
              "& .MuiLinearProgress-bar": {
                background: "linear-gradient(90deg, #6a4fcf 0%, #ad8bff 100%)",
              },
            }}
          />
        </Paper>
      )}

      {/* Stat cards row */}
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: "16px" }}>
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
          value={stats.shares ?? (statsLoading ? "…" : 0)}
          gradientFrom="#c57a1c"
          gradientTo="#f0a24f"
          onAdd={handleAddFile}
        />
      </Box>

      <ActivityTable 
        activities={activities}
        loading={activityLoading}
        page={page}
        rowsPerPage={rowsPerPage}
        totalCount={totalActivities}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        onRefresh={handleRefreshActivities}
      />
    </Box>
  );
}