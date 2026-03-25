import React from "react";

const styles = {
  container: {
    display: "inline-flex",
    alignItems: "center",
    cursor: "pointer",
  },
  checkbox: {
    width: "18px",
    height: "18px",
    border: "2px solid rgba(255, 255, 255, 0.5)",
    borderRadius: "4px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    transition: "all 0.2s ease",
    cursor: "pointer",
    boxSizing: "border-box",
  },
  checkboxChecked: {
    backgroundColor: "var(--text-primary)",
    border: "2px solid #fff",
  },
  checkmark: {
    width: "10px",
    height: "10px",
    color: "#000",
  },
};

export default function Checkbox({
  checked = false,
  indeterminate = false,
  onChange,
  disabled = false,
  style = {},
}) {
  const handleClick = () => {
    if (!disabled && onChange) {
      onChange(!checked);
    }
  };

  const handleKeyDown = (e) => {
    if ((e.key === "Enter" || e.key === " ") && !disabled && onChange) {
      e.preventDefault();
      onChange(!checked);
    }
  };

  const containerStyle = {
    ...styles.container,
    opacity: disabled ? 0.5 : 1,
    cursor: disabled ? "not-allowed" : "pointer",
  };

  const checkboxStyle = {
    ...styles.checkbox,
    ...(checked || indeterminate ? styles.checkboxChecked : {}),
    ...style,
    // Always maintain the border color for unchecked state
    borderColor: checked || indeterminate ? "var(--text-primary)" : "var(--text-secondary)",
  };

  return (
    <div
      style={containerStyle}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="checkbox"
      aria-checked={indeterminate ? "mixed" : checked}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
    >
      <div style={checkboxStyle}>
        {checked && !indeterminate && (
          <svg style={styles.checkmark} viewBox="0 0 16 16" fill="none">
            <path
              d="M13.3333 4L6 11.3333L2.66666 8"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
        {indeterminate && (
          <svg style={styles.checkmark} viewBox="0 0 16 16" fill="none">
            <path
              d="M4 8H12"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        )}
      </div>
    </div>
  );
}
