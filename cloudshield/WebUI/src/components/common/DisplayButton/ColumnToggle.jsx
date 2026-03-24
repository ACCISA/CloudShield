import React from "react";
import { useThemeColors } from "../../../hooks/useThemeColors.js";

export default function ColumnToggle({ label, checked, onChange }) {
  const themeColors = useThemeColors();
  return (
    <div
      onClick={onChange}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onChange();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`Toggle ${label} column`}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 12px",
        borderRadius: "8px",
        cursor: "pointer",
        backgroundColor: "transparent",
        transition: "background-color 0.2s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = themeColors.lightOverlaySubtle;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = "transparent";
      }}
    >
      <span
        style={{
          fontSize: "14px",
          color: themeColors.text,
          opacity: 0.9,
        }}
      >
        {label}
      </span>
      <div
        style={{
          width: "40px",
          height: "20px",
          borderRadius: "10px",
          backgroundColor: checked
            ? themeColors.secondary
            : themeColors.border,
          position: "relative",
          transition: "background-color 0.2s ease",
        }}
      >
        <div
          style={{
            width: "16px",
            height: "16px",
            borderRadius: "8px",
            backgroundColor: checked ? themeColors.bgPrimary : themeColors.textTertiary,
            position: "absolute",
            top: "2px",
            left: checked ? "22px" : "2px",
            transition: "left 0.2s ease, background-color 0.2s ease",
          }}
        />
      </div>
    </div>
  );
}
