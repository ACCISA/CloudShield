import { useState } from "react";
import RefreshIcon from "../../../assets/RefreshIcon";

const styles = {
  button: {
    width: "48px",
    height: "48px",
    padding: "0",
    backgroundColor: "transparent",
    color: "#fff",
    border: "none",
    borderRadius: "80px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background-color 0.2s ease",
  },
  buttonHovered: {
    backgroundColor: "#141414",
  },
  buttonDisabled: {
    opacity: 0.5,
    cursor: "not-allowed",
  },
  buttonLoading: {
    cursor: "not-allowed",
  },
  spinner: {
    width: "16px",
    height: "16px",
    border: "2px solid rgba(255,255,255,0.3)",
    borderTop: "2px solid #fff",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
};

export default function RefreshButton({ onClick, disabled = false }) {
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

  const getButtonStyle = () => {
    let style = { ...styles.button };
    if (isHovered && !disabled && !isLoading) {
      style = { ...style, ...styles.buttonHovered };
    }
    if (disabled) {
      style = { ...style, ...styles.buttonDisabled };
    }
    if (isLoading) {
      style = { ...style, ...styles.buttonLoading };
    }
    return style;
  };

  return (
    <>
      <button
        style={getButtonStyle()}
        onClick={handleClick}
        disabled={disabled || isLoading}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {isLoading ? (
          <div style={styles.spinner} />
        ) : (
          <RefreshIcon width={20} height={20} color="#fff" />
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
