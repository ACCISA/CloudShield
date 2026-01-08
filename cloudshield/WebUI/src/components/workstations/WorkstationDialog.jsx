/**
 * WorkstationDialog.jsx
 *
 * Purpose:
 *   Reusable dialog wrapper with consistent dark theme styling for workstation dialogs.
 *
 * Props:
 *   - open: boolean to control dialog visibility
 *   - onClose: callback when dialog should close
 *   - title: dialog title text
 *   - breadcrumb: breadcrumb path items
 *   - children: dialog content
 *   - actions: dialog action buttons
 */
import React from "react";

const styles = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1300,
  },
  dialog: {
    backgroundColor: "#0F0F0F",
    color: "#fff",
    borderRadius: "18px",
    border: "1px solid rgba(255, 255, 255, 0.16)",
    width: "520px",
    maxWidth: "95vw",
    maxHeight: "90vh",
    display: "flex",
    flexDirection: "column",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 16px 16px 24px",
  },
  breadcrumb: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  breadcrumbItem: {
    fontSize: "1rem",
  },
  breadcrumbItemActive: {
    fontWeight: 600,
  },
  breadcrumbItemInactive: {
    opacity: 0.8,
  },
  closeButton: {
    background: "none",
    border: "none",
    color: "#fff",
    cursor: "pointer",
    padding: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "4px",
    fontSize: "1.5rem",
  },
  content: {
    padding: "24px",
    borderTop: "1px solid rgba(255, 255, 255, 0.12)",
    borderBottom: "1px solid rgba(255, 255, 255, 0.12)",
    overflowY: "auto",
    flex: 1,
  },
  actions: {
    padding: "16px",
    display: "flex",
    gap: "12px",
  },
};

/**
 * Reusable dialog wrapper for workstation operations.
 * @param {Object} props
 * @param {boolean} props.open - Controls dialog visibility
 * @param {Function} props.onClose - Close handler
 * @param {string} props.title - Dialog title (optional, will use breadcrumb if not provided)
 * @param {Array<string>} props.breadcrumb - Breadcrumb navigation items
 * @param {React.ReactNode} props.children - Dialog content
 * @param {React.ReactNode} props.actions - Dialog action buttons
 * @returns {JSX.Element} Styled dialog component
 */
export default function WorkstationDialog({
  open,
  onClose,
  title,
  breadcrumb = ["Workstations"],
  children,
  actions,
}) {
  if (!open) return null;

  return (
    <div
      style={styles.overlay}
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          onClose();
        }
      }}
      role="button"
      tabIndex={-1}
      aria-label="Close dialog"
    >
      <div
        style={styles.dialog}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <div style={styles.header}>
          <div style={styles.breadcrumb}>
            {breadcrumb.map((item, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && <span>›</span>}
                <span
                  style={{
                    ...styles.breadcrumbItem,
                    ...(idx === breadcrumb.length - 1
                      ? styles.breadcrumbItemActive
                      : styles.breadcrumbItemInactive),
                  }}
                >
                  {item}
                </span>
              </React.Fragment>
            ))}
          </div>
          <button
            onClick={onClose}
            style={styles.closeButton}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.1)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "transparent")
            }
            aria-label="close"
          >
            ×
          </button>
        </div>

        <div style={styles.content}>{children}</div>

        {actions && <div style={styles.actions}>{actions}</div>}
      </div>
    </div>
  );
}
