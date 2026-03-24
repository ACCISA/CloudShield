import React from "react";
import PropTypes from "prop-types";
import DownloadIcon from "../../../assets/DownloadIcon";

function DownloadButton({ onClick, label = "Download", disabled = false }) {
  const [isHovered, setIsHovered] = React.useState(false);

  const getBackgroundColor = () => {
    if (disabled) return "rgba(255,255,255,0.05)";
    if (isHovered) return "rgba(255,255,255,0.12)";
    return "transparent";
  };

  const styles = {
    button: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      padding: "10px 20px",
      backgroundColor: getBackgroundColor(),
      border: "1px solid rgba(255,255,255,0.2)",
      borderRadius: "8px",
      color: disabled ? "var(--text-tertiary)" : "var(--text-primary)",
      fontSize: "14px",
      fontWeight: "500",
      cursor: disabled ? "not-allowed" : "pointer",
      transition: "all 0.2s ease",
      opacity: disabled ? 0.5 : 1,
    },
  };

  return (
    <button
      style={styles.button}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => !disabled && setIsHovered(true)}
      onMouseLeave={() => !disabled && setIsHovered(false)}
      type="button"
    >
      <DownloadIcon width={16} height={16} color="var(--text-primary)" />
      {label}
    </button>
  );
}

DownloadButton.propTypes = {
  onClick: PropTypes.func.isRequired,
  label: PropTypes.string,
  disabled: PropTypes.bool,
};

export default DownloadButton;
