import React, { useState, useEffect, useMemo } from "react";
import EditButton from "../common/EditButton/EditButton.jsx";
import EditIcon from "../../assets/EditIcon.jsx";
import TrashIcon from "../../assets/TrashIcon.jsx";
import Checkbox from "../common/Checkbox/Checkbox.jsx";
import DisplayIcon from "../common/DisplayIcon/DisplayIcon.jsx";
import HoverableRow from "../common/HoverableRow.jsx";
import EmptyState from "../common/EmptyState/EmptyState.jsx";
import { useThemeColors } from "../../hooks/useThemeColors.js";

/* ---------------------------- styles ---------------------------- */

const getStyles = (themeColors) => ({
  tableHeaders: {
    display: "grid",
    alignItems: "center",
    gap: "12px",
    padding: "24px 24px 4px 24px",
    backgroundColor: "transparent", // FIX: Made transparent, removed sticky logic
  },
  headerLabel: {
    fontSize: "0.85rem",
    opacity: 0.7,
    color: "var(--text-primary)",
    minWidth: 0,
  },
  listPanel: {
    borderRadius: "18px",
    border: "1px solid var(--border)",
    backgroundColor: "var(--bg-secondary)",
    boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
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
    borderTop: "1px solid var(--border-light)",
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
  }
});

// Responsive breakpoints
const getResponsiveStyles = (windowWidth, styles) => {
  if (windowWidth < 768) {
    return {
      ...styles,
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

  if (windowWidth < 1024) {
    return {
      ...styles,
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

  return styles;
};

/* ---------------------------- helpers & components ---------------------------- */

function getGroupMenuItems(group, onEdit, onDelete) {
  return [
    {
      icon: <EditIcon width={15} height={16} color="var(--text-primary)" />,
      label: "edit group",
      color: "var(--text-primary)",
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
        {!isMobile && (
          <Checkbox checked={isSelected} onChange={() => onToggleSelect(rowId)} />
        )}

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

        {showUsers && <UsersPill row={r} styles={styles} />}
        {showWorkstations && <WorkstationsPill row={r} styles={styles} />}
        {showFiles && (
          <div style={styles.countBadge}>
            <span>{formatSharesDisplay(r)}</span>
          </div>
        )}

        <div style={styles.editContainer}>
          <EditButton menuItems={getGroupMenuItems(r, onEdit, onDelete)} />
        </div>
      </HoverableRow>

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

  const showUsersColumn = showUsers && !isMobile;
  const showWorkstationsColumn = showWorkstations && windowWidth >= 1024;
  const showFilesColumn = showFiles && windowWidth >= 1024;

  const cols = [
    !isMobile ? "28px" : null,
    isMobile ? "1fr" : "1.2fr",
    showUsersColumn ? (isMobile ? "0.8fr" : "0.6fr") : null,
    showWorkstationsColumn ? "0.8fr" : null,
    showFilesColumn ? "0.8fr" : null,
    "0.25fr",
  ].filter(Boolean);

  const list = Array.isArray(rows) ? rows : [];

  return (
    <>
      {!isMobile && (
        <div
          style={{
            ...responsiveStyles.tableHeaders,
            gridTemplateColumns: cols.join(" "),
            paddingLeft: isMobile
              ? "calc(12px + 4px + 4px)"
              : windowWidth < 1024
                ? "calc(14px + 8px + 8px)"
                : "calc(16px + 8px + 8px)",
            paddingRight: isMobile
              ? "calc(12px + 4px + 4px)"
              : windowWidth < 1024
                ? "calc(14px + 8px + 8px)"
                : "calc(16px + 8px + 8px)",
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

      <div
        style={{
          ...responsiveStyles.listPanel,
          marginTop: isMobile ? "24px" : "0",
        }}
      >
        {list.length === 0 ? (
          <EmptyState 
            message="No groups found" 
            description="Try adjusting your search or filters, or create a new group." 
          />
        ) : (
          <div
            style={{
              padding: isMobile ? "0 4px" : "0 8px",
            }}
          >
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
          </div>
        )}
      </div>
    </>
  );
}