import React, { useState } from "react";
import EditButton from "../common/EditButton/EditButton.jsx";
import EditIcon from "../../assets/EditIcon.jsx";
import TrashIcon from "../../assets/TrashIcon.jsx";
import ActiveIcon from "../../assets/ActiveIcon.jsx";
import Checkbox from "../common/Checkbox/Checkbox.jsx";

/* ---------------------------- styles ---------------------------- */

const styles = {
  row: {
    display: "grid",
    alignItems: "center",
    gap: "12px",
    color: "#fff",
    padding: "12px 8px",
    borderRadius: "12px",
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
  },
  email: {
    fontSize: "0.85rem",
    opacity: 0.85,
    marginTop: "2px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  textCell: {
    opacity: 0.9,
  },
  bubblesPill: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  avatarsContainer: {
    display: "flex",
    alignItems: "center",
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
  },
  extraCount: {
    fontSize: "0.85rem",
    opacity: 0.9,
  },
  statusContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  editContainer: {
    display: "flex",
    justifyContent: "flex-end",
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

function renderBubbles(count) {
  if (count === 0) {
    return <span style={{ opacity: 0.5 }}>—</span>;
  }

  const bubbles = Math.min(count, 3);
  return (
    <div style={styles.bubblesPill}>
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
  isTablet,
  isSelected,
  onToggleSelect,
}) {
  const responsiveStyles = getResponsiveStyles();

  return (
    <>
      {/* Row */}
      <div
        style={{
          ...responsiveStyles.row,
          gridTemplateColumns: cols.join(" "),
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.02)")
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.backgroundColor = "transparent")
        }
      >
        {/* select - hide on mobile */}
        {!isMobile && (
          <Checkbox checked={isSelected} onChange={onToggleSelect} />
        )}

        {/* name + email + leading circle */}
        <div style={responsiveStyles.nameSection}>
          <div style={styles.leadingCircle} />
          <div style={styles.nameContainer}>
            <span style={responsiveStyles.name}>{data.name}</span>
            <span style={responsiveStyles.email}>↳ {data.email}</span>
          </div>
        </div>

        {/* title */}
        {showTitle && <span style={styles.textCell}>{data.title}</span>}

        {/* workstations */}
        {showWorkstations && renderBubbles(data.workstations)}

        {/* groups */}
        {showGroups && renderBubbles(data.groups)}

        {/* files */}
        {showFiles && renderBubbles(data.files)}

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
