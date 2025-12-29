/**
 * Shared styles for workstation dialog buttons
 */
export const buttonStyles = {
  button: {
    textTransform: "none",
    borderRadius: "12px",
    padding: "8px 16px",
    cursor: "pointer",
    fontSize: "1rem",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    border: "none",
  },
  deleteButton: {
    color: "#fff",
    backgroundColor: "#7c1d1d",
  },
  cancelButton: {
    color: "#fff",
    backgroundColor: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.2)",
  },
  createButton: {
    color: "#000",
    backgroundColor: "#fff",
    padding: "8px 20px",
  },
  editButton: {
    color: "#000",
    backgroundColor: "#fff",
    padding: "8px 20px",
  },
};

/**
 * Shared styles for workstation forms
 */
export const formStyles = {
  formGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "16px",
  },
  actionsRight: {
    display: "flex",
    gap: "10px",
    marginLeft: "auto",
  },
  softwareSection: {
    marginTop: "16px",
  },
  softwareHeader: {
    display: "flex",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontWeight: 600,
    color: "#fff",
  },
  checkboxContainer: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  checkbox: {
    width: "18px",
    height: "18px",
    cursor: "pointer",
    accentColor: "#fff",
  },
  softwareButtons: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
  },
  softwareButton: {
    textTransform: "none",
    color: "#fff",
    borderColor: "rgba(255,255,255,0.2)",
    borderRadius: "10px",
    border: "1px solid rgba(255,255,255,0.2)",
    background: "transparent",
    padding: "6px 12px",
    cursor: "pointer",
    fontSize: "0.875rem",
  },
  wallpaperSection: {
    marginTop: "16px",
  },
  wallpaperBox: {
    marginTop: "8px",
    width: "120px",
    height: "90px",
    borderRadius: "12px",
    border: "1px solid rgba(255,255,255,0.2)",
    background: "rgba(255,255,255,0.05)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "rgba(255,255,255,0.6)",
    fontSize: "2rem",
    cursor: "pointer",
  },
};

/**
 * Reusable button component with hover effects
 */
export function ActionButton({ 
  onClick, 
  style, 
  hoverStyle, 
  children, 
  baseStyle = buttonStyles.button 
}) {
  return (
    <button
      onClick={onClick}
      style={{ ...baseStyle, ...style }}
      onMouseEnter={(e) => {
        Object.entries(hoverStyle || {}).forEach(([key, value]) => {
          e.currentTarget.style[key] = value;
        });
      }}
      onMouseLeave={(e) => {
        Object.entries(style || {}).forEach(([key, value]) => {
          e.currentTarget.style[key] = value;
        });
      }}
    >
      {children}
    </button>
  );
}
