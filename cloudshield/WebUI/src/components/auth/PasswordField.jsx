/**
 * PasswordField.jsx
 *
 * Purpose:
 *   Password input with a show/hide toggle and accessory label. Used on auth screens.
 *
 * Props:
 *   - label: string label shown above the input (default: 'Password')
 *   - value: current password value
 *   - onChange: change handler (e) => void
 */
import React, { useState } from "react";
import { Box, Typography, OutlinedInput, IconButton } from "@mui/material";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";

/**
 * Password input field with show/hide toggle.
 * @param {Object} props
 * @param {string} [props.label='Password'] - Label text
 * @param {string} props.value - Current password value
 * @param {Function} props.onChange - Change handler
 * @returns {JSX.Element} Password input with visibility toggle
 */
export default function PasswordField({
  label = "Password",
  value,
  onChange,
  onKeyDown,
}) {
  // Track whether password is visible or hidden
  const [show, setShow] = useState(false);

  const handleToggle = () => setShow(!show);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleToggle();
    }
  };

  return (
    <Box sx={{ width: "100%", mb: 3 }}>
      <Typography
        sx={{
          color: "#fff",
          fontSize: "0.9rem",
          fontWeight: 500,
          mb: "6px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          lineHeight: 1.2,
        }}
      >
        <span>{label}</span>
        {/* in your screenshot, "Hide" text + eye icon appears on the same row as label */}
        <Box
          component="span"
          sx={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            color: "#fff",
            fontSize: "0.9rem",
            fontWeight: 400,
            opacity: 0.8,
            cursor: "pointer",
          }}
          onClick={handleToggle}
          onKeyDown={handleKeyDown}
          role="button"
          tabIndex={0}
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? "Hide" : "Show"}
          <IconButton
            onClick={handleToggle}
            size="small"
            sx={{
              color: "#fff",
              p: 0,
            }}
          >
            {show ? (
              <VisibilityOffOutlinedIcon fontSize="small" />
            ) : (
              <VisibilityOutlinedIcon fontSize="small" />
            )}
          </IconButton>
        </Box>
      </Typography>

      <OutlinedInput
        type={show ? "text" : "password"}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        sx={{
          width: "100%",
          backgroundColor: "#161616",
          borderRadius: "8px",
          color: "#fff",
          fontSize: "0.95rem",
          lineHeight: 1.3,
          border: "1px solid rgba(255,255,255,0.18)",
          paddingY: "12px",
          paddingX: "12px",
          "& .MuiOutlinedInput-notchedOutline": {
            border: "none",
          },
          "&:hover": {
            backgroundColor: "#1a1a1a",
          },
          "&.Mui-focused": {
            outline: "2px solid rgba(255,255,255,0.4)",
            outlineOffset: "0px",
          },
          "& input": {
            padding: 0,
            letterSpacing: "0.15em", // like password dots feel tighter
          },
        }}
      />
    </Box>
  );
}
