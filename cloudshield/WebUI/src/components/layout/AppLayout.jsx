import React, { useState } from 'react';
import { Box } from '@mui/material';
import Sidebar from './Sidebar.jsx';

export default function AppLayout({ children }) {
  // collapsed = true means narrow sidebar mode
  const [collapsed, setCollapsed] = useState(false);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: '#0A0A0A',
        color: '#fff',
        display: 'flex',
      }}
    >
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
      />

      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          padding: '24px',
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
