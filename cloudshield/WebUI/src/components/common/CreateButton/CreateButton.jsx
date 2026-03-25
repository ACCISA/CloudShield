import React, { useState } from "react";
import { useThemeColors } from "../../../hooks/useThemeColors.js";

const CreateButton = ({ icon, buttonText, onClick, disabled = false }) => {
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

  return (
    <button
      style={buttonContainerStyle}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      aria-label={buttonText}
      onMouseEnter={() => !disabled && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {icon}
      {buttonText}
    </button>
  );
};

export default CreateButton;
