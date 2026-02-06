import React from "react";
import PropTypes from "prop-types";

export default function ProvisioningProgressBar({ percent }) {
  // Clamp value between 0 and 100
  const validPercent = Math.min(100, Math.max(0, percent || 0));

  return (
    <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
      {/* 1. Animation Keyframes */}
      <style>
        {`
          @keyframes professionalShimmer {
            0% {
              background-position: -500px 0;
            }
            100% {
              background-position: 500px 0;
            }
          }
        `}
      </style>

      {/* Track (The empty background) */}
      <div
        style={{
          flexGrow: 1,
          height: "10px",
          backgroundColor: "rgba(255, 255, 255, 0.1)", // Very subtle dark track
          borderRadius: "8px",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* Fill (The metallic bar) */}
        <div
          style={{
            width: `${validPercent}%`,
            height: "100%",
            
            // --- FIX: Darker "Metallic" Base ---
            // This gray allows the white shimmer to actually show up
            backgroundColor: "#9CA3AF", 
            
            borderRadius: "8px",
            transition: "width 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
            
            // --- The "Sheen" ---
            // 1. We angle it (105deg).
            // 2. We use a bright white streak in the middle (0.8 opacity).
            backgroundImage: `linear-gradient(
              105deg, 
              transparent 20%, 
              rgba(255, 255, 255, 0.8) 50%, 
              transparent 80%
            )`,
            
            backgroundSize: "500px 100%", 
            backgroundRepeat: "no-repeat",
            
            // Animation loop
            animation: "professionalShimmer 2s infinite linear",
            
            // Optional: Subtle shadow to make it pop off the track
            boxShadow: "0 1px 2px rgba(0, 0, 0, 0.3)"
          }}
        />
      </div>

      {/* Percentage Text */}
      <span
        style={{
          marginLeft: "16px",
          minWidth: "45px",
          color: "rgba(255, 255, 255, 0.9)",
          fontWeight: 500,
          fontFamily: "'lfit', sans-serif",
          fontSize: "14px",
          fontVariantNumeric: "tabular-nums",
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