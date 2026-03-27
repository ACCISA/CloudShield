import React from "react";
import UserRow from "./UserRow.jsx";
import Checkbox from "../common/Checkbox/Checkbox.jsx";
import EmptyState from "../common/EmptyState/EmptyState.jsx";
import { useThemeColors } from "../../hooks/useThemeColors.js";

const styles = {
  tableHeaders: {
    display: "grid",
    alignItems: "center",
    gap: "12px",
    padding: "24px 24px 4px 24px",
    backgroundColor: "transparent",
  },
  headerLabel: {
    fontSize: "0.85rem",
    opacity: 0.7,
    color: "var(--text-primary)",
  },
  listPanel: {
    borderRadius: "18px",
    border: `1px solid var(--border)`,
    backgroundColor: "var(--bg-secondary)",
    boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
    padding: "16px",
  },
};

export default function UsersTable({
  users,
  showTitle,
  showWorkstations,
  showGroups,
  showFiles,
  selectedIds = new Set(),
  allVisibleSelected = false,
  isIndeterminate = false,
  onToggleSelect = () => {},
  onToggleSelectAll = () => {},
  onSort,
  sortField,
  sortDir,
  onEdit,
  onDelete,
}) {
  const themeColors = useThemeColors();

  const showTitleColumn = showTitle;
  const showWorkstationsColumn = showWorkstations;
  const showGroupsColumn = showGroups;
  const showFilesColumn = showFiles;

  const cols = [
    "28px",
    "1.2fr",
    showTitleColumn ? "0.9fr" : null,
    showWorkstationsColumn ? "0.6fr" : null,
    showGroupsColumn ? "0.8fr" : null,
    showFilesColumn ? "0.8fr" : null,
    "24px",
    "0.25fr",
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

      <div style={styles.listPanel}>
        {users.length === 0 ? (
          <EmptyState
            message="No users found"
            description="Try adjusting your search or filters, or create a new user."
          />
        ) : (
          <div style={{ padding: "0 8px" }}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "14px",
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
                  isSelected={selectedIds.has(u.id)}
                  onToggleSelect={() => onToggleSelect(u.id)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
