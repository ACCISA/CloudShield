import React from "react";
import EditButton from "../common/EditButton/EditButton.jsx";
import EditIcon from "../../assets/EditIcon.jsx";
import TrashIcon from "../../assets/TrashIcon.jsx";
import ActiveIcon from "../../assets/ActiveIcon.jsx";
import StatusButton from "../common/StatusButton/StatusButton.jsx";
import Checkbox from "../common/Checkbox/Checkbox.jsx";
import DisplayIcon from "../common/DisplayIcon/DisplayIcon.jsx";
import HoverableRow from "../common/HoverableRow.jsx";
import EmptyState from "../common/EmptyState/EmptyState.jsx";
import { useThemeColors } from "../../hooks/useThemeColors.js";

/* ---------------------------- styles ---------------------------- */

const styles = {
  tableHeaders: {
    display: "grid",
    alignItems: "center",
    gap: "12px",
    padding: "24px 24px 4px 24px",
    backgroundColor: "transparent", // FIX: Made transparent
  },
  headerLabel: {
    fontSize: "0.85rem",
    opacity: 0.7,
    color: "var(--text-primary)",
  },
  listPanel: {
    borderRadius: "18px",
    border: "1px solid var(--border)",
    backgroundColor: "var(--bg-secondary)",
    boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
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
    overflow: "hidden",
  },
  leadingCircle: {
    width: "28px",
    height: "28px",
    borderRadius: "50%",
    backgroundColor: "var(--action-hover)",
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
    border: "2px solid var(--bg-secondary)",
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
    borderTop: "1px solid var(--border-light)",
    margin: "0 8px",
  },
};

/* ---------------------------- helpers & visuals ---------------------------- */

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
  isSelected,
  onToggleSelect,
}) {
  return (
    <>
      <HoverableRow
        style={{
          ...styles.row,
          gridTemplateColumns: cols.join(" "),
        }}
      >
        {/* select */}
        <Checkbox checked={isSelected} onChange={onToggleSelect} />

        <div style={styles.nameSection}>
          <DisplayIcon type="workstation" data={r} size="small" />
          <div style={styles.nameContainer}>
            <span style={styles.name}>{r.name}</span>
            <span style={styles.code}>↳ {r.code}</span>
          </div>
        </div>

        {showUsers && <UsersPill row={r} />}

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

        {showLastUsed && (
          <span style={styles.lastUsed}>{r.lastUsed || "—"}</span>
        )}

        <div style={styles.statusButtonContainer}>
          <StatusButton
            status={r.status}
            onClick={() => onToggleStatus?.(r.id)}
          />
        </div>

        <div style={styles.statusLight}>
          <ActiveIcon
            width={12}
            height={12}
            outerColor={r.status === "connected" ? "#1F381F" : "#381F1F"}
            innerColor={r.status === "connected" ? "#04C40A" : "#ff5252"}
          />
        </div>

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
                label: "edit workstation",
                color: "var(--text-primary)",
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
  const themeColors = useThemeColors();

  const showUsersColumn = showUsers;
  const showCurrentColumn = showCurrent;
  const showLastUsedColumn = showLastUsed;

  const cols = [
    "28px",
    "minmax(140px, 1.2fr)",
    showUsersColumn ? "minmax(80px, 0.9fr)" : null,
    showCurrentColumn ? "minmax(60px, 0.6fr)" : null,
    showLastUsedColumn ? "minmax(80px, 0.8fr)" : null,
    "100px",
    "28px",
    "40px",
  ].filter(Boolean);

  return (
    <>
      <div
        style={{
          ...styles.tableHeaders,
          gridTemplateColumns: cols.join(" "),
          paddingLeft: "calc(16px + 8px + 8px)",
          paddingRight: "calc(16px + 8px + 8px)",
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

      <div
        style={{
          ...styles.listPanel,
          marginTop: "0",
        }}
      >
        {rows.length === 0 ? (
          <EmptyState
            message="No workstations found"
            description="Try adjusting your search or filters, or create a new workstation."
          />
        ) : (
          <div
            style={{
              padding: "0 8px",
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
                  isSelected={selectedIds.has(r.id)}
                  onToggleSelect={() => onToggleSelect(r.id)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
