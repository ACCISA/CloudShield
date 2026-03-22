import React from "react";

const CreateButton = ({ icon, buttonText, onClick, disabled = false, title }) => {
  const buttonContainerStyle = {
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
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: "16px",
    fontWeight: "500",
    color: "#ffffff",
    transition: "all 0.2s ease",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
    opacity: disabled ? 0.4 : 1,
  };

  return (
    <button
      style={buttonContainerStyle}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      title={title}
      aria-label={buttonText}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.background = "#242424";
          e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.2)";
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          e.currentTarget.style.background = "#1a1a1a";
          e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
        }
      }}
    >
      {icon}
      {buttonText}
    </button>
  );
};

export default CreateButton;
