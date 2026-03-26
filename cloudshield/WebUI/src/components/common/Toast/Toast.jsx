/**
 * Toast.jsx
 *
 * Shared toast notification component and hook.
 * Use `useToast()` in a page component, render `<Toast>` at the bottom of JSX.
 */
import { useState, useCallback } from "react";
import PropTypes from "prop-types";

const ICONS = {
  success: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  error: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
};

const COLORS = {
  success: { bg: "#1a3a1a", border: "rgba(76,175,80,0.4)", icon: "#4CAF50" },
  error: { bg: "#3a1a1a", border: "rgba(244,67,54,0.4)", icon: "#F44336" },
};

export function useToast(autoDismissMs = 3000) {
  const [toast, setToast] = useState({ open: false, msg: "", type: "success" });

  const showToast = useCallback(
    (msg, type = "success") => {
      setToast({ open: true, msg, type });
      setTimeout(() => setToast((p) => ({ ...p, open: false })), autoDismissMs);
    },
    [autoDismissMs],
  );

  const hideToast = useCallback(() => {
    setToast((p) => ({ ...p, open: false }));
  }, []);

  return { toast, showToast, hideToast };
}

export default function Toast({ msg, type = "success", open, onClose }) {
  if (!open || !msg) return null;

  const colors = COLORS[type] ?? COLORS.success;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        bottom: "24px",
        right: "24px",
        padding: "12px 16px",
        borderRadius: "10px",
        backgroundColor: colors.bg,
        border: `1px solid ${colors.border}`,
        color: "#fff",
        fontSize: "14px",
        fontWeight: 500,
        boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        gap: "10px",
        maxWidth: "360px",
        animation: "toastSlideIn 0.2s ease",
      }}
    >
      <button
        type="button"
        onClick={onClose}
        style={{
          all: "unset",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          width: "100%",
          cursor: "pointer",
        }}
      >
        <span style={{ color: colors.icon, display: "flex", flexShrink: 0 }}>
          {ICONS[type]}
        </span>
        <span>{msg}</span>
      </button>
      <style>{`
        @keyframes toastSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

Toast.propTypes = {
  msg: PropTypes.string,
  type: PropTypes.oneOf(["success", "error"]),
  open: PropTypes.bool,
  onClose: PropTypes.func,
};
