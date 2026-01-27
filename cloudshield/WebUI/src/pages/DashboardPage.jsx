/**
 * DashboardPage.jsx
 *
 * Purpose:
 * Dashboard page assembling StatCard(s) and the ActivityPanel.
 * Includes data fetching logic and state management for backend integration.
 */
import React, { useEffect, useState } from "react";
import { Box, LinearProgress, Paper, Typography } from "@mui/material";
import { trackButton } from "../lib/analytics";

import StatCard from "../components/dashboard/StatCard.jsx";
import ActivityPanel from "../components/dashboard/ActivityPanel.jsx";
import { useAuth } from "../context/AuthContext.jsx"; // Assuming you have AuthContext for org_id

export default function DashboardPage() {
  const { user } = useAuth(); // Get current logged-in user data

  // State for provisioning status
  const [provisioningStatus, setProvisioningStatus] = useState("pending");
  const [loadingText, setLoadingText] = useState(
    "Initializing infrastructure...",
  );

  // Polling logic to check provisioning status
  useEffect(() => {
    if (!user?.org_id) return;

    const checkStatus = async () => {
      try {
        // Fetch the current org data to get 'provisioning_status'
        const response = await fetch(`/api/organization/${user.org_id}`);
        const data = await response.json();

        setProvisioningStatus(data.provisioning_status || "completed");

        if (data.provisioning_status === "in_progress") {
          setLoadingText(
            "Provisioning cloud infrastructure... This may take a few minutes.",
          );
        }
      } catch (error) {
        console.error("Failed to fetch provisioning status", error);
      }
    };

    // Check immediately on mount
    checkStatus();

    // If it's in progress, poll every 10 seconds
    let intervalId;
    if (provisioningStatus === "in_progress") {
      intervalId = setInterval(checkStatus, 10000);
    }

    return () => clearInterval(intervalId);
  }, [user?.org_id, provisioningStatus]);

  // Handler for add button clicks
  const handleAddUser = () => {
    trackButton("dashboard/statcard/add", { page: "dashboard", entity: "users" });
  };

  const handleAddWorkstation = () => {
    trackButton("dashboard/statcard/add", { page: "dashboard", entity: "workstations" });
  };

  const handleAddGroup = () => {
    trackButton("dashboard/statcard/add", { page: "dashboard", entity: "groups" });
  };

  const handleAddFile = () => {
    trackButton("dashboard/statcard/add", { page: "dashboard", entity: "files" });
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
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
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
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <StatCard
          title="Users"
          value={16}
          changePercent={15.2}
          gradientFrom="#6a4fcf"
          gradientTo="#ad8bff"
          onAdd={handleAddUser}
        />

        <StatCard
          title="Workstations"
          value={12}
          changePercent={15.2}
          gradientFrom="#c94b4b"
          gradientTo="#de6f6f"
          onAdd={handleAddWorkstation}
        />

        <StatCard
          title="Groups"
          value={3}
          changePercent={15.2}
          gradientFrom="#2656d8"
          gradientTo="#4d7fff"
          onAdd={handleAddGroup}
        />

        <StatCard
          title="Files"
          value={33}
          changePercent={15.2}
          gradientFrom="#c57a1c"
          gradientTo="#f0a24f"
          onAdd={handleAddFile}
        />
      </Box>

      {/* Activity panel */}
      <ActivityPanel />
    </Box>
  );
}
