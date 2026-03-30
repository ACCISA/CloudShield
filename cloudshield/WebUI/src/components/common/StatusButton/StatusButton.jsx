/**
 * StatusButton.jsx
 *
 * Purpose:
 *   Displays a status badge for workstation state.
 *   Supports ready, provisioning, and unavailable states.
 *   Responsive: shows text on desktop/tablet, icon-only on mobile.
 *
 * Props:
 *   - status: 'connected' | 'disconnected' | 'busy' | 'provisioning' | 'failed'
 *   - onClick: callback when button is clicked
 *   - compact: boolean (optional) - force icon-only mode
 */
import React, { useState, useEffect } from "react";
import ConnectIcon from "../../../assets/ConnectIcon.jsx";
import DisconnectIcon from "../../../assets/DisconnectIcon.jsx";

const styles = {
  button: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    fontSize: "0.875rem",
    fontWeight: 500,
    border: "1.5px solid",
    background: "transparent",
  },
  buttonWithText: {
    gap: "8px",
    padding: "6px 16px",
    borderRadius: "22px",
    color: "var(--text-primary)",
  },
  buttonIconOnly: {
    padding: "8px",
    borderRadius: "50%",
    width: "32px",
    height: "32px",
  },
  connected: {
    borderColor: "#116e34",
  },
  provisioning: {
    borderColor: "#a16207",
  },
  disconnected: {
    borderColor: "#7c1d1d",
  },
  iconWrapper: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
};

export default function StatusButton({
  status = "disconnected",
  onClick,
  compact,
}) {
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const normalizedStatus = (status || "").toLowerCase();
  const isConnected = ["connected", "active", "online"].includes(normalizedStatus);
  const isProvisioning = normalizedStatus === "provisioning";
  const isBuilding = normalizedStatus === "building";
  const buttonStyle = isConnected
    ? styles.connected
    : isProvisioning || isBuilding
      ? styles.provisioning
      : styles.disconnected;
  const isMobile = windowWidth < 768;
  const showIconOnly = compact || isMobile;
  const label = isConnected
    ? "Ready"
    : isBuilding
      ? "Building template"
      : isProvisioning
        ? "Provisioning"
        : normalizedStatus === "failed"
          ? "Failed"
          : "Unavailable";

  return (
    <button
      style={{
        ...styles.button,
        ...(showIconOnly ? styles.buttonIconOnly : styles.buttonWithText),
        cursor: onClick ? "pointer" : "default",
        ...buttonStyle,
      }}
      onClick={onClick}
      disabled={!onClick}
    >
      <span style={styles.iconWrapper}>
        {isConnected || isProvisioning || isBuilding ? (
          <ConnectIcon width={14} height={14} color="var(--text-primary)" />
        ) : (
          <DisconnectIcon width={14} height={14} color="var(--text-primary)" />
        )}
      </span>
      {!showIconOnly && <span>{label}</span>}
    </button>
  );
}
