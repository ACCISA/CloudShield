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
 *   - selectedIds: Set of selected row ids
 *   - allVisibleSelected: boolean
 *   - isIndeterminate: boolean
 *   - onToggleSelect(id)
 *   - onToggleSelectAll()
 */

import React, { useState, useEffect, useMemo } from "react";
import EditButton from "../common/EditButton/EditButton.jsx";
import EditIcon from "../../assets/EditIcon.jsx";
import TrashIcon from "../../assets/TrashIcon.jsx";
import Checkbox from "../common/Checkbox/Checkbox.jsx";
import DisplayIcon from "../common/DisplayIcon/DisplayIcon.jsx";
import HoverableRow from "../common/HoverableRow.jsx";
import { useThemeColors } from "../../hooks/useThemeColors.js";

/* ---------------------------- styles ---------------------------- */

const getStyles = (themeColors) => ({
  tableHeaders: {
    display: "grid",
    alignItems: "center",
    gap: "12px",
    padding: "16px 16px 8px 16px",
    position: "sticky",
    top: 0,
    backgroundColor: "var(--bg-secondary)",
    zIndex: 10,
    borderBottom: "1px solid var(--border-light)",
  },
  headerLabel: {
    fontSize: "0.85rem",
    opacity: 0.7,
    color: "var(--text-primary)",
    minWidth: 0,
  },

  // IMPORTANT: make the panel fill available height and scroll internally
  listPanel: {
    height: "100%",
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
    borderRadius: "18px",
    border: "1px solid var(--border)",
    backgroundColor: "var(--bg-secondary)",
    boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
    overflow: "hidden",
  },

  // Scrollable content area
  scrollArea: {
    flex: 1,
    minHeight: 0,
    overflow: "auto",
    padding: "12px 16px",
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
    color: "var(--text-primary)",
    padding: "12px 8px",
    borderRadius: "12px",
    position: "relative",
    zIndex: 1,
    minWidth: 0,
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
  },

  // Truncation lives in CSS via .truncate, but we keep minWidth:0 to enable it
  name: {
    fontWeight: 600,
    lineHeight: 1.15,
    minWidth: 0,
  },
  description: {
    fontSize: "0.85rem",
    opacity: 0.85,
    marginTop: "2px",
    minWidth: 0,
  },

  countBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "6px 12px",
    borderRadius: "20px",
    backgroundColor: themeColors.bgHover,
    fontSize: "0.85rem",
    color: themeColors.text,
    whiteSpace: "nowrap",
    justifySelf: "start",
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

  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    padding: "32px",
    color: themeColors.textSecondary,
    gap: "8px",
    textAlign: "center",
  },
  emptyTitle: {
    fontWeight: 600,
    color: themeColors.text,
  },
  emptySubtitle: {
    fontSize: "0.9rem",
    maxWidth: 460,
  },
});

// Responsive breakpoints
const getResponsiveStyles = (windowWidth, styles) => {
  // Mobile (< 768px)
  if (windowWidth < 768) {
    return {
      ...styles,
      tableHeaders: {
        ...styles.tableHeaders,
        padding: "12px 12px 8px 12px",
      },
      listPanel: {
        ...styles.listPanel,
        borderRadius: "12px",
      },
      scrollArea: {
        ...styles.scrollArea,
        padding: "10px 12px",
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
  if (windowWidth < 1024) {
    return {
      ...styles,
      tableHeaders: {
        ...styles.tableHeaders,
        padding: "14px 14px 8px 14px",
      },
      listPanel: {
        ...styles.listPanel,
        borderRadius: "16px",
      },
      scrollArea: {
        ...styles.scrollArea,
        padding: "12px 14px",
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

function getGroupMenuItems(group, onEdit, onDelete) {
  return [
    {
      icon: <EditIcon width={15} height={16} color="#1a1a1a" />,
      label: "edit group",
      color: "#1a1a1a",
      onClick: () => onEdit?.(group),
    },
    {
      icon: <TrashIcon width={12} height={14} color="#D51616" />,
      label: "delete group",
      color: "#D51616",
      onClick: () => onDelete?.(group.id),
    },
  ];
}

function formatSharesDisplay(row) {
  // Prefer precomputed display field from GroupsPage (filesDisplay)
  if (row?.filesDisplay != null) return row.filesDisplay;

  const n = Number(row?.files ?? 0);
  if (!Number.isFinite(n) || n === 0) return "-";
  return String(n);
}

function ItemsPill({ items, type, totalCount, getKey, styles }) {
  const itemsList = Array.isArray(items) ? items : [];
  const show = itemsList.slice(0, 3);
  const count = totalCount || itemsList.length;
  const extra = Math.max(count - show.length, 0);

  if (count === 0) {
    return <span style={{ opacity: 0.5 }}>—</span>;
  }

  if (show.length === 0) {
    return (
      <div style={styles.countBadge}>
        <span>+ {count}</span>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", minWidth: 0 }}>
      <div style={styles.avatarsContainer}>
        {show.map((item, idx) => (
          <div
            key={getKey(item, idx)}
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

function UsersPill({ row, styles }) {
  return (
    <ItemsPill
      items={row.users}
      type="user"
      totalCount={row.memberCount}
      getKey={(user, idx) => `${user.firstName}-${idx}`}
      styles={styles}
    />
  );
}

function WorkstationsPill({ row, styles }) {
  return (
    <ItemsPill
      items={row.workstations}
      type="workstation"
      getKey={(workstation, idx) => `${workstation.name}-${idx}`}
      styles={styles}
    />
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
  isSelected,
  onToggleSelect,
  rowId,
  styles,
  responsiveStyles,
}) {
  const nameText = r?.name || "";
  const descText = r?.description || "";

  return (
    <>
      <HoverableRow
        style={{
          ...responsiveStyles.row,
          gridTemplateColumns: cols.join(" "),
        }}
      >
        {/* Checkbox - hide on mobile */}
        {!isMobile && (
          <Checkbox checked={isSelected} onChange={() => onToggleSelect(rowId)} />
        )}

        {/* name + description + DisplayIcon */}
        <div style={responsiveStyles.nameSection}>
          <DisplayIcon type="group" data={r} size="small" />
          <div style={styles.nameContainer}>
            <span
              className="truncate"
              style={responsiveStyles.name}
              title={nameText}
            >
              {nameText || "—"}
            </span>
            <span
              className="truncate"
              style={responsiveStyles.description}
              title={descText}
            >
              {descText ? `↳ ${descText}` : "↳ —"}
            </span>
          </div>
        </div>

        {/* users */}
        {showUsers && <UsersPill row={r} styles={styles} />}

        {/* workstations */}
        {showWorkstations && <WorkstationsPill row={r} styles={styles} />}

        {/* files count (Shares) */}
        {showFiles && (
          <div style={styles.countBadge}>
            <span>{formatSharesDisplay(r)}</span>
          </div>
        )}

        {/* edit */}
        <div style={styles.editContainer}>
          <EditButton menuItems={getGroupMenuItems(r, onEdit, onDelete)} />
        </div>
      </HoverableRow>

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
  selectedIds = new Set(),
  allVisibleSelected = false,
  isIndeterminate = false,
  onToggleSelect = () => {},
  onToggleSelectAll = () => {},
}) {
  const themeColors = useThemeColors();
  const styles = getStyles(themeColors);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isMobile = windowWidth < 768;
  const responsiveStyles = useMemo(
    () => getResponsiveStyles(windowWidth, styles),
    [windowWidth, styles]
  );

  // Hide some columns on smaller screens
  const showUsersColumn = showUsers && !isMobile;
  const showWorkstationsColumn = showWorkstations && windowWidth >= 1024;
  const showFilesColumn = showFiles && windowWidth >= 1024;

  // Build grid template dynamically based on which columns are visible.
  const cols = [
    !isMobile ? "28px" : null, // checkbox - hidden on mobile
    isMobile ? "1fr" : "1.2fr", // name/description
    showUsersColumn ? (isMobile ? "0.8fr" : "0.6fr") : null,
    showWorkstationsColumn ? "0.8fr" : null,
    showFilesColumn ? "0.8fr" : null,
    "0.25fr", // edit
  ].filter(Boolean);

  const list = Array.isArray(rows) ? rows : [];

  return (
    <div style={responsiveStyles.listPanel}>
      {/* Table Headers - hide on mobile */}
      {!isMobile && (
        <div
          style={{
            ...responsiveStyles.tableHeaders,
            gridTemplateColumns: cols.join(" "),
            paddingLeft: windowWidth < 1024 ? "14px" : "16px",
            paddingRight: windowWidth < 1024 ? "14px" : "16px",
          }}
        >
          <Checkbox
            checked={allVisibleSelected}
            indeterminate={isIndeterminate}
            onChange={onToggleSelectAll}
          />
          <span className="truncate" style={styles.headerLabel} title="Name / Description">
            Name/Description
          </span>
          {showUsersColumn && (
            <span className="truncate" style={styles.headerLabel} title="Users">
              Users
            </span>
          )}
          {showWorkstationsColumn && (
            <span className="truncate" style={styles.headerLabel} title="Workstations">
              Workstations
            </span>
          )}
          {showFilesColumn && (
            <span className="truncate" style={styles.headerLabel} title="Shares">
              Shares
            </span>
          )}
          <div />
        </div>
      )}

      {/* Scrollable content area (keeps panel full-height) */}
      <div style={responsiveStyles.scrollArea}>
        {list.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyTitle}>No groups found</div>
            <div style={styles.emptySubtitle}>
              Try adjusting your search or filters, or create a new group.
            </div>
          </div>
        ) : (
          <div style={styles.container}>
            {list.map((r, idx) => (
              <GroupRow
                key={r.id || r._id || idx}
                r={r}
                cols={cols}
                showUsers={showUsersColumn}
                showWorkstations={showWorkstationsColumn}
                showFiles={showFilesColumn}
                onEdit={onEdit}
                onDelete={onDelete}
                isLast={idx === list.length - 1}
                isMobile={isMobile}
                isSelected={selectedIds.has(r._id)}
                onToggleSelect={onToggleSelect}
                rowId={r._id}
                styles={styles}
                responsiveStyles={responsiveStyles}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}