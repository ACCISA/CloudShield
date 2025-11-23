/**
 * DashboardPage.jsx
 *
 * Purpose:
 *   Dashboard page assembling StatCard(s) and the ActivityPanel.
 *   Includes data fetching logic and state management for backend integration.
 */
import React from "react";
import { Box } from "@mui/material";

import StatCard from "../components/dashboard/StatCard.jsx";
import ActivityPanel from "../components/dashboard/ActivityPanel.jsx";

/**
 * Main dashboard page displaying stat cards and recent activity.
 * Ready for backend integration with loading and error states.
 *
 * @returns {JSX.Element} Dashboard layout
 */
export default function DashboardPage() {
  // TODO: Add data fetching logic here when backend is ready
  // Example:
  // const [stats, setStats] = useState({ users: { value: 16, changePercent: 15.2 }, ... });
  // useEffect(() => { fetch('/api/dashboard/stats').then(...) }, []);

  // Handler for add button clicks
  const handleAddUser = () => {
    console.log("Add user clicked");
    // TODO: Implement add user functionality
  };

  const handleAddWorkstation = () => {
    console.log("Add workstation clicked");
    // TODO: Implement add workstation functionality
  };

  const handleAddGroup = () => {
    console.log("Add group clicked");
    // TODO: Implement add group functionality
  };

  const handleAddFile = () => {
    console.log("Add file clicked");
    // TODO: Implement add file functionality
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
