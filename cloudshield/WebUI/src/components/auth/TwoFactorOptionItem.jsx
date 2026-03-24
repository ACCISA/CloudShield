/**
 * TwoFactorOptionItem.jsx
 *
 * Purpose:
 *   Visual option row for choosing a 2FA delivery method (SMS or Email).
 *
 * Props:
 *   - type: 'sms' | 'email' (affects left icon)
 *   - title: main title text
 *   - subtitle: secondary descriptive text (e.g. masked phone/email)
 *   - onClick: click handler
 */
import React from "react";
import { Box, Typography } from "@mui/material";
import SmsOutlinedIcon from "@mui/icons-material/SmsOutlined";
import MailOutlineOutlinedIcon from "@mui/icons-material/MailOutlineOutlined";
import ChevronRightOutlinedIcon from "@mui/icons-material/ChevronRightOutlined";
import { useThemeColors } from "../../hooks/useThemeColors.js";

/**
 * Clickable 2FA delivery method option (SMS or Email).
 * @param {Object} props
 * @param {('sms'|'email')} [props.type='sms'] - Type of 2FA method
 * @param {string} props.title - Main title text (e.g., "SMS")
 * @param {string} [props.subtitle] - Secondary text (e.g., masked phone/email)
 * @param {Function} props.onClick - Click handler
 * @returns {JSX.Element} Styled clickable option row
 */
export default function TwoFactorOptionItem({
  type = "sms",
  title,
  subtitle,
  onClick,
}) {
  const themeColors = useThemeColors();
  // Select the appropriate icon based on type
  const IconLeft = type === "sms" ? SmsOutlinedIcon : MailOutlineOutlinedIcon;

  const handleKeyDown = (e) => {
    if ((e.key === "Enter" || e.key === " ") && onClick) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <Box
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      sx={{
        width: "100%",
        backgroundColor: themeColors.inputBg,
        borderRadius: "12px",
        border: `1px solid ${themeColors.border}`,
        paddingY: "14px",
        paddingX: "16px",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        cursor: "pointer",
        mb: 2,
        "&:hover": {
          backgroundColor: themeColors.inputBgHover,
        },
      }}
    >
      <Box sx={{ display: "flex", gap: "12px" }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            color: themeColors.text,
            lineHeight: 0,
            pt: "2px",
          }}
        >
          <IconLeft fontSize="small" />
        </Box>

        <Box sx={{ display: "flex", flexDirection: "column" }}>
          <Typography
            sx={{
              color: themeColors.text,
              fontWeight: 500,
              fontSize: "1rem",
              lineHeight: 1.3,
            }}
          >
            {title}
          </Typography>
          {subtitle && (
            <Typography
              sx={{
                color: themeColors.textSecondary,
                fontSize: "0.9rem",
                lineHeight: 1.4,
              }}
            >
              {subtitle}
            </Typography>
          )}
        </Box>
      </Box>

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          color: themeColors.textSecondary,
          lineHeight: 0,
        }}
      >
        <ChevronRightOutlinedIcon />
      </Box>
    </Box>
  );
}
