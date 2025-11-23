/**
 * StatusButton.jsx
 *
 * Purpose:
 *   Displays a status button with connect/disconnect states.
 *   Shows connect icon with green border when connected,
 *   disconnect icon with red border when disconnected or busy.
 *
 * Props:
 *   - status: 'connected' | 'disconnected' | 'busy'
 *   - onClick: callback when button is clicked
 */
import React from "react";
import ConnectIcon from "../../../assets/ConnectIcon.jsx";
import DisconnectIcon from "../../../assets/DisconnectIcon.jsx";

const styles = {
  button: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "6px 16px",
    borderRadius: "22px",
    cursor: "pointer",
    fontSize: "0.875rem",
    fontWeight: 500,
    border: "1.5px solid",
    background: "transparent",
  },
  connected: {
    color: "#fff",
    borderColor: "#116e34",
  },
  disconnected: {
    color: "#fff",
    borderColor: "#7c1d1d",
  },
  iconWrapper: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
};

export default function StatusButton({ status = "disconnected", onClick }) {
  const isConnected = status === "connected";
  const buttonStyle = isConnected ? styles.connected : styles.disconnected;

  return (
    <button
      style={{
        ...styles.button,
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
      <span>{isConnected ? "Connect" : "Disconnect"}</span>
    </button>
  );
}
