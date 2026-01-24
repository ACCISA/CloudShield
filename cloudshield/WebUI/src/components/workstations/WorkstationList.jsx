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

import React, { useState } from "react";
import EditButton from "../common/EditButton/EditButton.jsx";
import EditIcon from "../../assets/EditIcon.jsx";
import TrashIcon from "../../assets/TrashIcon.jsx";
import ActiveIcon from "../../assets/ActiveIcon.jsx";
import StatusButton from "../common/StatusButton/StatusButton.jsx";
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
  leadingCircle: {
    width: "28px",
    height: "28px",
    borderRadius: "50%",
    backgroundColor: "#2A2A2A",
  },
  nameContainer: {
    display: "flex",
    flexDirection: "column",
  },
  name: {
    fontWeight: 600,
    lineHeight: 1.15,
  },
  code: {
    fontSize: "0.85rem",
    opacity: 0.85,
    marginTop: "2px",
  },
  usersPill: {
    display: "flex",
    alignItems: "center",
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
  },
  currentContainer: {
    display: "flex",
    alignItems: "center",
  },
  lastUsed: {
    opacity: 0.9,
  },
  statusLight: {
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
      ? row.users
      : [row.currentUser || "—"];

  const show = list.slice(0, 3);
  const extra = Math.max((row.usersCount ?? list.length) - show.length, 0);

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
}) {
  const [checked, setChecked] = useState(false);

  return (
    <>
      {/* Row */}
      <div
        style={{
          ...styles.row,
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
        {/* select */}
        <Checkbox checked={checked} onChange={setChecked} />

        {/* name + code + DisplayIcon */}
        <div style={styles.nameSection}>
          <DisplayIcon type="workstation" data={r} size="small" />
          <div style={styles.nameContainer}>
            <span style={styles.name}>{r.name}</span>
            <span style={styles.code}>↳ {r.code}</span>
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
        <div>
          <StatusButton
            status={r.status}
            onClick={() => onToggleStatus?.(r.id)}
          />
        </div>

        {/* status light - ActiveIcon */}
        <div style={{ ...styles.statusLight, marginRight: "-16px" }}>
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
      </div>

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
  showUsers = true,
  showCurrent = true,
  showLastUsed = true,
}) {
  // Build grid template dynamically based on which columns are visible.
  const cols = [
    "28px", // checkbox
    "1.2fr", // name/code with icon
    showUsers ? "0.9fr" : null,
    showCurrent ? "0.6fr" : null,
    showLastUsed ? "0.8fr" : null,
    "0.7fr", // chip
    "24px", // status light
    "0.25fr", // edit
  ].filter(Boolean);

  return (
    <>
      {/* Table Headers */}
      <div
        style={{
          ...styles.tableHeaders,
          gridTemplateColumns: cols.join(" "),
          paddingLeft: "calc(16px + 8px + 8px)",
          paddingRight: "calc(16px + 8px + 8px)",
        }}
      >
        <div />
        <span style={styles.headerLabel}>Name/Number</span>
        {showUsers && <span style={styles.headerLabel}>Users</span>}
        {showCurrent && <span style={styles.headerLabel}>Current</span>}
        {showLastUsed && <span style={styles.headerLabel}>Last Used</span>}
        <div />
        <div />
        <div />
      </div>

      {/* List panel */}
      <div style={styles.listPanel}>
        <div style={{ padding: "0 8px" }}>
          <div style={styles.container}>
            {rows.map((r, idx) => (
              <WorkstationRow
                key={r.id}
                r={r}
                cols={cols}
                showUsers={showUsers}
                showCurrent={showCurrent}
                showLastUsed={showLastUsed}
                onEdit={onEdit}
                onDelete={onDelete}
                onToggleStatus={onToggleStatus}
                isLast={idx === rows.length - 1}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
