import React from "react";
import EditButton from "../common/EditButton/EditButton.jsx";
import EditIcon from "../../assets/EditIcon.jsx";
import TrashIcon from "../../assets/TrashIcon.jsx";
import ActiveIcon from "../../assets/ActiveIcon.jsx";
import Checkbox from "../common/Checkbox/Checkbox.jsx";
import DisplayIcon from "../common/DisplayIcon/DisplayIcon.jsx";
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
    transition: "background-color 0.2s ease",
  },
  nameSection: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    minWidth: 0,
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
    minWidth: 0,
    overflow: "visible", // Allowed to overflow for stacking effect
  },
  avatarsContainer: {
    display: "flex",
    alignItems: "center",
    minWidth: 0,
  },
  extraCount: {
    marginLeft: "8px",
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
    borderTop: "1px solid var(--border-light)",
    margin: "0 8px",
  },
};

/* ---------------------------- helpers ---------------------------- */

// Replaces the fake placeholders with actual DisplayIcons stacked
function ItemsPill({ items, type }) {
  const itemsList = Array.isArray(items) ? items : [];
  const show = itemsList.slice(0, 3);
  const extra = Math.max(itemsList.length - show.length, 0);

  if (itemsList.length === 0) {
    return <span style={{ opacity: 0.5, ...styles.textCell }}>—</span>;
  }

  return (
    <div style={styles.bubblesPill}>
      <div style={styles.avatarsContainer}>
        {show.map((item, idx) => (
          <div
            key={item.id || item._id || idx}
            style={{
              marginLeft: idx === 0 ? 0 : "-8px",
              zIndex: show.length - idx,
              display: "flex",
              alignItems: "center",
            }}
          >
            <DisplayIcon type={type} data={item} size="small" />
          </div>
        ))}
      </div>
      {extra > 0 && <span style={styles.extraCount}>+ {extra}</span>}
    </div>
  );
}

// For Shares specifically: show "-" instead of 0
function renderShares(data) {
  const display =
    data.fileCountDisplay ??
    data.sharesDisplay ??
    (Array.isArray(data.files)
      ? data.files.length === 0
        ? "-"
        : String(data.files.length)
      : null);

  if (display === "-" || display === "—") {
    return <span style={{ opacity: 0.5, ...styles.textCell }}>—</span>;
  }

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "4px 10px",
        borderRadius: "20px",
        backgroundColor: "var(--action-hover)",
        fontSize: "0.85rem",
        whiteSpace: "nowrap",
      }}
    >
      {display}
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
  isSelected,
  onToggleSelect,
}) {
  const themeColors = useThemeColors();

  return (
    <>
      {/* Row */}
      <div
        style={{
          ...styles.row,
          gridTemplateColumns: cols.join(" "),
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.backgroundColor = "var(--action-hover)")
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.backgroundColor = "transparent")
        }
      >
        {/* select */}
        <Checkbox checked={isSelected} onChange={onToggleSelect} />

        {/* name + email + TRUE profile picture icon */}
        <div style={styles.nameSection}>
          <DisplayIcon type="user" data={data} size="small" />
          <div style={styles.nameContainer}>
            <span style={styles.name} title={data.name}>
              {data.name}
            </span>
            <span style={styles.email} title={data.email}>
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
        {showWorkstations && (
          <ItemsPill items={data.workstations} type="workstation" />
        )}

        {/* groups */}
        {showGroups && <ItemsPill items={data.groups} type="group" />}

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
                icon: (
                  <EditIcon
                    width={15}
                    height={16}
                    color="var(--text-primary)"
                  />
                ),
                label: "edit user",
                color: "var(--text-primary)",
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
