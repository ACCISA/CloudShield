/**
 * DashboardPage.jsx
 *
 * Purpose:
 *   Dashboard page assembling StatCard(s) and the ActivityPanel.
 */
import React from 'react';
import { Box } from '@mui/material';

import StatCard from '../components/dashboard/StatCard.jsx';
import ActivityPanel from '../components/dashboard/ActivityPanel.jsx';

/**
 * Main dashboard page displaying stat cards and recent activity.
 * @returns {JSX.Element} Dashboard layout
 */
export default function DashboardPage() {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        color: '#fff',
      }}
    >
      {/* Stat cards row */}
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <StatCard
          title="Users"
          value="16"
          changeText="15.2% ↑"
          gradientFrom="#6a4fcf"
          gradientTo="#ad8bff"
        />

        <StatCard
          title="Workstations"
          value="12"
          changeText="15.2% ↑"
          gradientFrom="#c94b4b"
          gradientTo="#de6f6f"
        />

        <StatCard
          title="Groups"
          value="3"
          changeText="15.2% ↑"
          gradientFrom="#2656d8"
          gradientTo="#4d7fff"
        />

        <StatCard
          title="Files"
          value="33"
          changeText="15.2% ↑"
          gradientFrom="#c57a1c"
          gradientTo="#f0a24f"
        />
      </Box>

      {/* Activity panel */}
      <ActivityPanel />
    </Box>
  );
}
