/**
 * TimeRangeSelector.jsx
 *
 * Purpose:
 *   Dropdown selector for choosing time range for alert analytics.
 *
 * Features:
 *   - Predefined time ranges (7 days, 14 days, 30 days, 90 days)
 *   - Dropdown with dark theme styling
 *   - Clean minimal design matching application aesthetic
 */
import React, { useState, useRef, useEffect } from "react";
import PropTypes from "prop-types";
import ChevronIcon from "../../assets/ChevronIcon";
import { useThemeColors } from "../../hooks/useThemeColors.js";

function TimeRangeSelector({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const themeColors = useThemeColors();

  const timeRanges = [
    { value: "7d", label: "Last 7 days" },
    { value: "14d", label: "Last 14 days" },
    { value: "30d", label: "Last 30 days" },
    { value: "90d", label: "Last 90 days" },
  ];

  const selectedLabel =
    timeRanges.find((range) => range.value === value)?.label || "Last 30 days";

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (rangeValue) => {
    onChange(rangeValue);
    setIsOpen(false);
  };

  const styles = {
    container: {
      position: "relative",
      display: "inline-block",
    },
    button: {
      backgroundColor: themeColors.lightOverlaySubtle,
      border: `1px solid ${themeColors.borderLight}`,
      borderRadius: "8px",
      padding: "8px 16px",
      fontSize: "13px",
      color: themeColors.text,
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: "8px",
      transition: "all 0.2s",
      minWidth: "140px",
      justifyContent: "space-between",
    },
    buttonHover: {
      backgroundColor: themeColors.bgHover,
      borderColor: themeColors.border,
    },
    dropdown: {
      position: "absolute",
      top: "calc(100% + 4px)",
      right: 0,
      backgroundColor: themeColors.bgSecondary,
      border: `1px solid ${themeColors.borderLight}`,
      borderRadius: "8px",
      minWidth: "100%",
      zIndex: 1000,
      overflow: "hidden",
      boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
    },
    option: {
      width: "100%",
      padding: "10px 16px",
      fontSize: "13px",
      color: themeColors.text,
      cursor: "pointer",
      transition: "background-color 0.15s",
      background: "none",
      border: "none",
      borderBottom: `1px solid ${themeColors.borderLight}`,
      textAlign: "left",
    },
    optionLast: {
      borderBottom: "none",
    },
    optionHover: {
      backgroundColor: themeColors.bgHover,
    },
    optionSelected: {
      backgroundColor: themeColors.lightOverlay,
      color: themeColors.text,
      fontWeight: "500",
    },
  };

  return (
    <div ref={dropdownRef} style={styles.container}>
      <button
        style={styles.button}
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = themeColors.bgHover;
          e.currentTarget.style.borderColor = themeColors.border;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = themeColors.lightOverlaySubtle;
          e.currentTarget.style.borderColor = themeColors.borderLight;
        }}
      >
        <span>{selectedLabel}</span>
        <ChevronIcon
          size={16}
          color="rgba(255,255,255,0.7)"
          rotation={isOpen ? 180 : 0}
        />
      </button>

      {isOpen && (
        <div style={styles.dropdown}>
          {timeRanges.map((range, index) => (
            <button
              key={range.value}
              type="button"
              style={{
                ...styles.option,
                ...(index === timeRanges.length - 1 ? styles.optionLast : {}),
                ...(range.value === value ? styles.optionSelected : {}),
              }}
              onClick={() => handleSelect(range.value)}
              onMouseEnter={(e) => {
                if (range.value !== value) {
                  Object.assign(e.currentTarget.style, styles.optionHover);
                }
              }}
              onMouseLeave={(e) => {
                if (range.value !== value) {
                  e.currentTarget.style.backgroundColor = "transparent";
                }
              }}
            >
              {range.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

TimeRangeSelector.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};

export default TimeRangeSelector;
