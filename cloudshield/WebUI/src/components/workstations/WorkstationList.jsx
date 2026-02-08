/**
 * WorkstationList.jsx
 *
 * Purpose:
 *   Render a list of workstation rows with actions like edit and connect/disconnect,
 *   matching the mock (avatar stack for Users, dot-only for Current, chip-style status).
 *
 * Props:
 *   - rows: array of workstation objects to display
 *   - onEdit(row)
 *   - onDelete(id)
 *   - onToggleStatus(id)
 *   - showUsers: boolean (Display control)
 *   - showCurrent: boolean (Display control)
 *   - showLastUsed: boolean (Display control)
 */

import React, { useState, useEffect } from "react";
import EditButton from "../common/EditButton/EditButton.jsx";
import EditIcon from "../../assets/EditIcon.jsx";
import TrashIcon from "../../assets/TrashIcon.jsx";
import ActiveIcon from "../../assets/ActiveIcon.jsx";
import StatusButton from "../common/StatusButton/StatusButton.jsx";
import Checkbox from "../common/Checkbox/Checkbox.jsx";
import DisplayIcon from "../common/DisplayIcon/DisplayIcon.jsx";
import HoverableRow from "../common/HoverableRow.jsx";

/* ---------------------------- styles ---------------------------- */

const styles = {
  tableHeaders: {
    display: "grid",
    alignItems: "center",
    gap: "12px",
    padding: "24px 24px 4px 24px",
    position: "sticky",
    top: 0,
    backgroundColor: "#0D0D0D",
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
    backgroundColor: "#0F0F0F",
    boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
    padding: "16px",
    overflow: "auto",
  },
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
    overflow: "hidden",
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
    minWidth: 0,
  },
  nameSection: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    minWidth: 0,
    overflow: "hidden",
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
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  code: {
    fontSize: "0.85rem",
    opacity: 0.85,
    marginTop: "2px",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  usersPill: {
    display: "flex",
    alignItems: "center",
    minWidth: 0,
  },
  avatarsContainer: {
    display: "flex",
    alignItems: "center",
  },
  avatar: {
    width: "24px",
    height: "24px",
    fontSize: "0.7rem",
    border: "2px solid #0F0F0F",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 600,
  },
  extraCount: {
    marginLeft: "8px",
    fontSize: "0.9rem",
    opacity: 0.85,
    whiteSpace: "nowrap",
  },
  currentContainer: {
    display: "flex",
    alignItems: "center",
    minWidth: 0,
  },
  lastUsed: {
    opacity: 0.9,
    minWidth: 0,
  },
  statusButtonContainer: {
    display: "flex",
    alignItems: "center",
  },
  statusLight: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginRight: "-60px",
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
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      },
      code: {
        ...styles.code,
        fontSize: "0.8rem",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
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

/* ---------------------------- helpers & visuals ---------------------------- */

const colorPool = [
  "#6573C3",
  "#00B0FF",
  "#66BB6A",
  "#FFB74D",
  "#BA68C8",
  "#EF5350",
];
const initials = (name = "—") =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");

function tinyAvatar(name, i) {
  return (
    <div
      key={`${name}-${i}`}
      style={{
        ...styles.avatar,
        backgroundColor: colorPool[i % colorPool.length],
        marginLeft: i === 0 ? 0 : "-8px",
      }}
    >
      {initials(name)}
    </div>
  );
}

function UsersPill({ row }) {
  const list =
    Array.isArray(row.users) && row.users.length
      ? row.users.filter(Boolean)
      : row.currentUser
        ? [row.currentUser]
        : [];

  const show = list.slice(0, 3);
  const extra = Math.max(list.length - show.length, 0);

  if (list.length === 0) {
    return <span style={{ opacity: 0.5 }}>—</span>;
  }

  return (
    <div style={styles.usersPill}>
      <div style={styles.avatarsContainer}>
        {show.map((user, idx) => {
          // Handle both string (legacy) and object format
          const userData =
            typeof user === "string"
              ? {
                  firstName: user.split(" ")[0],
                  lastName: user.split(" ")[1] || "",
                }
              : user;

          return (
            <div
              key={`${userData.firstName}-${idx}`}
              style={{
                marginLeft: idx === 0 ? 0 : "-8px",
                zIndex: show.length - idx,
                display: "flex",
                alignItems: "center",
              }}
            >
              <DisplayIcon type="user" data={userData} size="small" />
            </div>
          );
        })}
      </div>
      {extra > 0 && <span style={styles.extraCount}>+ {extra}</span>}
    </div>
  );
}

/* --------------------------------- component -------------------------------- */

function WorkstationRow({
  r,
  cols,
  showUsers,
  showCurrent,
  showLastUsed,
  onEdit,
  onDelete,
  onToggleStatus,
  isLast,
  isMobile,
  isTablet,
  isSelected,
  onToggleSelect,
}) {
  const responsiveStyles = getResponsiveStyles();

  return (
    <>
      {/* Row */}
      <HoverableRow
        style={{
          ...responsiveStyles.row,
          gridTemplateColumns: cols.join(" "),
        }}
      >
        {/* select - hide on mobile */}
        {!isMobile && (
          <Checkbox checked={isSelected} onChange={onToggleSelect} />
        )}

        {/* name + code + DisplayIcon */}
        <div style={responsiveStyles.nameSection}>
          <DisplayIcon type="workstation" data={r} size="small" />
          <div style={styles.nameContainer}>
            <span style={responsiveStyles.name}>{r.name}</span>
            <span style={responsiveStyles.code}>↳ {r.code}</span>
          </div>
        </div>

        {/* users */}
        {showUsers && <UsersPill row={r} />}

        {/* current -> DisplayIcon for current user */}
        {showCurrent && (
          <div style={styles.currentContainer}>
            {r.currentUser && r.currentUser !== "—" ? (
              <DisplayIcon
                type="user"
                data={
                  typeof r.currentUser === "string"
                    ? {
                        firstName: r.currentUser.split(" ")[0],
                        lastName: r.currentUser.split(" ")[1] || "",
                      }
                    : r.currentUser
                }
                size="small"
              />
            ) : (
              <span style={{ opacity: 0.5, fontSize: "0.85rem" }}>—</span>
            )}
          </div>
        )}

        {/* last used */}
        {showLastUsed && (
          <span style={styles.lastUsed}>{r.lastUsed || "—"}</span>
        )}

        {/* status button */}
        <div style={styles.statusButtonContainer}>
          <StatusButton
            status={r.status}
            onClick={() => onToggleStatus?.(r.id)}
          />
        </div>

        {/* status light - ActiveIcon - moved next to edit */}
        <div style={styles.statusLight}>
          <ActiveIcon
            width={12}
            height={12}
            outerColor={r.status === "connected" ? "#1F381F" : "#381F1F"}
            innerColor={r.status === "connected" ? "#04C40A" : "#ff5252"}
          />
        </div>

        {/* edit */}
        <div style={styles.editContainer}>
          <EditButton
            menuItems={[
              {
                icon: <EditIcon width={15} height={16} color="#1a1a1a" />,
                label: "edit workstation",
                color: "#1a1a1a",
                onClick: () => onEdit?.(r),
              },
              {
                icon: <TrashIcon width={12} height={14} color="#D51616" />,
                label: "delete workstation",
                color: "#D51616",
                onClick: () => onDelete?.(r.id),
              },
            ]}
          />
        </div>
      </HoverableRow>

      {/* divider */}
      {!isLast && <div style={styles.divider} />}
    </>
  );
}

export default function WorkstationList({
  rows,
  onEdit,
  onDelete,
  onToggleStatus,
  selectedIds = new Set(),
  allVisibleSelected = false,
  isIndeterminate = false,
  onToggleSelect = () => {},
  onToggleSelectAll = () => {},
  showUsers = true,
  showCurrent = true,
  showLastUsed = true,
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
  const showCurrentColumn = showCurrent && windowWidth >= 1024;
  const showLastUsedColumn = showLastUsed && windowWidth >= 1024;

  // Build grid template dynamically based on which columns are visible.
  const cols = [
    !isMobile ? "28px" : null, // checkbox - hidden on mobile
    isMobile ? "minmax(100px, 1fr)" : "minmax(140px, 1.2fr)", // name/code with icon - reduced min width
    showUsersColumn ? (isMobile ? "0.8fr" : "minmax(80px, 0.9fr)") : null,
    showCurrentColumn ? "minmax(60px, 0.6fr)" : null,
    showLastUsedColumn ? "minmax(80px, 0.8fr)" : null,
    isMobile ? "40px" : "100px", // status button - reduced width
    "28px", // status light - moved next to edit
    "40px", // edit - fixed width, always visible
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
          <Checkbox
            checked={allVisibleSelected}
            indeterminate={isIndeterminate}
            onChange={onToggleSelectAll}
          />
          <span style={styles.headerLabel}>Name/Number</span>
          {showUsersColumn && <span style={styles.headerLabel}>Users</span>}
          {showCurrentColumn && <span style={styles.headerLabel}>Current</span>}
          {showLastUsedColumn && (
            <span style={styles.headerLabel}>Last Used</span>
          )}
          <div />
          <div />
          <div />
        </div>
      )}

      {/* List panel */}
      <div
        style={{
          ...responsiveStyles.listPanel,
          marginTop: isMobile ? "24px" : "0",
        }}
      >
        <div
          style={{
            padding: isMobile ? "0 4px" : "0 8px",
          }}
        >
          <div style={styles.container}>
            {rows.map((r, idx) => (
              <WorkstationRow
                key={r.id}
                r={r}
                cols={cols}
                showUsers={showUsersColumn}
                showCurrent={showCurrentColumn}
                showLastUsed={showLastUsedColumn}
                onEdit={onEdit}
                onDelete={onDelete}
                onToggleStatus={onToggleStatus}
                isLast={idx === rows.length - 1}
                isMobile={isMobile}
                isTablet={isTablet}
                isSelected={selectedIds.has(r.id)}
                onToggleSelect={() => onToggleSelect(r.id)}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
