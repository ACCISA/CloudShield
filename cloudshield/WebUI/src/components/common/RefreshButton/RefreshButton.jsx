/**
 * RefreshButton.jsx
 *
 * Purpose:
 *   Reusable refresh button component that can be used across different pages
 *   for refreshing activities, workstations, users, groups, files, etc.
 *
 * Features:
 *   - Shows loading spinner when refreshing
 *   - Disabled state during loading
 *   - Customizable size and styling
 *   - Responsive design (full width on mobile optional)
 *   - Consistent theming across the app
 *   - Optional tooltip text
 */
import React from "react";
import {
  IconButton,
  CircularProgress,
  Tooltip,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import RefreshOutlinedIcon from "@mui/icons-material/RefreshOutlined";

/**
 * RefreshButton Component
 *
 * @param {Function} onClick - Callback when button is clicked: () => void or async () => void
 * @param {boolean} loading - Whether data is currently being refreshed
 * @param {boolean} disabled - Additional disabled state (default: false)
 * @param {string} size - Button size: "small" | "medium" | "large" (default: "small")
 * @param {boolean} fullWidthMobile - Make full width on mobile (default: true)
 * @param {string} tooltip - Tooltip text (default: "Refresh")
 * @param {object} sx - Additional MUI sx styles to override defaults
 * @returns {JSX.Element} Styled refresh button
 */
export default function RefreshButton({
  onClick,
  loading = false,
  disabled = false,
  size = "small",
  fullWidthMobile = true,
  tooltip = "Refresh",
  sx = {},
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // Determine button dimensions based on size
  const getSize = () => {
    if (isMobile && fullWidthMobile) {
      return { width: "100%", height: 44 };
    }

    switch (size) {
      case "large":
        return { width: 48, height: 48 };
      case "medium":
        return { width: 44, height: 44 };
      case "small":
      default:
        return { width: 44, height: 44 };
    }
  };

  // Determine spinner size based on button size
  const getSpinnerSize = () => {
    switch (size) {
      case "large":
        return 24;
      case "medium":
        return 20;
      case "small":
      default:
        return 20;
    }
  };

  const buttonContent = (
    <IconButton
      onClick={onClick}
      disabled={disabled || loading}
      size={size}
      sx={{
        ...getSize(),
        color: "#fff",

        borderRadius: "24px",

        "&:hover": {
          backgroundColor: "#141414",
          borderColor: "rgba(255,255,255,0.2)",
        },
        "&:disabled": {
          color: "rgba(255,255,255,0.3)",
          backgroundColor: "#0f0f0f",
        },
        ...sx, // Allow custom styles to override defaults
      }}
    >
      {loading ? (
        <CircularProgress size={getSpinnerSize()} sx={{ color: "#fff" }} />
      ) : (
        <RefreshOutlinedIcon sx={{ fontSize: "1.25rem" }} />
      )}
    </IconButton>
  );

  // Wrap with tooltip if provided and not loading
  if (tooltip && !loading) {
    return (
      <Tooltip title={tooltip} arrow>
        {buttonContent}
      </Tooltip>
    );
  }

  return buttonContent;
}
