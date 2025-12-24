import React, { useMemo, useState } from "react";

const baseStyle = {
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  padding: "12px 24px",
  gap: "8px",
  minWidth: "120px",
  height: "48px",
  background: "#1a1a1a",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  borderRadius: "8px",
  cursor: "pointer",
  fontSize: "16px",
  fontWeight: "500",
  color: "#ffffff",
  transition: "all 0.2s ease",
  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
  backgroundClip: "padding-box",
};

const hoverStyle = {
  background: "#242424",
  borderColor: "rgba(255, 255, 255, 0.2)",
};

const CreateButton = ({ icon, buttonText, onClick, type = "button", disabled = false }) => {
  const [isHovered, setIsHovered] = useState(false);

  const style = useMemo(() => {
    const interactive = isHovered && !disabled ? hoverStyle : {};
    const disabledStyle = disabled
      ? { opacity: 0.6, cursor: "not-allowed" }
      : {};
    return { ...baseStyle, ...disabledStyle, ...interactive };
  }, [isHovered, disabled]);

  return (
    <button
      type={type}
      style={style}
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      disabled={disabled}
    >
      {icon}
      {buttonText}
    </button>
  );
};

export default CreateButton;
