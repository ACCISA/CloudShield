import React, { useState, useEffect } from "react";
import UserRow from "./UserRow.jsx";
import Checkbox from "../common/Checkbox/Checkbox.jsx";

const styles = {
  tableHeaders: {
    display: "grid",
    alignItems: "center",
    gap: "12px",
    padding: "24px 24px 4px 24px",
    position: "sticky",
    top: 0,
    zIndex: 10,
  },
  headerLabel: {
    fontSize: "0.85rem",
    opacity: 0.7,
    color: "#fff",
  },
  listPanel: {
    borderRadius: "18px",
    border: "1px solid rgba(255,255,255,0.16)",
    boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
    padding: "16px",
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
    };
  }

  // Desktop - return original styles
  return styles;
};

export default function UsersTable({
  users,
  showTitle,
  showWorkstations,
  showGroups,
  showFiles,
  selectedIds = new Set(),
  allVisibleSelected = false,
  onToggleSelect = () => {},
  onToggleSelectAll = () => {},
  onSort,
  sortField,
  sortDir,
  onEdit,
  onDelete,
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
  const showTitleColumn = showTitle && !isMobile;
  const showWorkstationsColumn = showWorkstations && windowWidth >= 1024;
  const showGroupsColumn = showGroups && windowWidth >= 1024;
  const showFilesColumn = showFiles && windowWidth >= 1024;

  // Build grid template dynamically based on which columns are visible.
  const cols = [
    !isMobile ? "28px" : null, // checkbox - hidden on mobile
    isMobile ? "1fr" : "1.2fr", // name/email - takes full width on mobile
    showTitleColumn ? "0.9fr" : null,
    showWorkstationsColumn ? "0.6fr" : null,
    showGroupsColumn ? "0.8fr" : null,
    showFilesColumn ? "0.8fr" : null,
    "24px", // status
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
          <Checkbox checked={allVisibleSelected} onChange={onToggleSelectAll} />
          <span style={styles.headerLabel}>Name/Email</span>
          {showTitleColumn && <span style={styles.headerLabel}>Title</span>}
          {showWorkstationsColumn && (
            <span style={styles.headerLabel}>Workstations</span>
          )}
          {showGroupsColumn && <span style={styles.headerLabel}>Groups</span>}
          {showFilesColumn && <span style={styles.headerLabel}>Shares</span>}
          <div />
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
          {users.map((u, idx) => (
            <UserRow
              key={u.id}
              data={u}
              showTitle={showTitleColumn}
              showWorkstations={showWorkstationsColumn}
              showGroups={showGroupsColumn}
              showFiles={showFilesColumn}
              onEdit={() => onEdit(u)}
              onDelete={() => onDelete(u)}
              isLast={idx === users.length - 1}
              cols={cols}
              isMobile={isMobile}
              isTablet={isTablet}
              isSelected={selectedIds.has(u.id)}
              onToggleSelect={() => onToggleSelect(u.id)}
            />
          ))}
        </div>
      </div>
    </>
  );
}
