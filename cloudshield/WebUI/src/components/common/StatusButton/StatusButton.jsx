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
import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import ConnectIcon from "../../../assets/ConnectIcon.jsx";
import DisconnectIcon from "../../../assets/DisconnectIcon.jsx";

const CONNECTED_STATUSES = ["connected", "active", "online"];
const PENDING_STATUSES = ["provisioning", "building"];

const STATUS_LABELS = {
  building: "Building template",
  provisioning: "Provisioning",
  failed: "Failed",
};

const STATUS_STYLES = {
  connected: { borderColor: "#116e34" },
  pending: { borderColor: "#a16207" },
  disconnected: { borderColor: "#7c1d1d" },
};

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
  iconWrapper: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
};

function getButtonStyle(normalizedStatus) {
  if (CONNECTED_STATUSES.includes(normalizedStatus)) return STATUS_STYLES.connected;
  if (PENDING_STATUSES.includes(normalizedStatus)) return STATUS_STYLES.pending;
  return STATUS_STYLES.disconnected;
}

function getLabel(normalizedStatus) {
  if (CONNECTED_STATUSES.includes(normalizedStatus)) return "Ready";
  return STATUS_LABELS[normalizedStatus] || "Unavailable";
}

export default function StatusButton({ status, onClick, compact }) {
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const normalizedStatus = (status || "").toLowerCase();
  const isConnected = CONNECTED_STATUSES.includes(normalizedStatus);
  const isPending = PENDING_STATUSES.includes(normalizedStatus);
  const showIconOnly = compact || windowWidth < 768;
  const buttonStyle = getButtonStyle(normalizedStatus);
  const label = getLabel(normalizedStatus);

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
        {isConnected || isPending ? (
          <ConnectIcon width={14} height={14} color="var(--text-primary)" />
        ) : (
          <DisconnectIcon width={14} height={14} color="var(--text-primary)" />
        )}
      </span>
      {!showIconOnly && <span>{label}</span>}
    </button>
  );
}

StatusButton.propTypes = {
  status: PropTypes.string,
  onClick: PropTypes.func,
  compact: PropTypes.bool,
};

StatusButton.defaultProps = {
  status: "disconnected",
  onClick: undefined,
  compact: false,
};
