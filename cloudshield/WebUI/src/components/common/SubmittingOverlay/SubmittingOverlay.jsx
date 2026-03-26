/**
 * SubmittingOverlay.jsx
 *
 * Unified full-content loading animation shown inside modals during
 * create / edit API calls. Replaces modal step content while active.
 */
import { useThemeColors } from "../../../hooks/useThemeColors";

export default function SubmittingOverlay({ label = "Saving..." }) {
  const themeColors = useThemeColors();

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "24px",
        padding: "64px 24px",
        flex: 1,
      }}
    >
      <div
        style={{
          fontSize: "16px",
          fontWeight: 500,
          color: themeColors.textPrimary,
          letterSpacing: "0.01em",
        }}
      >
        {label}
      </div>

      <div style={{ width: "100%", maxWidth: "280px" }}>
        <div
          style={{
            height: "3px",
            backgroundColor: themeColors.border,
            borderRadius: "2px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: "40%",
              backgroundColor: themeColors.info,
              borderRadius: "2px",
              animation: "submittingSlide 1.4s ease-in-out infinite",
            }}
          />
        </div>
      </div>

      <style>{`
        @keyframes submittingSlide {
          0%   { transform: translateX(-100%); }
          50%  { transform: translateX(250%); }
          100% { transform: translateX(-100%); }
        }
      `}</style>
    </div>
  );
}
