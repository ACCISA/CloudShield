/**
 * Sidebar.jsx
 *
 * Purpose:
 *   Application navigation/sidebar used across the app layout. Supports collapsed state,
 *   navigation items, and small accordion previews for sections like Workstations or Users.
 *
 * Props:
 *   - mode: 'full' | 'provisioning'
 *       'full'          -> show normal nav
 *       'provisioning'  -> show top/company block + collapse button only (no tabs, no bottom actions)
 *   - collapsed: boolean to render compact collapsed sidebar
 *   - onToggleCollapse: callback to toggle collapse state
 *
 * Notes:
 *   - Uses react-router hooks (useNavigate/useLocation) for navigation; keep routing logic
 *     minimal here and handle heavier logic in pages or containers.
 */
import React, { useEffect, useState } from "react";
import { Box, Typography, IconButton, Chip, Divider } from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";

import DashboardIcon from "../../assets/NavBar/DashboardIcon";
import ShieldIcon from "../../assets/NavBar/shieldIcon.jsx";
import WorkstationsIcon from "../../assets/NavBar/WorkstationsIcon";
import UsersIcon from "../../assets/NavBar/UsersIcon";
import GroupsIcon from "../../assets/NavBar/GroupsIcon";
import FilesIcon from "../../assets/NavBar/FilesIcon";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import HelpOutlineOutlinedIcon from "@mui/icons-material/HelpOutlineOutlined";
import ConfirmationNumberOutlinedIcon from "@mui/icons-material/ConfirmationNumberOutlined";
import CloseFullscreenIcon from "@mui/icons-material/CloseFullscreen";
import OpenInFullIcon from "@mui/icons-material/OpenInFull";
import { apiGet } from "../../api/client";
import { useOrgMetrics } from "../../api/useOrgMetrics.js";

function NavItem({
  collapsed,
  icon,
  label,
  to,
  active,
  count,
  countColor,
  expanded,
  onToggleExpand,
  onNavigate,
}) {
  const showCountChip = typeof count === "number" || count === "-";

  return (
    <Box
      sx={{
        width: "100%",
        borderRadius: "10px",
        backgroundColor: active ? "#2a2a2a" : "transparent",
        color: "#fff",
      }}
    >
      <Box
        role="button"
        tabIndex={0}
        aria-label={label}
        onClick={onNavigate}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onNavigate?.();
          }
        }}
        sx={{
          cursor: "pointer",
          padding: collapsed ? "10px" : "10px 12px",
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "flex-start",
          borderRadius: "10px",
          "&:hover": { backgroundColor: "#2a2a2a" },
        }}
      >
        <Box
          sx={{
            width: 28,
            height: 28,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            mr: collapsed ? 0 : "10px",
          }}
        >
          {React.isValidElement(icon) && typeof icon.type === "function"
            ? React.cloneElement(icon, { selected: active })
            : icon}
        </Box>

        {!collapsed && (
          <Box
            sx={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              gap: "8px",
              minWidth: 0,
            }}
          >
            <Typography
              sx={{ fontSize: "0.95rem", fontWeight: 500, lineHeight: 1.3 }}
            >
              {label}
            </Typography>

            {showCountChip && (
              <Chip
                label={count}
                size="small"
                sx={{
                  height: "20px",
                  minWidth: "20px",
                  fontSize: "0.7rem",
                  fontWeight: 500,
                  borderRadius: "6px",
                  px: "4px",
                  lineHeight: 1.2,
                  color: "#fff",
                  backgroundColor: countColor || "#444",
                }}
              />
            )}
          </Box>
        )}

        {collapsed && showCountChip && (
          <Chip
            label={count}
            size="small"
            sx={{
              marginLeft: "auto",
              height: "20px",
              minWidth: "20px",
              fontSize: "0.7rem",
              fontWeight: 500,
              borderRadius: "6px",
              px: "4px",
              lineHeight: 1.2,
              color: "#fff",
              backgroundColor: countColor || "#444",
            }}
          />
        )}
      </Box>
    </Box>
  );
}

function AccordionGrid({ items }) {
  const navigate = useNavigate();
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 0.5,
        p: 0.75,
      }}
    >
      {items.map((it) => (
        <Box
          key={it.text}
          onClick={() => navigate(it.to)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) =>
            (e.key === "Enter" || e.key === " ") && navigate(it.to)
          }
          sx={{
            px: 1,
            py: 0.75,
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "0.85rem",
            color: "rgba(255,255,255,0.9)",
            "&:hover": { background: "rgba(255,255,255,0.06)" },
          }}
        >
          {it.text}
        </Box>
      ))}
    </Box>
  );
}

export default function Sidebar({
  mode = "full",
  collapsed,
  onToggleCollapse,
}) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const isActive = (path) =>
    pathname === path || pathname.startsWith(path + "/");

  // accordion open states
  const [open, setOpen] = useState({
    workstations: false,
    employees: false,
    groups: false,
    files: false,
  });
  
  const [me, setMe] = useState(null);            // { id, email, org_id, role }
  const [myOrg, setMyOrg] = useState(null);      // { id, name, ... }
  const [meErr, setMeErr] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const meRes = await apiGet("/users/me"); // expects { user: {...} }
        if (!mounted) return;
        setMe(meRes.user);

        // Only call org endpoint after we know we're authenticated
        // expects { organization: {...} }
        const orgRes = await apiGet("/organizations/me");
        if (!mounted) return;
        setMyOrg(orgRes.organization);
      } catch (e) {
        if (!mounted) return;
        setMeErr(e.message || "Failed to load user");
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);
  
  const { stats, loading: statsLoading } = useOrgMetrics();

  // colors for the little count pills (matching dashboard StatCard gradients)
  const usersPill = "#6a4fcf";
  const workstationPill = "#c94b4b";
  const groupsPill = "#2656d8";
  const sharesPill = "#c57a1c";

  const showNav = mode === "full";
  const showBottom = mode === "full";

  return (
    <Box
      sx={{
        width: collapsed ? 72 : 280,
        minWidth: collapsed ? 72 : 280,
        height: "100vh",
        maxHeight: "100vh",
        bgcolor: "#0F0F0F",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        borderRight: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "0 0 20px 20px",
        padding: collapsed ? "12px 8px" : "16px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* collapse button */}
      <Box
        sx={{
          position: "absolute",
          right: collapsed ? "8px" : "16px",
          top: collapsed ? "8px" : "16px",
        }}
      >
        <IconButton
          size="small"
          onClick={onToggleCollapse}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          sx={{
            backgroundColor: "#1f1f1f",
            borderRadius: "8px",
            border: "1px solid rgba(255,255,255,0.12)",
            color: "#fff",
            width: 28,
            height: 28,
            "&:hover": { backgroundColor: "#2a2a2a" },
          }}
        >
          {collapsed ? (
            <OpenInFullIcon sx={{ fontSize: "1rem" }} />
          ) : (
            <CloseFullscreenIcon sx={{ fontSize: "1rem" }} />
          )}
        </IconButton>
      </Box>

      {/* Company block (clickable org switcher) */}
      <Box
        role="button"
        tabIndex={0}
        aria-label="Switch company"
        onClick={() => showNav && navigate("/organizations")}
        onKeyDown={(e) =>
          (e.key === "Enter" || e.key === " ") &&
          showNav &&
          navigate("/organizations")
        }
        sx={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: collapsed ? "center" : "flex-start",
          gap: collapsed ? "0px" : "12px",
          paddingRight: collapsed ? 0 : "48px",
          paddingTop: "40px",
          paddingBottom: "16px",
          cursor: showNav ? "pointer" : "default",
        }}
      >
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: "999px",
            flexShrink: 0,
            background:
              "radial-gradient(circle at 30% 30%, #b9ff9f 0%, #4b5b3a 70%)",
            border: "2px solid #fff",
            position: "relative",
          }}
        >
          <Box
            sx={{
              position: "absolute",
              right: -2,
              bottom: -2,
              width: 8,
              height: 8,
              borderRadius: "999px",
              backgroundColor: "#5aff3d",
              border: "2px solid #0F0F0F",
            }}
          />
        </Box>

        {!collapsed && (
          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                width: "100%",
              }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  sx={{
                    color: "#fff",
                    fontSize: "1rem",
                    fontWeight: 600,
                    lineHeight: 1.3,
                  }}
                >
                  {myOrg?.name || "Company Inc."}
                </Typography>
                <Typography
                  sx={{
                    color: "rgba(255,255,255,0.7)",
                    fontSize: "0.8rem",
                    lineHeight: 1.3,
                    wordBreak: "break-all",
                  }}
                >
                  {me?.email || "admin@company.com"}
                </Typography>
              </Box>
            </Box>
          </Box>
        )}
      </Box>

      <Divider sx={{ borderColor: "rgba(255,255,255,0.18)", mb: 2 }} />

      {/* Navigation + accordions (hidden in provisioning mode) */}
      {showNav ? (
        <Box
          sx={{
            flexGrow: 1,
            display: "flex",
            flexDirection: "column",
            gap: "6px",
            overflowY: "auto",
            overflowX: "hidden",
            overscrollBehavior: "contain",
            minHeight: 0,
          }}
        >
          <NavItem
            collapsed={collapsed}
            icon={<DashboardIcon width={20} height={20} />}
            label="Dashboard"
            to="/dashboard"
            active={isActive("/dashboard")}
            onNavigate={() => navigate("/dashboard")}
          />

          <NavItem
            collapsed={collapsed}
            icon={<ShieldIcon width={20} height={20} />}
            label="Security dashboard"
            to="/security-dashboard"
            active={isActive("/security-dashboard")}
            onNavigate={() => navigate("/security-dashboard")}
          />

          <NavItem
            collapsed={collapsed}
            icon={<WorkstationsIcon width={20} height={20} />}
            label="Workstations"
            to="/workstations"
            active={isActive("/workstations")}
            // count={collapsed ? undefined : 6}
            count={collapsed ? undefined : (stats.workstations ?? (statsLoading ? "…" : 0))}
            countColor={workstationPill}
            expanded={open.workstations}
            onToggleExpand={() =>
              setOpen((s) => ({ ...s, workstations: !s.workstations }))
            }
            onNavigate={() => navigate("/workstations")}
          />
          <NavItem
            collapsed={collapsed}
            icon={<UsersIcon width={20} height={20} />}
            label="Employees"
            to="/employees"
            active={isActive("/employees") || isActive("/users")}
            // count={collapsed ? undefined : 6}
            count={collapsed ? undefined : (stats.users ?? (statsLoading ? "…" : 0))}
            countColor={usersPill}
            expanded={open.employees}
            onToggleExpand={() =>
              setOpen((s) => ({ ...s, employees: !s.employees }))
            }
            onNavigate={() => navigate("/employees")}
          />
          <NavItem
            collapsed={collapsed}
            icon={
              <GroupsIcon
                width={20}
                height={20}
                selected={isActive("/groups")}
              />
            }
            label="Groups"
            to="/groups"
            active={isActive("/groups")}
            // count={collapsed ? undefined : 6}
            count={collapsed ? undefined : (stats.groups ?? (statsLoading ? "…" : 0))}
            countColor={groupsPill}
            expanded={open.groups}
            onToggleExpand={() => setOpen((s) => ({ ...s, groups: !s.groups }))}
            onNavigate={() => navigate("/groups")}
          />
          <NavItem
            collapsed={collapsed}
            icon={<FilesIcon width={20} height={20} />}
            label="Shares"
            to="/files"
            active={isActive("/files")}
            count={
              collapsed
                ? undefined
                : statsLoading
                  ? undefined
                  : stats.shares === 0
                    ? "-"
                    : (stats.shares ?? 0)
            }
            countColor={sharesPill}
            expanded={open.files}
            onToggleExpand={() => setOpen((s) => ({ ...s, files: !s.files }))}
            onNavigate={() => navigate("/files")}
          />
        </Box>
      ) : (
        // Provisioning mode filler to push bottom area down nicely
        <Box sx={{ flexGrow: 1 }} />
      )}

      <Divider sx={{ borderColor: "rgba(255,255,255,0.18)", mt: 2, mb: 2 }} />

      {/* Bottom actions (hidden in provisioning mode) */}
      {showBottom ? (
        <Box
          sx={{
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            pb: "16px",
          }}
        >
          
          <Box
            role="button"
            tabIndex={0}
            aria-label="Settings"
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: collapsed ? "center" : "flex-start",
              color: "#fff",
              fontSize: "0.9rem",
              fontWeight: 500,
              cursor: "pointer",
              borderRadius: "8px",
              padding: collapsed ? "8px" : "8px 12px",
              "&:hover": { backgroundColor: "#2a2a2a" },
            }}
            onClick={() => navigate("/settings")}
            onKeyDown={(e) =>
              (e.key === "Enter" || e.key === " ") && navigate("/settings")
            }
          >
            <Box
              sx={{
                width: 28,
                height: 28,
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                mr: collapsed ? 0 : "10px",
              }}
            >
              <SettingsOutlinedIcon sx={{ fontSize: "1.1rem" }} />
            </Box>
            {!collapsed && (
              <Typography sx={{ fontSize: "0.9rem", fontWeight: 500 }}>
                Settings
              </Typography>
            )}
          </Box>
          <Box
            role="button"
            tabIndex={0}
            aria-label="Tickets"
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: collapsed ? "center" : "flex-start",
              color: "#fff",
              fontSize: "0.9rem",
              fontWeight: 500,
              cursor: "pointer",
              borderRadius: "8px",
              padding: collapsed ? "8px" : "8px 12px",
              "&:hover": { backgroundColor: "#2a2a2a" },
            }}
            onClick={() => navigate("/tickets")}
            onKeyDown={(e) =>
              (e.key === "Enter" || e.key === " ") && navigate("/tickets")
            }
          >
            <Box
              sx={{
                width: 28,
                height: 28,
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                mr: collapsed ? 0 : "10px",
              }}
            >
              <ConfirmationNumberOutlinedIcon sx={{ fontSize: "1.1rem" }} />
            </Box>
            {!collapsed && (
              <Typography sx={{ fontSize: "0.9rem", fontWeight: 500 }}>
                Tickets
              </Typography>
            )}
          </Box>
          <Box
            role="button"
            tabIndex={0}
            aria-label="Get support"
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: collapsed ? "center" : "flex-start",
              color: "#fff",
              fontSize: "0.9rem",
              fontWeight: 500,
              cursor: "pointer",
              borderRadius: "8px",
              padding: collapsed ? "8px" : "8px 12px",
              "&:hover": { backgroundColor: "#2a2a2a" },
            }}
            onClick={() => navigate("/support")}
            onKeyDown={(e) =>
              (e.key === "Enter" || e.key === " ") && navigate("/support")
            }
          >
            <Box
              sx={{
                width: 28,
                height: 28,
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                mr: collapsed ? 0 : "10px",
              }}
            >
              <HelpOutlineOutlinedIcon sx={{ fontSize: "1.1rem" }} />
            </Box>
            {!collapsed && (
              <Typography sx={{ fontSize: "0.9rem", fontWeight: 500 }}>
                Get support
              </Typography>
            )}
          </Box>
        </Box>
      ) : null}
    </Box>
  );
}

export { NavItem, AccordionGrid };