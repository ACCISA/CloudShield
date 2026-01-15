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
  Chip,
  IconButton,
  CircularProgress,
  Skeleton,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";

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
  changePercent,
  changeText,
  isPositiveChange = true,
  gradientFrom = "#6a5acd",
  gradientTo = "#9f7aea",
  loading = false,
  error,
  onAdd,
}) {
  // Generate change text from changePercent if not provided
  const displayChangeText = React.useMemo(() => {
    if (changeText) return changeText;
    if (changePercent !== undefined && changePercent !== null) {
      return `${Math.abs(changePercent)}%`;
    }
    return "15.2%"; // Default fallback for backward compatibility
  }, [changeText, changePercent]);

  // Determine if change is positive (for icon and default behavior)
  const isPositive = React.useMemo(() => {
    if (changePercent !== undefined && changePercent !== null) {
      return changePercent >= 0;
    }
    return isPositiveChange;
  }, [changePercent, isPositiveChange]);

  const ChangeIcon = isPositive ? TrendingUpIcon : TrendingDownIcon;

  return (
    <Box
      sx={{
        flex: {
          xs: "1 1 100%", // Full width on extra small screens
          sm: "1 1 calc(50% - 8px)", // Two cards per row on small screens
          md: "1 1 calc(33.333% - 11px)", // Three cards per row on medium screens
          lg: "1 1 calc(25% - 12px)", // Four cards per row on large screens, equal width
        },
        minWidth: {
          xs: "100%",
          sm: "200px",
          md: "220px",
          lg: "240px",
        },
        minHeight: {
          xs: "160px",
          sm: "180px",
          md: "200px",
          lg: "220px",
        },
        borderRadius: "16px",
        padding: {
          xs: "24px",
          sm: "28px",
          md: "32px",
        },
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
          color: "#fff",
        }}
      >
        <Typography
          sx={{
            color: "#fff",
            fontSize: {
              xs: "0.95rem",
              sm: "1rem",
              md: "1.05rem",
            },
            lineHeight: 1.3,
            fontWeight: 500,
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? (
            <Skeleton width={80} sx={{ bgcolor: "rgba(255,255,255,0.3)" }} />
          ) : (
            title
          )}
        </Typography>

        {onAdd && !loading && !error && (
          <IconButton
            size="small"
            onClick={onAdd}
            sx={{
              color: "#fff",
              backgroundColor: "rgba(255, 255, 255, 0.2)",
              borderRadius: "8px",
              width: {
                xs: 32,
                sm: 36,
              },
              height: {
                xs: 32,
                sm: 36,
              },
              "&:hover": {
                backgroundColor: "rgba(255, 255, 255, 0.3)",
              },
            }}
          >
            <AddIcon sx={{ fontSize: { xs: "1.1rem", sm: "1.25rem" } }} />
          </IconButton>
        )}
      </Box>

      {/* Big number */}
      <Typography
        sx={{
          color: "#fff",
          fontSize: {
            xs: "2.5rem",
            sm: "3rem",
            md: "3.5rem",
            lg: "4rem",
          },
          fontWeight: 600,
          lineHeight: 1,
          letterSpacing: "-0.02em",
          flex: 1,
          display: "flex",
          alignItems: "center",
        }}
      >
        {loading ? (
          <CircularProgress size={40} sx={{ color: "rgba(255,255,255,0.8)" }} />
        ) : error ? (
          "—"
        ) : (
          value
        )}
      </Typography>

      {/* Change chip */}
      {!error && (
        <Chip
          icon={
            !loading ? (
              <ChangeIcon sx={{ fontSize: "0.9rem !important" }} />
            ) : undefined
          }
          label={loading ? <Skeleton width={50} /> : displayChangeText}
          size="small"
          sx={{
            alignSelf: "flex-start",
            backgroundColor: "rgba(255, 255, 255, 0.95)",
            color: "#000",
            fontSize: {
              xs: "0.7rem",
              sm: "0.75rem",
            },
            fontWeight: 600,
            height: {
              xs: "26px",
              sm: "28px",
            },
            borderRadius: "8px",
            "& .MuiChip-icon": {
              color: isPositive ? "#10b981" : "#ef4444",
              marginLeft: "6px",
            },
            paddingX: "4px",
          }}
        />
      )}

      {/* Error message */}
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
