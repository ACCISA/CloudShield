import React from "react";
import EditButton from "../common/EditButton/EditButton.jsx";
import EditIcon from "../../assets/EditIcon.jsx";
import TrashIcon from "../../assets/TrashIcon.jsx";
import ActiveIcon from "../../assets/ActiveIcon.jsx";
import Checkbox from "../common/Checkbox/Checkbox.jsx";
import { useThemeColors } from "../../hooks/useThemeColors.js";

/* ---------------------------- styles ---------------------------- */

const styles = {
  row: {
    display: "grid",
    alignItems: "center",
    gap: "12px",
    color: "var(--text-primary)",
    padding: "12px 8px",
    borderRadius: "12px",
    minWidth: 0,
  },
  nameSection: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    minWidth: 0,
  },
  leadingCircle: {
    width: "28px",
    height: "28px",
    borderRadius: "50%",
    backgroundColor: "#2A2A2A",
    flexShrink: 0,
  },
  nameContainer: {
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
    overflow: "hidden",
  },
  name: {
    fontWeight: 600,
    lineHeight: 1.15,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    minWidth: 0,
  },
  email: {
    fontSize: "0.85rem",
    opacity: 0.85,
    marginTop: "2px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    minWidth: 0,
  },

  // Generic single-line truncated cell
  textCell: {
    opacity: 0.9,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    minWidth: 0,
  },

  bubblesPill: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    minWidth: 0,
    overflow: "hidden",
  },
  avatarsContainer: {
    display: "flex",
    alignItems: "center",
    minWidth: 0,
  },
  avatar: {
    width: "18px",
    height: "18px",
    fontSize: "0.65rem",
    border: "2px solid #0F0F0F",
    borderRadius: "50%",
    backgroundColor: "#2A2A2A",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 600,
    flexShrink: 0,
  },
  extraCount: {
    fontSize: "0.85rem",
    opacity: 0.9,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    minWidth: 0,
  },
  statusContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    flexShrink: 0,
  },
  editContainer: {
    display: "flex",
    justifyContent: "flex-end",
    flexShrink: 0,
  },
  divider: {
    borderTop: "1px solid rgba(255,255,255,0.1)",
    margin: "0 8px",
  },
};

// Responsive breakpoints
const getResponsiveStyles = () => {
  const width = window.innerWidth;

  // Mobile (< 768px)
  if (width < 768) {
    return {
      row: {
        ...styles.row,
        gap: "8px",
        padding: "10px 6px",
      },
      nameSection: {
        ...styles.nameSection,
        gap: "8px",
      },
      name: {
        ...styles.name,
        fontSize: "0.95rem",
      },
      email: {
        ...styles.email,
        fontSize: "0.8rem",
      },
    };
  }

  // Tablet (768px - 1024px)
  if (width < 1024) {
    return {
      row: {
        ...styles.row,
        gap: "10px",
        padding: "11px 7px",
      },
    };
  }

  // Desktop - return original styles
  return styles;
};

/* ---------------------------- helpers ---------------------------- */

// Accepts either an array (preferred) or a number.
// Returns a bubble UI for up to 3, and "—" when empty.
function renderBubbles(value) {
  const count = Array.isArray(value) ? value.length : Number(value || 0);

  if (!Number.isFinite(count) || count <= 0) {
    return <span style={{ opacity: 0.5, ...styles.textCell }}>—</span>;
  }

  const bubbles = Math.min(count, 3);

  return (
    <div style={styles.bubblesPill} title={`${count}`}>
      <div style={styles.avatarsContainer}>
        {Array.from({ length: bubbles }).map((_, i) => (
          <div
            key={i}
            style={{
              ...styles.avatar,
              marginLeft: i === 0 ? 0 : "-6px",
            }}
          />
        ))}
      </div>
      {count > 3 && <span style={styles.extraCount}>+ {count - 3}</span>}
    </div>
  );
}

// For Shares specifically: show "-" instead of 0
function renderShares(data) {
  // Prefer normalized display fields if UsersTable provides them
  const display =
    data.fileCountDisplay ??
    data.sharesDisplay ??
    (Array.isArray(data.files) ? (data.files.length === 0 ? "-" : String(data.files.length)) : null);

  if (display === "-" || display === "—") {
    return <span style={{ opacity: 0.5, ...styles.textCell }}>—</span>;
  }

  // If you still want the bubbles look for non-zero shares, keep bubbles based on files array/count
  if (Array.isArray(data.files)) return renderBubbles(data.files);

  // Fallback: if only a count exists
  return renderBubbles(Number(display));
}

/* --------------------------------- component -------------------------------- */

export default function UserRow({
  data,
  showTitle,
  showWorkstations,
  showGroups,
  showFiles,
  onEdit,
  onDelete,
  isLast,
  cols,
  isMobile,
  isTablet, // kept (even if unused) for signature compatibility
  isSelected,
  onToggleSelect,
}) {
  const responsiveStyles = getResponsiveStyles();
  const themeColors = useThemeColors();

  return (
    <>
      {/* Row */}
      <div
        style={{
          ...responsiveStyles.row,
          gridTemplateColumns: cols.join(" "),
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.backgroundColor = themeColors.lightOverlay)
        }
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
      >
        {/* select - hide on mobile */}
        {!isMobile && (
          <Checkbox checked={isSelected} onChange={onToggleSelect} />
        )}

        {/* name + email + leading circle */}
        <div style={responsiveStyles.nameSection}>
          <div style={styles.leadingCircle} />
          <div style={styles.nameContainer}>
            <span style={responsiveStyles.name} title={data.name}>
              {data.name}
            </span>
            <span style={responsiveStyles.email} title={data.email}>
              ↳ {data.email}
            </span>
          </div>
        </div>

        {/* title (truncate) */}
        {showTitle && (
          <span style={styles.textCell} title={data.title}>
            {data.title}
          </span>
        )}

        {/* workstations */}
        {showWorkstations && renderBubbles(data.workstations)}

        {/* groups */}
        {showGroups && renderBubbles(data.groups)}

        {/* files / shares */}
        {showFiles && renderShares(data)}

        {/* status indicator */}
        <div style={{ ...styles.statusContainer, marginRight: "-16px" }}>
          <ActiveIcon
            width={12}
            height={12}
            outerColor={data.status === "online" ? "#1F381F" : "#381F1F"}
            innerColor={data.status === "online" ? "#04C40A" : "#ff5252"}
          />
        </div>

        {/* edit */}
        <div style={styles.editContainer}>
          <EditButton
            menuItems={[
              {
                icon: <EditIcon width={15} height={16} color="#1a1a1a" />,
                label: "edit user",
                color: "#1a1a1a",
                onClick: onEdit,
              },
              {
                icon: <TrashIcon width={12} height={14} color="#D51616" />,
                label: "delete user",
                color: "#D51616",
                onClick: onDelete,
              },
            ]}
          />
        </div>
      </div>

      {/* divider */}
      {!isLast && <div style={styles.divider} />}
    </>
  );
}