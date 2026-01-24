import React from "react";

export default function ColumnToggle({ label, checked, onChange }) {
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
        e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.05)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = "transparent";
      }}
    >
      <span
        style={{
          fontSize: "14px",
          color: "#fff",
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
            ? "rgba(255,255,255,0.9)"
            : "rgba(255,255,255,0.2)",
          position: "relative",
          transition: "background-color 0.2s ease",
        }}
      >
        <div
          style={{
            width: "16px",
            height: "16px",
            borderRadius: "8px",
            backgroundColor: checked ? "#000" : "rgba(255,255,255,0.6)",
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
