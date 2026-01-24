/**
 * GroupsList.jsx
 *
 * Purpose:
 *   Render a list of group rows with actions like edit and delete,
 *   matching the workstations and users list patterns.
 *
 * Props:
 *   - rows: array of group objects to display
 *   - onEdit(row)
 *   - onDelete(id)
 *   - showUsers: boolean (Display control)
 *   - showWorkstations: boolean (Display control)
 *   - showFiles: boolean (Display control)
 */

import React, { useState, useEffect } from "react";
import EditButton from "../common/EditButton/EditButton.jsx";
import EditIcon from "../../assets/EditIcon.jsx";
import TrashIcon from "../../assets/TrashIcon.jsx";
import Checkbox from "../common/Checkbox/Checkbox.jsx";
import DisplayIcon from "../common/DisplayIcon/DisplayIcon.jsx";

/* ---------------------------- styles ---------------------------- */

const styles = {
  tableHeaders: {
    display: "grid",
    alignItems: "center",
    gap: "12px",
    padding: "24px 24px 4px 24px",
  },
  headerLabel: {
    fontSize: "0.85rem",
    opacity: 0.7,
    color: "#fff",
  },
  listPanel: {
    borderRadius: "18px",
    border: "1px solid rgba(255,255,255,0.16)",
    backgroundColor: "#0F0F0F",
    boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
    padding: "16px",
  },
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },
  row: {
    display: "grid",
    alignItems: "center",
    gap: "12px",
    color: "#fff",
    padding: "12px 8px",
    borderRadius: "12px",
    position: "relative",
    zIndex: 1,
  },
  nameSection: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  nameContainer: {
    display: "flex",
    flexDirection: "column",
  },
  name: {
    fontWeight: 600,
    lineHeight: 1.15,
  },
  description: {
    fontSize: "0.85rem",
    opacity: 0.85,
    marginTop: "2px",
  },
  countBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "6px 12px",
    borderRadius: "20px",
    backgroundColor: "rgba(255,255,255,0.08)",
    fontSize: "0.85rem",
    color: "#fff",
    whiteSpace: "nowrap",
  },
  editContainer: {
    display: "flex",
    justifyContent: "flex-end",
  },
  divider: {
    borderTop: "1px solid rgba(255,255,255,0.1)",
    margin: "0 8px",
  },
  avatarsContainer: {
    display: "flex",
    alignItems: "center",
  },
  extraCount: {
    marginLeft: "8px",
    fontSize: "0.9rem",
    opacity: 0.85,
    whiteSpace: "nowrap",
  },
};

// Responsive breakpoints
const getResponsiveStyles = () => {
  const width = window.innerWidth;

  // Mobile (< 768px)
  if (width < 768) {
    return {
      tableHeaders: {
        ...styles.tableHeaders,
        padding: "16px 16px 4px 16px",
      },
      listPanel: {
        ...styles.listPanel,
        borderRadius: "12px",
        padding: "12px",
      },
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
      description: {
        ...styles.description,
        fontSize: "0.8rem",
      },
    };
  }

  // Tablet (768px - 1024px)
  if (width < 1024) {
    return {
      tableHeaders: {
        ...styles.tableHeaders,
        padding: "20px 20px 4px 20px",
      },
      listPanel: {
        ...styles.listPanel,
        borderRadius: "16px",
        padding: "14px",
      },
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

/* ---------------------------- helpers & components ---------------------------- */

function UsersPill({ row }) {
  const usersList = Array.isArray(row.users) ? row.users : [];
  const show = usersList.slice(0, 3);
  const totalCount = row.memberCount || usersList.length;
  const extra = Math.max(totalCount - show.length, 0);

  if (show.length === 0) {
    return (
      <div style={styles.countBadge}>
        <span>+ {totalCount}</span>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      <div style={styles.avatarsContainer}>
        {show.map((user, idx) => (
          <div
            key={`${user.firstName}-${idx}`}
            style={{
              marginLeft: idx === 0 ? 0 : "-8px",
              zIndex: show.length - idx,
              display: "flex",
              alignItems: "center",
            }}
          >
            <DisplayIcon type="user" data={user} size="small" />
          </div>
        ))}
      </div>
      {extra > 0 && <span style={styles.extraCount}>+ {extra}</span>}
    </div>
  );
}

function WorkstationsPill({ row }) {
  const workstationsList = Array.isArray(row.workstations)
    ? row.workstations
    : [];
  const show = workstationsList.slice(0, 3);
  const totalCount = workstationsList.length;
  const extra = Math.max(totalCount - show.length, 0);

  if (show.length === 0) {
    return (
      <div style={styles.countBadge}>
        <span>+ {totalCount}</span>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      <div style={styles.avatarsContainer}>
        {show.map((workstation, idx) => (
          <div
            key={`${workstation.name}-${idx}`}
            style={{
              marginLeft: idx === 0 ? 0 : "-8px",
              zIndex: show.length - idx,
              display: "flex",
              alignItems: "center",
            }}
          >
            <DisplayIcon type="workstation" data={workstation} size="small" />
          </div>
        ))}
      </div>
      {extra > 0 && <span style={styles.extraCount}>+ {extra}</span>}
    </div>
  );
}

function GroupRow({
  r,
  cols,
  showUsers,
  showWorkstations,
  showFiles,
  onEdit,
  onDelete,
  isLast,
  isMobile,
  isTablet,
}) {
  const [checked, setChecked] = useState(false);
  const responsiveStyles = getResponsiveStyles();

  return (
    <>
      {/* Row */}
      <div
        style={{
          ...responsiveStyles.row,
          gridTemplateColumns: cols.join(" "),
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.02)";
          e.currentTarget.style.zIndex = "100";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "transparent";
          e.currentTarget.style.zIndex = "1";
        }}
      >
        {/* Checkbox - hide on mobile */}
        {!isMobile && <Checkbox checked={checked} onChange={setChecked} />}

        {/* name + description + DisplayIcon */}
        <div style={responsiveStyles.nameSection}>
          <DisplayIcon type="group" data={r} size="small" />
          <div style={styles.nameContainer}>
            <span style={responsiveStyles.name}>{r.name}</span>
            <span style={responsiveStyles.description}>↳ {r.description}</span>
          </div>
        </div>

        {/* users */}
        {showUsers && <UsersPill row={r} />}

        {/* workstations */}
        {showWorkstations && <WorkstationsPill row={r} />}

        {/* files count */}
        {showFiles && (
          <div style={styles.countBadge}>
            <span>+ {r.files || 0}</span>
          </div>
        )}

        {/* edit */}
        <div style={styles.editContainer}>
          <EditButton
            menuItems={[
              {
                icon: <EditIcon width={15} height={16} color="#1a1a1a" />,
                label: "edit group",
                color: "#1a1a1a",
                onClick: () => onEdit?.(r),
              },
              {
                icon: <TrashIcon width={12} height={14} color="#D51616" />,
                label: "delete group",
                color: "#D51616",
                onClick: () => onDelete?.(r.id),
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

export default function GroupsList({
  rows,
  onEdit,
  onDelete,
  showUsers = true,
  showWorkstations = true,
  showFiles = true,
}) {
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isMobile = windowWidth < 768;
  const isTablet = windowWidth >= 768 && windowWidth < 1024;
  const responsiveStyles = getResponsiveStyles();

  // Hide some columns on smaller screens
  const showUsersColumn = showUsers && !isMobile;
  const showWorkstationsColumn = showWorkstations && windowWidth >= 1024;
  const showFilesColumn = showFiles && windowWidth >= 1024;

  // Build grid template dynamically based on which columns are visible.
  const cols = [
    !isMobile ? "28px" : null, // checkbox - hidden on mobile
    isMobile ? "1fr" : "1.2fr", // name/description with icon - takes full width on mobile
    showUsersColumn ? (isMobile ? "0.8fr" : "0.6fr") : null,
    showWorkstationsColumn ? "0.8fr" : null,
    showFilesColumn ? "0.8fr" : null,
    "0.25fr", // edit
  ].filter(Boolean);

  return (
    <>
      {/* Table Headers - hide on mobile */}
      {!isMobile && (
        <div
          style={{
            ...responsiveStyles.tableHeaders,
            gridTemplateColumns: cols.join(" "),
            paddingLeft: isMobile
              ? "calc(12px + 4px + 4px)"
              : isTablet
                ? "calc(14px + 8px + 8px)"
                : "calc(16px + 8px + 8px)",
            paddingRight: isMobile
              ? "calc(12px + 4px + 4px)"
              : isTablet
                ? "calc(14px + 8px + 8px)"
                : "calc(16px + 8px + 8px)",
          }}
        >
          <div />
          <span style={styles.headerLabel}>Name/Description</span>
          {showUsersColumn && <span style={styles.headerLabel}>Users</span>}
          {showWorkstationsColumn && (
            <span style={styles.headerLabel}>Workstations</span>
          )}
          {showFilesColumn && <span style={styles.headerLabel}>Files</span>}
          <div />
        </div>
      )}

      {/* List panel */}
      <div style={responsiveStyles.listPanel}>
        <div
          style={{
            padding: isMobile ? "0 4px" : isTablet ? "0 8px" : "0 8px",
          }}
        >
          <div style={styles.container}>
            {rows.map((r, idx) => (
              <GroupRow
                key={r.id}
                r={r}
                cols={cols}
                showUsers={showUsersColumn}
                showWorkstations={showWorkstationsColumn}
                showFiles={showFilesColumn}
                onEdit={onEdit}
                onDelete={onDelete}
                isLast={idx === rows.length - 1}
                isMobile={isMobile}
                isTablet={isTablet}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
