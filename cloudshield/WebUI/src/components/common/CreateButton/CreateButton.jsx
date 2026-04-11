import React, { useState } from "react";
import PropTypes from "prop-types";
import { useThemeColors } from "../../../hooks/useThemeColors.js";

const CreateButton = ({
  icon,
  buttonText,
  onClick,
  disabled = false,
  title,
  variant = "dark",
}) => {
  const themeColors = useThemeColors();
  const [isHovered, setIsHovered] = useState(false);
  const isLightVariant = variant === "light";

  let buttonBackground = themeColors.secondary;
  if (isLightVariant) {
    buttonBackground = isHovered && !disabled ? "#f3f3f3" : "#ffffff";
  } else if (isHovered && !disabled) {
    buttonBackground = themeColors.secondaryHover;
  }

  const buttonBorder = isLightVariant
    ? "1px solid rgba(0, 0, 0, 0.14)"
    : `1px solid ${themeColors.secondaryBorder}`;

  const buttonContainerStyle = {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: "12px 24px",
    gap: "8px",
    minWidth: "120px",
    height: "48px",
    background: buttonBackground,
    border: buttonBorder,
    borderRadius: "8px",
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: "16px",
    fontWeight: "500",
    color: isLightVariant ? "#111111" : themeColors.secondaryText,
    transition: "all 0.2s ease",
    opacity: disabled ? 0.4 : 1,
  };

  const handleMouseEnter = (e) => {
    if (isLightVariant) {
      e.currentTarget.style.background = "#f3f3f3";
      e.currentTarget.style.borderColor = "rgba(0, 0, 0, 0.22)";
      return;
    }
    e.currentTarget.style.background = themeColors.secondaryHover;
    e.currentTarget.style.borderColor = themeColors.secondaryBorder;
  };

  const handleMouseLeave = (e) => {
    if (isLightVariant) {
      e.currentTarget.style.background = "#ffffff";
      e.currentTarget.style.borderColor = "rgba(0, 0, 0, 0.14)";
      return;
    }
    e.currentTarget.style.background = themeColors.secondary;
    e.currentTarget.style.borderColor = themeColors.secondaryBorder;
  };

  return (
    <button
      style={buttonContainerStyle}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      title={title}
      aria-label={buttonText}
      onMouseEnter={(e) => {
        if (!disabled) setIsHovered(true);
        handleMouseEnter(e);
      }}
      onMouseLeave={(e) => {
        setIsHovered(false);
        handleMouseLeave(e);
      }}
    >
      {icon}
      {buttonText}
    </button>
  );
};

CreateButton.propTypes = {
  icon: PropTypes.node,
  buttonText: PropTypes.string,
  onClick: PropTypes.func,
  disabled: PropTypes.bool,
  title: PropTypes.string,
  variant: PropTypes.oneOf(["dark", "light"]),
};

export default CreateButton;
