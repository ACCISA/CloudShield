/**
 * StatCard.jsx
 *
 * Purpose:
 *   Dashboard statistic card showing a metric, value and change chip.
 *   Responsive design with loading and error states for backend integration.
 *
 * Props:
 *   - title: metric title
 *   - value: displayed value
 *   - changePercent: percentage change value (number)
 *   - changeText: optional custom change indicator text (overrides changePercent)
 *   - isPositiveChange: whether the change is positive (affects arrow direction)
 *   - gradientFrom/gradientTo: background gradient colors
 *   - loading: shows loading state
 *   - error: error message to display
 *   - onAdd: callback when add button is clicked
 */
import React from "react";
import {
  Box,
  Typography,
  IconButton,
  CircularProgress,
  Skeleton,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { useThemeColors } from "../../hooks/useThemeColors.js";

/**
 * Dashboard statistic card showing a metric value with gradient background.
 * Supports loading states, error handling, and responsive design.
 *
 * @param {Object} props
 * @param {string} props.title - Metric title
 * @param {string|number} props.value - Displayed metric value
 * @param {number} [props.changePercent] - Percentage change (e.g., 15.2)
 * @param {string} [props.changeText] - Custom change text (overrides changePercent)
 * @param {boolean} [props.isPositiveChange=true] - Whether change is positive
 * @param {string} [props.gradientFrom='#6a5acd'] - Gradient start color
 * @param {string} [props.gradientTo='#9f7aea'] - Gradient end color
 * @param {boolean} [props.loading=false] - Show loading state
 * @param {string} [props.error] - Error message to display
 * @param {Function} [props.onAdd] - Callback when add button is clicked
 * @returns {JSX.Element} Styled stat card
 */
export default function StatCard({
  title,
  value,
  gradientFrom = "#6a5acd",
  gradientTo = "#9f7aea",
  loading = false,
  error,
  onAdd,
}) {
  const themeColors = useThemeColors();
  return (
    <Box
      sx={{
        flex: "1 1 calc(25% - 12px)",
        minWidth: "240px",
        minHeight: "220px",
        borderRadius: "16px",
        padding: "32px",
        background: error
          ? "linear-gradient(135deg, #e53e3e 0%, #fc8181 100%)"
          : `linear-gradient(135deg, ${gradientFrom} 0%, ${gradientTo} 100%)`,
        color: "#fff",
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)",
        display: "flex",
        flexDirection: "column",
        gap: "20px",
        position: "relative",
        overflow: "hidden",
        transition: "transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out",
      }}
    >
      {/* Header row: title + plus */}
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          color: themeColors.text,
        }}
      >
        <Typography
          sx={{
            color: themeColors.text,
            fontSize: "1.05rem",
            lineHeight: 1.3,
            fontWeight: 500,
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? (
            <Skeleton width={80} sx={{ bgcolor: themeColors.bgHover }} />
          ) : (
            title
          )}
        </Typography>

        {onAdd && !loading && !error && (
          <IconButton
            size="small"
            onClick={onAdd}
            sx={{
              color: themeColors.text,
              backgroundColor: themeColors.bgHover,
              borderRadius: "8px",
              width: 36,
              height: 36,
              "&:hover": {
                backgroundColor: themeColors.lightOverlaySubtle,
              },
            }}
          >
            <AddIcon sx={{ fontSize: "1.25rem" }} />
          </IconButton>
        )}
      </Box>

      {/* Big number */}
      <Typography
        sx={{
          color: themeColors.text,
          fontSize: "4rem",
          fontWeight: 600,
          lineHeight: 1,
          letterSpacing: "-0.02em",
          flex: 1,
          display: "flex",
          alignItems: "center",
        }}
      >
        {loading ? (
          <CircularProgress
            size={40}
            sx={{ color: themeColors.textSecondary }}
          />
        ) : error ? (
          "—"
        ) : (
          value
        )}
      </Typography>

      {error && (
        <Typography
          sx={{
            color: "rgba(255, 255, 255, 0.9)",
            fontSize: "0.75rem",
            fontWeight: 400,
            marginTop: "-8px",
          }}
        >
          {error}
        </Typography>
      )}
    </Box>
  );
}
