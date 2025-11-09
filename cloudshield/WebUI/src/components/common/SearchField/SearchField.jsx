/**
 * SearchField.jsx
 *
 * Purpose:
 *   Reusable search input component that can be used across different pages
 *   for searching activities, workstations, users, groups, files, etc.
 *
 * Features:
 *   - Customizable placeholder text
 *   - Adjustable width (fixed or responsive)
 *   - Optional search icon
 *   - Debounced search for performance
 *   - Custom onChange handler
 *   - Fully styled to match application theme
 */
import React, { useState, useEffect, useCallback } from "react";
import { OutlinedInput, useMediaQuery, useTheme } from "@mui/material";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";

/**
 * SearchField Component
 *
 * @param {string} value - Current search value (controlled component)
 * @param {Function} onChange - Callback when search value changes: (value: string) => void
 * @param {string} placeholder - Placeholder text (default: "Search...")
 * @param {string|number} width - Width of the search field (default: "360px")
 * @param {boolean} fullWidthMobile - Make full width on mobile (default: true)
 * @param {number} debounceMs - Debounce delay in milliseconds (default: 0, no debounce)
 * @param {boolean} showIcon - Show search icon (default: true)
 * @param {object} sx - Additional MUI sx styles to override defaults
 * @returns {JSX.Element} Styled search input field
 */
export default function SearchField({
  value,
  onChange,
  placeholder = "Search...",
  width = "360px",
  fullWidthMobile = true,
  debounceMs = 0,
  showIcon = true,
  sx = {},
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [localValue, setLocalValue] = useState(value);

  // Sync local value with prop value
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Debounced onChange handler
  useEffect(() => {
    if (debounceMs === 0) return;

    const timer = setTimeout(() => {
      if (localValue !== value) {
        onChange(localValue);
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [localValue, debounceMs, onChange, value]);

  // Handle input change
  const handleChange = useCallback(
    (e) => {
      const newValue = e.target.value;
      setLocalValue(newValue);

      // If no debounce, call onChange immediately
      if (debounceMs === 0) {
        onChange(newValue);
      }
    },
    [debounceMs, onChange]
  );

  // Calculate responsive width
  const getWidth = () => {
    if (isMobile && fullWidthMobile) {
      return "100%";
    }
    return width;
  };

  return (
    <OutlinedInput
      value={debounceMs === 0 ? value : localValue}
      onChange={handleChange}
      placeholder={placeholder}
      startAdornment={
        showIcon ? (
          <SearchOutlinedIcon
            sx={{
              color: "rgba(255,255,255,0.5)",
              fontSize: "1.1rem",
              mr: "8px",
            }}
          />
        ) : null
      }
      sx={{
        width: getWidth(),
        backgroundColor: "#0f0f0f",
        borderRadius: "8px",
        color: "#fff",
        fontSize: "0.875rem",
        border: "1px solid rgba(255,255,255,0.15)",
        "& .MuiOutlinedInput-notchedOutline": {
          border: "none",
        },
        "& input": {
          padding: "10px 0",
        },
        "&:hover": {
          backgroundColor: "#141414",
          borderColor: "rgba(255,255,255,0.2)",
        },
        "&.Mui-focused": {
          backgroundColor: "#141414",
          borderColor: "rgba(255,255,255,0.3)",
        },
        ...sx, // Allow custom styles to override defaults
      }}
    />
  );
}
