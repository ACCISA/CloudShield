import React from "react";
import EditButton from "../common/EditButton/EditButton.jsx";
import DisplayIcon from "../common/DisplayIcon/DisplayIcon.jsx";
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

/**
 * Renders a pill with hoverable DisplayIcon items (groups, workstations, or files)
 */
function ItemsPill({ items, type, totalCount }) {
  const itemsList = Array.isArray(items) ? items : [];
  const show = itemsList.slice(0, 3);
  const count = totalCount !== undefined ? totalCount : itemsList.length;
  const extra = Math.max(count - show.length, 0);

  if (count === 0) {
    return <span style={{ opacity: 0.5 }}>—</span>;
  }

  if (show.length === 0) {
    return (
      <div style={styles.bubblesPill}>
        <span style={styles.extraCount}>+ {count}</span>
      </div>
    );
  }

  return (
    <div style={styles.bubblesPill}>
      <div style={styles.avatarsContainer}>
        {show.map((item, idx) => (
          <div
            key={item.id || item.name || idx}
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

        {/* name + email + profile icon */}
        <div style={responsiveStyles.nameSection}>
          <DisplayIcon type="user" data={data} size="small" showHoverCard={false} />
          <div style={styles.nameContainer}>
            <span style={responsiveStyles.name}>{data.name}</span>
            <span style={responsiveStyles.email}>↳ {data.email}</span>
          </div>
        </div>

        {/* title */}
        {showTitle && <span style={styles.textCell}>{data.title}</span>}

        {/* workstations */}
        {showWorkstations && (
          <ItemsPill
            items={data.workstations}
            type="workstation"
            totalCount={data.workstationCount}
          />
        )}

        {/* groups */}
        {showGroups && (
          <ItemsPill
            items={data.groups}
            type="group"
            totalCount={data.groupCount}
          />
        )}

        {/* files */}
        {showFiles && (
          <ItemsPill
            items={data.files}
            type="workstation"
            totalCount={data.fileCount}
          />
        )}

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
