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
import PropTypes from "prop-types";
import { Box, Typography, IconButton, Chip, Divider } from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";
import { useThemeColors } from "../../hooks/useThemeColors.js";

import DashboardIcon from "../../assets/NavBar/DashboardIcon";
import ShieldIcon from "../../assets/NavBar/shieldIcon.jsx";
import WorkstationsIcon from "../../assets/NavBar/WorkstationsIcon";
import UsersIcon from "../../assets/NavBar/UsersIcon";
import GroupsIcon from "../../assets/NavBar/GroupsIcon";
import FilesIcon from "../../assets/NavBar/FilesIcon";
import SidebarCollapseIcon from "../../assets/NavBar/SidebarCollapseIcon.jsx";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";
import ConfirmationNumberOutlinedIcon from "@mui/icons-material/ConfirmationNumberOutlined";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import { apiGet } from "../../api/client";
import { useOrgMetrics } from "../../api/useOrgMetrics.js";
import { useAuth } from "../../context/AuthContext.jsx";

const navStatsShape = PropTypes.shape({
  workstations: PropTypes.number,
  users: PropTypes.number,
  groups: PropTypes.number,
  shares: PropTypes.number,
});

function NavItem({
  collapsed,
  icon,
  label,
  active,
  count,
  countColor,
  onNavigate,
}) {
  const themeColors = useThemeColors();
  const showCountChip = typeof count === "number" || count === "-";
  const renderedIcon =
    React.isValidElement(icon) && typeof icon.type === "function"
      ? React.cloneElement(icon, { selected: active })
      : icon;

  return (
    <Box
      sx={{
        width: "100%",
        borderRadius: "10px",
        backgroundColor: active ? themeColors.lightOverlay : "transparent",
        color: themeColors.textPrimary,
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
          "&:hover": { backgroundColor: themeColors.lightOverlay },
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
          {renderedIcon}
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
                  color: "var(--text-primary)",
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
  const themeColors = useThemeColors();
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
            color: themeColors.textPrimary,
            "&:hover": { background: themeColors.lightOverlaySubtle },
          }}
        >
          {it.text}
        </Box>
      ))}
    </Box>
  );
}

function CompanySwitcher({ collapsed, showNav, navigate, myOrg, me }) {
  const themeColors = useThemeColors();
  const handleCompanyNavigate = () => {
    if (!showNav) return;
    navigate("/organizations");
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      handleCompanyNavigate();
    }
  };

  return (
    <Box
      role="button"
      tabIndex={0}
      aria-label="Switch company"
      onClick={handleCompanyNavigate}
      onKeyDown={onKeyDown}
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
          borderRadius: "10px",
          flexShrink: 0,
          backgroundColor:
            themeColors.lightOverlaySubtle || themeColors.lightOverlay,
          border: `1px solid ${themeColors.borderLight}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        <ShieldIcon
          width={18}
          height={18}
          selected
          className="company-shield-mark"
        />
        <Box
          sx={{
            position: "absolute",
            right: 6,
            bottom: 7,
            width: 7,
            height: 1.75,
            borderRadius: "999px",
            backgroundColor: themeColors.textPrimary,
            transform: "rotate(-38deg)",
            opacity: 0.9,
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
                  color: themeColors.textPrimary,
                  fontSize: "1rem",
                  fontWeight: 600,
                  lineHeight: 1.3,
                }}
              >
                {myOrg?.name || "Company Inc."}
              </Typography>
              <Typography
                sx={{
                  color: themeColors.textSecondary,
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
  );
}

function SidebarBottomAction({
  collapsed,
  label,
  ariaLabel,
  icon,
  onActivate,
}) {
  const themeColors = useThemeColors();
  const onKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      onActivate();
    }
  };

  return (
    <Box
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: collapsed ? "center" : "flex-start",
        color: themeColors.textPrimary,
        fontSize: "0.9rem",
        fontWeight: 500,
        cursor: "pointer",
        borderRadius: "8px",
        padding: collapsed ? "8px" : "8px 12px",
        "&:hover": { backgroundColor: themeColors.lightOverlay },
      }}
      onClick={onActivate}
      onKeyDown={onKeyDown}
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
        {icon}
      </Box>
      {!collapsed && (
        <Typography sx={{ fontSize: "0.9rem", fontWeight: 500 }}>
          {label}
        </Typography>
      )}
    </Box>
  );
}

function SidebarNavigation({
  collapsed,
  isActive,
  navigate,
  stats,
  statsLoading,
}) {
  const usersPill = "#6a4fcf";
  const workstationPill = "#c94b4b";
  const groupsPill = "#2656d8";
  const sharesPill = "#c57a1c";

  const getBadgeCount = (value) => {
    if (collapsed) return undefined;
    if (typeof value === "number") return value;
    if (statsLoading) return "…";
    return 0;
  };

  const getSharesCount = () => {
    if (collapsed || statsLoading) return undefined;
    return stats.shares ?? 0;
  };

  return (
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
        active={isActive("/dashboard")}
        onNavigate={() => navigate("/dashboard")}
      />

      <NavItem
        collapsed={collapsed}
        icon={<ShieldIcon width={20} height={20} />}
        label="Security dashboard"
        active={isActive("/security-dashboard")}
        onNavigate={() => navigate("/security-dashboard")}
      />

      <NavItem
        collapsed={collapsed}
        icon={<WorkstationsIcon width={20} height={20} />}
        label="Workstations"
        active={isActive("/workstations")}
        count={getBadgeCount(stats.workstations)}
        countColor={workstationPill}
        onNavigate={() => navigate("/workstations")}
      />

      <NavItem
        collapsed={collapsed}
        icon={<UsersIcon width={20} height={20} />}
        label="Employees"
        active={isActive("/employees") || isActive("/users")}
        count={getBadgeCount(stats.users)}
        countColor={usersPill}
        onNavigate={() => navigate("/employees")}
      />

      <NavItem
        collapsed={collapsed}
        icon={
          <GroupsIcon width={20} height={20} selected={isActive("/groups")} />
        }
        label="Groups"
        active={isActive("/groups")}
        count={getBadgeCount(stats.groups)}
        countColor={groupsPill}
        onNavigate={() => navigate("/groups")}
      />

      <NavItem
        collapsed={collapsed}
        icon={<FilesIcon width={20} height={20} />}
        label="Shares"
        active={isActive("/files")}
        count={getSharesCount()}
        countColor={sharesPill}
        onNavigate={() => navigate("/files")}
      />
    </Box>
  );
}

export default function Sidebar({
  mode = "full",
  collapsed,
  onToggleCollapse,
}) {
  const themeColors = useThemeColors();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { logout } = useAuth();
  const [signOutDialogOpen, setSignOutDialogOpen] = useState(false);
  const [isToggleAnimating, setIsToggleAnimating] = useState(false);

  const isActive = (path) =>
    pathname === path || pathname.startsWith(path + "/");

  const [me, setMe] = useState(null);
  const [myOrg, setMyOrg] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const meRes = await (await apiGet("/users/me")).json();
        if (!mounted) return;
        setMe(meRes.user);

        const orgRes = await (await apiGet("/organizations/me")).json();
        if (!mounted) return;
        setMyOrg(orgRes.organization);
      } catch {
        if (!mounted) return;
        setMe(null);
        setMyOrg(null);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const { stats, loading: statsLoading } = useOrgMetrics();

  const showNav = mode === "full";
  const showBottom = mode === "full";

  const handleSignOut = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const handleTogglePress = () => {
    setIsToggleAnimating(true);
    onToggleCollapse?.();
    window.setTimeout(() => setIsToggleAnimating(false), 180);
  };

  return (
    <Box
      sx={{
        width: collapsed ? 72 : 280,
        minWidth: collapsed ? 72 : 280,
        height: "100vh",
        maxHeight: "100vh",
        bgcolor: themeColors.bgPrimary,
        color: themeColors.textPrimary,
        display: "flex",
        flexDirection: "column",
        borderRight: `1px solid ${themeColors.borderLight}`,
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
          onClick={handleTogglePress}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          sx={{
            backgroundColor: themeColors.bgSecondary,
            borderRadius: "8px",
            border: `1px solid ${themeColors.border}`,
            color: themeColors.textPrimary,
            width: 28,
            height: 28,
            transition: "transform 0.14s ease, background-color 0.2s ease",
            "&:active": {
              transform: "scale(0.92)",
            },
            "&:hover": { backgroundColor: themeColors.lightOverlay },
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transform: collapsed ? "rotate(180deg)" : "none",
              transition: "transform 0.2s ease",
              animation: isToggleAnimating
                ? "sidebarTogglePulse 0.18s ease"
                : "none",
              "@keyframes sidebarTogglePulse": {
                "0%": {
                  transform: collapsed ? "rotate(180deg) scale(1)" : "scale(1)",
                },
                "50%": {
                  transform: collapsed
                    ? "rotate(180deg) scale(1.12)"
                    : "scale(1.12)",
                },
                "100%": {
                  transform: collapsed ? "rotate(180deg) scale(1)" : "scale(1)",
                },
              },
            }}
          >
            <SidebarCollapseIcon
              width={16}
              height={16}
              color={themeColors.textPrimary}
            />
          </Box>
        </IconButton>
      </Box>

      {/* Company block (clickable org switcher) */}
      <CompanySwitcher
        collapsed={collapsed}
        showNav={showNav}
        navigate={navigate}
        myOrg={myOrg}
        me={me}
      />

      <Divider sx={{ borderColor: themeColors.borderLight, mb: 2 }} />

      {/* Navigation + accordions (hidden in provisioning mode) */}
      {showNav ? (
        <SidebarNavigation
          collapsed={collapsed}
          isActive={isActive}
          navigate={navigate}
          stats={stats}
          statsLoading={statsLoading}
        />
      ) : (
        // Provisioning mode filler to push bottom area down nicely
        <Box sx={{ flexGrow: 1 }} />
      )}

      <Divider sx={{ borderColor: themeColors.border, mt: 2, mb: 2 }} />

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
          <SidebarBottomAction
            collapsed={collapsed}
            label="Settings"
            ariaLabel="Settings"
            icon={<SettingsOutlinedIcon sx={{ fontSize: "1.1rem" }} />}
            onActivate={() => navigate("/settings")}
          />
          <SidebarBottomAction
            collapsed={collapsed}
            label="Tickets"
            ariaLabel="Tickets"
            icon={
              <ConfirmationNumberOutlinedIcon sx={{ fontSize: "1.1rem" }} />
            }
            onActivate={() => navigate("/tickets")}
          />
          <SidebarBottomAction
            collapsed={collapsed}
            label="Sign out"
            ariaLabel="Sign out"
            icon={<LogoutOutlinedIcon sx={{ fontSize: "1.1rem" }} />}
            onActivate={() => setSignOutDialogOpen(true)}
          />
        </Box>
      ) : null}

      {signOutDialogOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="signout-modal-title"
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(4px)",
            display: "grid",
            placeItems: "center",
            zIndex: 1300,
            animation: "modalFade 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
          onClick={() => setSignOutDialogOpen(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setSignOutDialogOpen(false);
            }
          }}
        >
          <div
            style={{
              backgroundColor: "var(--bg-primary)",
              color: "var(--text-primary)",
              border: "1px solid var(--border-light)",
              borderRadius: "14px",
              width: "440px",
              maxWidth: "95vw",
              boxShadow: "0 24px 64px rgba(0, 0, 0, 0.75)",
              animation: "modalSlide 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            {/* Body */}
            <div style={{ padding: "24px" }}>
              <p
                style={{
                  margin: 0,
                  fontSize: "0.95rem",
                  lineHeight: 1.6,
                  color: "var(--text-primary)",
                }}
              >
                Are you sure you want to sign out? Any unsaved changes may be
                lost.
              </p>
              <div
                style={{
                  marginTop: "16px",
                  padding: "12px 16px",
                  backgroundColor: "rgba(251, 146, 60, 0.08)",
                  border: "1px solid rgba(251, 146, 60, 0.2)",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <WarningAmberRoundedIcon
                  sx={{ fontSize: "1.2rem", color: "#fb923c" }}
                />
                <span
                  style={{
                    fontSize: "0.85rem",
                    color: "var(--text-primary)",
                    lineHeight: 1.5,
                  }}
                >
                  You'll need to log in again to access your account.
                </span>
              </div>
            </div>

            {/* Footer */}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "12px",
                padding: "16px 24px",
                borderTop: "1px solid var(--border-light)",
              }}
            >
              <button
                onClick={() => setSignOutDialogOpen(false)}
                style={{
                  padding: "14px 24px",
                  fontSize: "1rem",
                  fontWeight: 500,
                  borderRadius: "14px",
                  border: "1px solid var(--border)",
                  backgroundColor: "transparent",
                  color: "var(--text-primary)",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  fontFamily: "inherit",
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = "var(--action-hover)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = "transparent";
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setSignOutDialogOpen(false);
                  handleSignOut();
                }}
                style={{
                  padding: "14px 24px",
                  fontSize: "1rem",
                  fontWeight: 500,
                  borderRadius: "14px",
                  border: "none",
                  backgroundColor: themeColors.primary,
                  color: themeColors.primaryText,
                  cursor: "pointer",
                  transition: "all 0.2s",
                  fontFamily: "inherit",
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = themeColors.primaryHover;
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = themeColors.primary;
                }}
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </Box>
  );
}

export { NavItem, AccordionGrid };

NavItem.propTypes = {
  collapsed: PropTypes.bool,
  icon: PropTypes.element.isRequired,
  label: PropTypes.string.isRequired,
  active: PropTypes.bool,
  count: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  countColor: PropTypes.string,
  onNavigate: PropTypes.func,
};

AccordionGrid.propTypes = {
  items: PropTypes.arrayOf(
    PropTypes.shape({
      text: PropTypes.string.isRequired,
      to: PropTypes.string.isRequired,
    }),
  ).isRequired,
};

CompanySwitcher.propTypes = {
  collapsed: PropTypes.bool,
  showNav: PropTypes.bool,
  navigate: PropTypes.func.isRequired,
  myOrg: PropTypes.shape({
    name: PropTypes.string,
  }),
  me: PropTypes.shape({
    email: PropTypes.string,
  }),
};

SidebarBottomAction.propTypes = {
  collapsed: PropTypes.bool,
  label: PropTypes.string.isRequired,
  ariaLabel: PropTypes.string.isRequired,
  icon: PropTypes.element.isRequired,
  onActivate: PropTypes.func.isRequired,
};

SidebarNavigation.propTypes = {
  collapsed: PropTypes.bool,
  isActive: PropTypes.func.isRequired,
  navigate: PropTypes.func.isRequired,
  stats: navStatsShape,
  statsLoading: PropTypes.bool,
};

Sidebar.propTypes = {
  mode: PropTypes.oneOf(["full", "provisioning"]),
  collapsed: PropTypes.bool,
  onToggleCollapse: PropTypes.func,
};
