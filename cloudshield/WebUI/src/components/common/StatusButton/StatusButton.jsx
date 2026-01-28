/**
 * StatusButton.jsx
 *
 * Purpose:
 *   Displays a status button with connect/disconnect states.
 *   Shows connect icon with green border when connected,
 *   disconnect icon with red border when disconnected or busy.
 *   Responsive: shows text on desktop/tablet, icon-only on mobile.
 *
 * Props:
 *   - status: 'connected' | 'disconnected' | 'busy'
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
    color: "#fff",
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

  const isConnected = status === "connected";
  const buttonStyle = isConnected ? styles.connected : styles.disconnected;
  const isMobile = windowWidth < 768;
  const showIconOnly = compact || isMobile;

  return (
    <button
      style={{
        ...styles.button,
        ...(showIconOnly ? styles.buttonIconOnly : styles.buttonWithText),
        ...buttonStyle,
      }}
      onClick={onClick}
    >
      <span style={styles.iconWrapper}>
        {isConnected ? (
          <ConnectIcon width={14} height={14} color="#fff" />
        ) : (
          <DisconnectIcon width={14} height={14} color="#fff" />
        )}
      </span>
      {!showIconOnly && <span>{isConnected ? "Connect" : "Disconnect"}</span>}
    </button>
  );
}
