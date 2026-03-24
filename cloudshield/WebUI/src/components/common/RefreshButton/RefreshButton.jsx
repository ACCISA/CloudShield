import { useState } from "react";
import RefreshIcon from "../../../assets/RefreshIcon";
import { useThemeColors } from "../../../hooks/useThemeColors.js";

const styles = {
  button: (themeColors, isHovered, disabled, isLoading) => ({
    width: "48px",
    height: "48px",
    padding: "0",
    backgroundColor: isHovered && !disabled && !isLoading ? themeColors.bgHover : "transparent",
    color: themeColors.text,
    border: "none",
    borderRadius: "80px",
    cursor: disabled || isLoading ? "not-allowed" : "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background-color 0.2s ease",
    opacity: disabled || isLoading ? 0.5 : 1,
  }),
  spinner: (themeColors) => ({
    width: "16px",
    height: "16px",
    border: `2px solid ${themeColors.borderLight}`,
    borderTop: `2px solid ${themeColors.text}`,
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  }),
};

export default function RefreshButton({ onClick, disabled = false }) {
  const themeColors = useThemeColors();
  const [isHovered, setIsHovered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    if (disabled || isLoading) return;

    setIsLoading(true);
    try {
      if (onClick) {
        await onClick();
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        style={styles.button(themeColors, isHovered, disabled, isLoading)}
        onClick={handleClick}
        disabled={disabled || isLoading}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        aria-label="Refresh"
        title="Refresh"
      >
        {isLoading ? (
          <div style={styles.spinner(themeColors)} />
        ) : (
          <RefreshIcon width={20} height={20} color={themeColors.text} />
        )}
      </button>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </>
  );
}
