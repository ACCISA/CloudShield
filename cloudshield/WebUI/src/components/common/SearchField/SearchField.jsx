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

// Search icon SVG component
const SearchIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ color: "rgba(255,255,255,0.5)", marginRight: "8px" }}
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
  value,
  onChange,
  placeholder = "Search...",
  width = "360px",
  fullWidthMobile = true,
  debounceMs = 0,
  showIcon = true,
  style = {},
}) {
  const [localValue, setLocalValue] = useState(value);
  const [isFocused, setIsFocused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

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

  // Check if mobile (simplified without MUI)
  const isMobile = window.innerWidth < 600;

  // Calculate responsive width
  const getWidth = () => {
    if (isMobile && fullWidthMobile) {
      return "100%";
    }
    return width;
  };

  // Dynamic styles based on state
  const containerStyle = {
    display: "flex",
    alignItems: "center",
    width: getWidth(),
    backgroundColor: isFocused ? "#242424" : isHovered ? "#242424" : "#1a1a1a",
    borderRadius: "8px",
    border: isFocused
      ? "1px solid rgba(255,255,255,0.2)"
      : isHovered
      ? "1px solid rgba(255,255,255,0.2)"
      : "1px solid rgba(255,255,255,0.1)",
    padding: "12px 24px",
    height: "48px",
    boxSizing: "border-box",
    transition: "all 0.2s ease",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
    ...style,
  };

  const inputStyle = {
    flex: 1,
    backgroundColor: "transparent",
    border: "none",
    outline: "none",
    color: "#fff",
    fontSize: "16px",
    fontWeight: "500",
    fontFamily: "inherit",
  };

  return (
    <div
      style={containerStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {showIcon && <SearchIcon />}
      <input
        type="text"
        value={debounceMs === 0 ? value : localValue}
        onChange={handleChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        style={inputStyle}
      />
    </div>
  );
}
