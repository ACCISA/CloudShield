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

import React from "react";
import EditButton from "../common/EditButton/EditButton.jsx";
import EditIcon from "../../assets/EditIcon.jsx";
import TrashIcon from "../../assets/TrashIcon.jsx";
import ActiveIcon from "../../assets/ActiveIcon.jsx";
import StatusButton from "../common/StatusButton/StatusButton.jsx";

/* ---------------------------- styles ---------------------------- */

const styles = {
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
  },
  checkbox: {
    width: "18px",
    height: "18px",
    cursor: "pointer",
    accentColor: "#fff",
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
  },
  editContainer: {
    display: "flex",
    justifyContent: "flex-start",
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
      : [row.currentUser || "—", "Michael Scott", "Dwight Schrute"];

  const show = list.slice(0, 3);
  const extra = Math.max((row.usersCount ?? list.length) - show.length, 0);

  return (
    <div style={styles.usersPill}>
      <div style={styles.avatarsContainer}>
        {show.map((n, idx) => tinyAvatar(n, idx))}
      </div>
      {extra > 0 && <span style={styles.extraCount}>+ {extra}</span>}
    </div>
  );
}

/* --------------------------------- component -------------------------------- */

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
    "0.25fr", // status light
    "0.25fr", // edit
  ].filter(Boolean);

  return (
    <div style={styles.container}>
      {rows.map((r, idx) => (
        <div key={r.id}>
          {/* Row */}
          <div
            style={{
              ...styles.row,
              gridTemplateColumns: cols.join(" "),
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.02)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "transparent")
            }
          >
            {/* select */}
            <input type="checkbox" style={styles.checkbox} />

            {/* name + code + leading circle */}
            <div style={styles.nameSection}>
              <div style={styles.leadingCircle} />
              <div style={styles.nameContainer}>
                <span style={styles.name}>{r.name}</span>
                <span style={styles.code}>↳ {r.code}</span>
              </div>
            </div>

            {/* users */}
            {showUsers && <UsersPill row={r} />}

            {/* current -> ActiveIcon based on user status */}
            {showCurrent && (
              <div style={styles.currentContainer}>
                <ActiveIcon
                  width={12}
                  height={12}
                  outerColor={
                    r.currentUser && r.currentUser !== "—"
                      ? "#1F381F"
                      : "#381F1F"
                  }
                  innerColor={
                    r.currentUser && r.currentUser !== "—"
                      ? "#04C40A"
                      : "#ff5252"
                  }
                />
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
          </div>

          {/* divider */}
          {idx !== rows.length - 1 && <div style={styles.divider} />}
        </div>
      ))}
    </div>
  );
}
