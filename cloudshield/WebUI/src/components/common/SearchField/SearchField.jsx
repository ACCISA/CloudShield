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
import { OutlinedInput, InputAdornment } from "@mui/material";

// Search icon SVG component
const SearchIcon = () => (
  <svg
    data-testid="SearchOutlinedIcon"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ color: "rgba(255,255,255,0.5)" }}
  >
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.35-4.35" />
  </svg>
);

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
 * @param {object} style - Additional inline styles to override defaults
 * @returns {JSX.Element} Styled search input field
 */
export default function SearchField({
  value = "",
  onChange,
  placeholder = "Search...",
  width = "360px",
  fullWidthMobile = true,
  debounceMs = 0,
  showIcon = true,
  sx = {},
  onKeyDown,
}) {
  const [localValue, setLocalValue] = useState(value);
  // Sync local value with prop value
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Debounced onChange handler
  useEffect(() => {
    if (debounceMs === 0 || !onChange) return;

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
      if (debounceMs === 0 && onChange) {
        onChange(newValue);
      }
    },
    [debounceMs, onChange]
  );

  // Check if mobile (simplified without MUI)
  const isMobile = typeof window !== "undefined" && window.innerWidth < 600;

  // Calculate responsive width
  const getWidth = () => {
    if (isMobile && fullWidthMobile) {
      return "100%";
    }
    return width;
  };

  const baseStyles = {
    width: getWidth(),
    height: "48px",
    backgroundColor: "#1a1a1a",
    borderRadius: "8px",
    borderColor: "rgba(255,255,255,0.1)",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
    transition: "all 0.2s ease",
    color: "#fff",
    fontSize: "16px",
    fontWeight: 500,
    px: 3,
    py: 0,
    display: "flex",
    alignItems: "center",
    "&:hover": {
      backgroundColor: "#242424",
      borderColor: "rgba(255,255,255,0.2)",
    },
    "&.Mui-focused": {
      backgroundColor: "#242424",
      borderColor: "rgba(255,255,255,0.2)",
    },
  };

  const spinnerProps = {}; // placeholder if we ever need inlined spinner props

  return (
    <OutlinedInput
      className="MuiOutlinedInput-root"
      value={debounceMs === 0 ? value ?? "" : localValue ?? ""}
      onChange={handleChange}
      placeholder={placeholder}
      startAdornment={
        showIcon ? (
          <InputAdornment position="start" sx={{ mr: 1 }}>
            <SearchIcon />
          </InputAdornment>
        ) : null
      }
      onKeyDown={onKeyDown}
      inputProps={{ "aria-label": placeholder }}
      sx={{
        ...baseStyles,
        "& fieldset": { border: "none" },
        ...sx,
      }}
      {...spinnerProps}
    />
  );
}
