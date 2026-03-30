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
import React from "react";
import { Box } from "@mui/material";
import Sidebar from "./Sidebar.jsx";

export default function AppLayout({
  children,
  showSidebar = true,
  sidebarMode = "full",
  collapsed = false,
  onToggleCollapse,
}) {
  return (
    <Box
      sx={{
        height: "100vh",
        maxHeight: "100vh",
        minWidth: "1280px",
        bgcolor: "background.default",
        color: "text.primary",
        display: "flex",
        overflow: "hidden",
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
          padding: "16px",
          height: "100vh",
          overflow: "auto",
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
