/**
 * AppLayout.jsx
 *
 * Purpose:
 *   Page-level layout. Can optionally control sidebar mode (full vs. provisioning shell).
 *
 * Props:
 *   - children: page content rendered in the main area
 *   - showSidebar?: boolean (default true)
 *   - sidebarMode?: 'full' | 'provisioning' (default 'full')
 *   - collapsed?: boolean (optional) -> controls sidebar collapse when shown
 *   - onToggleCollapse?: () => void (optional) -> toggles sidebar collapse when shown
 */
import React from 'react';
import { Box } from '@mui/material';
import Sidebar from './Sidebar.jsx';

export default function AppLayout({
  children,
  showSidebar = true,
  sidebarMode = 'full',
  collapsed = false,
  onToggleCollapse,
}) {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: '#0A0A0A',
        color: '#fff',
        display: 'flex',
      }}
    >
      {showSidebar && (
        <Sidebar
          mode={sidebarMode}
          collapsed={collapsed}
          onToggleCollapse={onToggleCollapse ?? (() => {})}
        />
      )}

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
