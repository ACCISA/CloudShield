import React, { useState } from "react";
import PropTypes from "prop-types";
import Checkbox from "../common/Checkbox/Checkbox.jsx";
import HighAlertIcon from "../../assets/security/HighAlertIcon";
import ModerateAlertIcon from "../../assets/security/ModerateAlertIcon";
import LowAlertIcon from "../../assets/security/LowAlertIcon";
import DetailsIcon from "../../assets/security/DetailsIcon";
import FalsePositiveIcon from "../../assets/security/FalsePositiveIcon";
import EditButton from "../common/EditButton/EditButton";
import SecurityAlertModal from "./SecurityAlertModal";
import CheckmarkIcon from "../../assets/CheckmarkIcon";
import DownloadIcon from "../../assets/DownloadIcon";

const RISK_CONFIG = {
  high: {
    label: "High",
    color: "#EB6560",
    icon: HighAlertIcon,
  },
  moderate: {
    label: "Moderate",
    color: "#EBAF60",
    icon: ModerateAlertIcon,
  },
  low: {
    label: "Low",
    color: "#607CEB",
    icon: LowAlertIcon,
  },
};

function SecurityAlertsItem({
  securityAlert,
  isSelected = false,
  onToggleSelect = () => {},
  isEven = false,
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const riskConfig = RISK_CONFIG[securityAlert.risk] || RISK_CONFIG.low;
  const RiskIcon = riskConfig.icon;

  const handleRowClick = (e) => {
    // The row will open the modal
    setIsModalOpen(true);
  };

  const handleMarkResolved = () => {
    console.log("Mark as resolved:", securityAlert.id);
    // Backend integration: API call to mark as resolved
  };

  const handleMarkFalsePositive = () => {
    console.log("Mark as false positive:", securityAlert.id);
    // Backend integration: API call to mark as false positive
  };

  const handleDownload = () => {
    console.log("Download alert:", securityAlert.id);
    // Backend integration: API call to download alert details
  };

  const handleViewDetails = () => {
    setIsModalOpen(true);
  };

  const editMenuItems = [
    {
      icon: <DetailsIcon width={16} height={16} color="#607CEB" />,
      label: "View details",
      color: "#607CEB",
      onClick: handleViewDetails,
    },
    {
      icon: <CheckmarkIcon width={16} height={16} color="#10B981" />,
      label: "Mark as resolved",
      color: "#10B981",
      onClick: handleMarkResolved,
    },
    {
      icon: <FalsePositiveIcon width={16} height={16} color="#EBAF60" />,
      label: "Mark as false positive",
      color: "#EBAF60",
      onClick: handleMarkFalsePositive,
    },
    {
      icon: <DownloadIcon width={16} height={16} color="#1a1a1a" />,
      label: "Download",
      color: "#1a1a1a",
      onClick: handleDownload,
    },
  ];

  const styles = {
    row: {
      display: "grid",
      gridTemplateColumns: "40px 1fr 1.2fr 2fr 1fr 1fr 40px",
      alignItems: "center",
      gap: "12px",
      padding: "16px 16px",
      backgroundColor: isEven ? "#1a1a1a" : "transparent",
      borderRadius: "8px",
      cursor: "pointer",
      transition: "background-color 0.2s",
      marginBottom: "2px",
      border: "none",
      width: "100%",
      textAlign: "left",
    },
    checkboxWrapper: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: "40px",
      height: "100%",
    },
    alertType: {
      color: "#fff",
      fontSize: "14px",
      fontWeight: "500",
    },
    date: {
      color: "rgba(255,255,255,0.7)",
      fontSize: "14px",
    },
    activity: {
      color: "rgba(255,255,255,0.7)",
      fontSize: "14px",
    },
    riskBadge: {
      display: "inline-flex",
      alignItems: "center",
      gap: "6px",
      fontSize: "13px",
      fontWeight: "500",
      color: riskConfig.color,
      width: "fit-content",
    },
    status: {
      color: "#fff",
      fontSize: "14px",
      fontWeight: "500",
      textTransform: "capitalize",
    },
    editWrapper: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: "40px",
      height: "100%",
    },
  };

  return (
    <>
      <button
        type="button"
        style={styles.row}
        onClick={handleRowClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleRowClick(e);
          }
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = "#2a2a2a";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = isEven
            ? "#1a1a1a"
            : "transparent";
        }}
      >
        <div
          style={styles.checkboxWrapper}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          role="presentation"
        >
          <Checkbox
            checked={isSelected}
            onChange={() => onToggleSelect(securityAlert.id)}
          />
        </div>
        <div style={styles.alertType}>{securityAlert.type}</div>
        <div style={styles.date}>
          {securityAlert.displayDate || securityAlert.date}
        </div>
        <div style={styles.activity}>{securityAlert.activity}</div>
        <div style={styles.riskBadge}>
          <RiskIcon width="16px" height="16px" />
          {riskConfig.label}
        </div>
        <div style={styles.status}>{securityAlert.status}</div>
        <div
          style={styles.editWrapper}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          role="presentation"
        >
          <EditButton menuItems={editMenuItems} />
        </div>
      </button>
      <SecurityAlertModal
        alert={securityAlert}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}

SecurityAlertsItem.propTypes = {
  securityAlert: PropTypes.shape({
    id: PropTypes.number.isRequired,
    type: PropTypes.string.isRequired,
    date: PropTypes.string.isRequired,
    activity: PropTypes.string.isRequired,
    risk: PropTypes.oneOf(["high", "moderate", "low"]).isRequired,
    status: PropTypes.string.isRequired,
  }).isRequired,
  isSelected: PropTypes.bool,
  onToggleSelect: PropTypes.func,
  isEven: PropTypes.bool,
};

export default SecurityAlertsItem;
