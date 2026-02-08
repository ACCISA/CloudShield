/**
 * DashboardPage.jsx
 *
 * Purpose:
 * Dashboard page assembling StatCard(s) and the ActivityPanel.
 * Includes data fetching logic and state management for backend integration.
 */
import React, { useEffect, useState } from "react";
import { Box, LinearProgress, Paper, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { trackButton } from "../lib/analytics";

import StatCard from "../components/dashboard/StatCard.jsx";
import ActivityPanel from "../components/dashboard/ActivityPanel.jsx";
import { useAuth } from "../context/AuthContext.jsx"; // Assuming you have AuthContext for org_id

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth(); // Get current logged-in user data

  // State for provisioning status
  const [provisioningStatus, setProvisioningStatus] = useState("pending");
  const [loadingText, setLoadingText] = useState(
    "Initializing infrastructure...",
  );

  const API_BASE =
  import.meta?.env?.VITE_API_BASE_URL || "http://localhost:5050/api";

  function getToken() {
    // CloudShield stores the JWT under "jwt"
    return localStorage.getItem("jwt");
  }

  async function apiGet(path) {
    const token = getToken();

    const res = await fetch(`${API_BASE}${path}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!res.ok) {
      let msg = `HTTP ${res.status}`;
      try {
        const data = await res.json();
        msg = data?.error || data?.details || msg;
      } catch {}
      throw new Error(msg);
    }

    return res.json();
  }

  const [stats, setStats] = useState({
    users: null,
    workstations: null,
    groups: null,
    shares: null,
  });
const [statsLoading, setStatsLoading] = useState(true);

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

  useEffect(() => {
    let mounted = true;

    async function loadStats() {
      try {
        setStatsLoading(true);
        const res = await apiGet("/organizations/me/metrics"); // { stats: {...} }

        if (!mounted) return;

        setStats({
          users: res.stats.users,
          workstations: res.stats.workstations,
          groups: res.stats.access_groups, // important mapping
          shares: res.stats.shares,
        });
      } catch (e) {
        if (!mounted) return;
        setStats({
          users: 0,
          workstations: 0,
          groups: 0,
          shares: 0,
        });
      } finally {
        if (mounted) setStatsLoading(false);
      }
    }

    loadStats();
    return () => {
      mounted = false;
    };
  }, []);

  // Handler for add button clicks
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

      {/* Activity panel */}
      <ActivityPanel />
    </Box>
  );
}
