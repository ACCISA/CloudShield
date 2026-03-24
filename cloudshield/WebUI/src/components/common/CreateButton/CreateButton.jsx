import React, { useState } from "react";
import { useThemeColors } from "../../../hooks/useThemeColors.js";

const CreateButton = ({ icon, buttonText, onClick, disabled = false, title }) => {
  const themeColors = useThemeColors();
  const [isHovered, setIsHovered] = useState(false);

  const buttonContainerStyle = {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: "12px 24px",
    gap: "8px",
    minWidth: "120px",
    height: "48px",
    background: isHovered && !disabled ? themeColors.secondaryHover : themeColors.secondary,
    border: `1px solid ${themeColors.secondaryBorder}`,
    borderRadius: "8px",
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: "16px",
    fontWeight: "500",
    color: themeColors.secondaryText,
    transition: "all 0.2s ease",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
    opacity: disabled ? 0.4 : 1,
  };

  const handleMouseEnter = (e) => {
    e.currentTarget.style.background = "#242424";
    e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.2)";
  };

  const handleMouseLeave = (e) => {
    e.currentTarget.style.background = "#1a1a1a";
    e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
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

export default CreateButton;
