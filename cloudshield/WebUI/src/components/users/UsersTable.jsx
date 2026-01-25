import React from "react";
import UserRow from "./UserRow.jsx";

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
  },
};

export default function UsersTable({
  users,
  showTitle,
  showWorkstations,
  showGroups,
  showFiles,
  onSort,
  sortField,
  sortDir,
  onEdit,
  onDelete,
}) {
  // Build grid template dynamically based on which columns are visible.
  const cols = [
    "28px", // checkbox
    "1.2fr", // name/email with icon
    showTitle ? "0.9fr" : null,
    showWorkstations ? "0.6fr" : null,
    showGroups ? "0.8fr" : null,
    showFiles ? "0.8fr" : null,
    "24px", // status
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
        <span style={styles.headerLabel}>Name/Email</span>
        {showTitle && <span style={styles.headerLabel}>Title</span>}
        {showWorkstations && (
          <span style={styles.headerLabel}>Workstations</span>
        )}
        {showGroups && <span style={styles.headerLabel}>Groups</span>}
        {showFiles && <span style={styles.headerLabel}>Files</span>}
        <div />
        <div />
      </div>

      {/* List panel */}
      <div style={styles.listPanel}>
        <div style={{ padding: "0 8px" }}>
          {users.map((u, idx) => (
            <UserRow
              key={u.id}
              data={u}
              showTitle={showTitle}
              showWorkstations={showWorkstations}
              showGroups={showGroups}
              showFiles={showFiles}
              onEdit={() => onEdit(u)}
              onDelete={() => onDelete(u)}
              isLast={idx === users.length - 1}
              cols={cols}
            />
          ))}
        </div>
      </div>
    </>
  );
}
