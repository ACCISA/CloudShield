import React from "react";
import PropTypes from "prop-types";

export default function ProvisioningProgressBar({ percent }) {
  // Clamp value between 0 and 100
  const validPercent = Math.min(100, Math.max(0, percent || 0));

  return (
    <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
      {/* Track */}
      <div
        style={{
          flexGrow: 1,
          height: "12px",
          backgroundColor: "rgba(255, 255, 255, 0.15)",
          borderRadius: "99px",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* Fill */}
        <div
          style={{
            width: `${validPercent}%`,
            height: "100%",
            backgroundColor: "#E0E0E0",
            borderRadius: "99px",
            transition: "width 0.5s ease-out",
          }}
        />
      </div>

      {/* Percentage Text */}
      <span
        style={{
          marginLeft: "16px",
          minWidth: "45px",
          color: "rgba(255, 255, 255, 0.7)",
          fontWeight: 500,
          fontFamily: "sans-serif",
          fontSize: "14px",
        }}
      >
        {Math.round(validPercent)}%
      </span>
    </div>
  );
}

ProvisioningProgressBar.propTypes = {
  percent: PropTypes.number,
};