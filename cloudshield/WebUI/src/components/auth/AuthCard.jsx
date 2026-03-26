/**
 * AuthCard.jsx
 *
 * Purpose:
 *   Reusable card container for authentication screens (login / 2FA, etc.).
 *
 * Props:
 *   - children: React node(s) to render inside the card (form fields, buttons).
 *
 * Notes:
 *   - Pure presentational component using MUI Paper/Box for layout and styling.
 *   - Keep styling changes here small; place form logic in consuming pages/components.
 */
import React from "react";
import { Paper, Box, Typography } from "@mui/material";
import { useThemeColors } from "../../hooks/useThemeColors.js";

/**
 * AuthCard component wraps auth form content in a styled card container.
 * @param {Object} props
 * @param {React.ReactNode} props.children - Form elements to display inside card
 * @returns {JSX.Element} Styled Paper component with logo and footer
 */
export default function AuthCard({ children }) {
  const themeColors = useThemeColors();
  return (
    <Paper
      variant="rounded"
      sx={{
        width: "100%",
        maxWidth: 480,
        margin: "48px auto",
        backgroundColor: themeColors.surface,
        borderRadius: "20px",
        border: `1px solid ${themeColors.border}`,
        boxShadow: "0 24px 64px rgba(0,0,0,0.75)",
        padding: "48px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        color: themeColors.text,
      }}
    >
      {/* Logo block */}
      <Box sx={{ mb: 4, mt: 2 }}>
        {/* Replace this with your actual SVG logo */}
        <Box
          sx={{
            width: 64,
            height: 64,
            bgcolor: themeColors.text,
            color: themeColors.surface,
            borderRadius: "8px",
            fontWeight: 600,
            fontSize: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          LOGO
        </Box>
      </Box>

      <Box sx={{ width: "100%" }}>{children}</Box>

      {/* Footer links like "Can't log in?" / "Secure Login with 2FA" */}
      <Box
        sx={{
          width: "100%",
          textAlign: "center",
          mt: 6,
          color: themeColors.text,
        }}
      >
        <Typography
          sx={{
            color: themeColors.text,
            fontSize: "1rem",
            fontWeight: 500,
            textDecoration: "underline",
            mb: 2,
          }}
        >
          Can’t log in?
        </Typography>
        <Typography
          sx={{
            color: themeColors.textSecondary,
            fontSize: "0.9rem",
            mb: 1,
          }}
        >
          Secure Login with 2FA
        </Typography>
      </Box>
    </Paper>
  );
}
