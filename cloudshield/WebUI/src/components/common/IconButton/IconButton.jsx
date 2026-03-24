import React from "react";
import PropTypes from "prop-types";
import { useThemeColors } from "../../../hooks/useThemeColors.js";

/**
 * IconButton Component
 *
 * A reusable button component with an icon and text label.
 * Supports hover states, disabled states, and customizable styling.
 *
 * @param {React.ReactNode} icon - Icon component to display
 * @param {string} label - Button text label
 * @param {Function} onClick - Click handler
 * @param {boolean} disabled - Whether the button is disabled
 * @param {Object} style - Additional custom styles
 * @param {string} variant - Visual style variant ('primary' or 'secondary')
 */
const IconButton = ({
  icon,
  label,
  onClick,
  disabled = false,
  style = {},
  variant = "primary",
}) => {
  const themeColors = useThemeColors();
  const [isHovered, setIsHovered] = React.useState(false);

  const getBackgroundColor = () => {
    if (disabled) {
      return variant === "primary"
        ? themeColors.bgSecondary
        : themeColors.lightOverlaySubtle;
    }
    if (isHovered) {
      return variant === "primary"
        ? themeColors.bgHover
        : themeColors.lightOverlaySubtle;
    }
    return variant === "primary" ? themeColors.bgSecondary : "transparent";
  };

  const getBorderColor = () => {
    if (disabled) return themeColors.borderLight;
    if (isHovered) return themeColors.border;
    return themeColors.borderLight;
  };

  const buttonStyle = {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: variant === "primary" ? "12px 24px" : "10px 20px",
    gap: "8px",
    minWidth: variant === "primary" ? "120px" : "auto",
    height: variant === "primary" ? "48px" : "auto",
    background: getBackgroundColor(),
    border: `1px solid ${getBorderColor()}`,
    borderRadius: "8px",
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: variant === "primary" ? "16px" : "14px",
    fontWeight: "500",
    color: disabled ? themeColors.textTertiary : themeColors.text,
    transition: "all 0.2s ease",
    boxShadow: variant === "primary" ? "0 2px 8px rgba(0, 0, 0, 0.3)" : "none",
    opacity: disabled ? 0.4 : 1,
    ...style,
  };

  return (
    <button
      style={buttonStyle}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      aria-label={label}
      onMouseEnter={() => !disabled && setIsHovered(true)}
      onMouseLeave={() => !disabled && setIsHovered(false)}
      type="button"
    >
      {icon}
      {label}
    </button>
  );
};

IconButton.propTypes = {
  icon: PropTypes.node,
  label: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  style: PropTypes.object,
  variant: PropTypes.oneOf(["primary", "secondary"]),
};

export default IconButton;
