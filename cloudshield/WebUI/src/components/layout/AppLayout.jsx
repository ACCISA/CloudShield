/**
 * AppLayout.jsx
 *
 * Purpose:
 *   Page-level layout that provides the sidebar and main content area.
 *
 * Props:
 *   - children: page content rendered in the main area
 */
import React, { useState } from 'react';
import { Box } from '@mui/material';
import Sidebar from './Sidebar.jsx';

/**
 * Main application layout wrapper with sidebar and content area.
 * @param {Object} props
 * @param {React.ReactNode} props.children - Page content to render in main area
 * @returns {JSX.Element} Layout with sidebar and main content
 */
export default function AppLayout({ children }) {
  // Track whether sidebar is collapsed (narrow mode)
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
