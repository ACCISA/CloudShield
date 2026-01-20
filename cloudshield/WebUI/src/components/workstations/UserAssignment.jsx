/**
 * UserAssignment.jsx
 *
 * Purpose:
 *   Reusable user assignment component for workstation dialogs.
 *
 * Props:
 *   - users: array of selected user names
 *   - onToggleUser: callback when a user is toggled
 *   - allUsers: boolean for "All users" checkbox
 *   - onAllUsersChange: callback when "All users" changes
 *   - showAllUsersCheckbox: whether to show the "All users" checkbox
 */
import React from "react";

const styles = {
  container: {
    marginTop: "16px",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontWeight: 600,
    color: "#fff",
  },
  checkboxContainer: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  checkbox: {
    width: "18px",
    height: "18px",
    cursor: "pointer",
    accentColor: "#fff",
  },
  checkboxLabel: {
    color: "#fff",
    cursor: "pointer",
  },
  usersGrid: {
    display: "flex",
    gap: "16px",
    flexWrap: "wrap",
    marginTop: "8px",
  },
  userButton: {
    textTransform: "none",
    borderRadius: "10px",
    color: "#fff",
    padding: "6px 12px",
    cursor: "pointer",
    fontSize: "0.875rem",
    border: "1px solid rgba(255,255,255,0.2)",
    background: "transparent",
  },
  userButtonSelected: {
    backgroundColor: "rgba(255,255,255,0.12)",
  },
};

const availableUsers = [
  "Michael Scott",
  "Jim Halpert",
  "Pam Beasly",
  "Dwight Schrute",
];

/**
 * User assignment component with toggle buttons.
 * @param {Object} props
 * @param {Array<string>} props.users - Selected user names
 * @param {Function} props.onToggleUser - Called when a user is toggled
 * @param {boolean} props.allUsers - Whether all users are selected
 * @param {Function} props.onAllUsersChange - Called when "All users" checkbox changes
 * @param {boolean} props.showAllUsersCheckbox - Show the "All users" checkbox
 * @returns {JSX.Element} User assignment section
 */
export default function UserAssignment({
  users,
  onToggleUser,
  allUsers = false,
  onAllUsersChange,
  showAllUsersCheckbox = true,
}) {
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.title}>Assign users</div>
        {showAllUsersCheckbox && (
          <label style={styles.checkboxContainer}>
            <input
              type="checkbox"
              checked={allUsers}
              onChange={(e) => onAllUsersChange?.(e.target.checked)}
              style={styles.checkbox}
            />
            <span style={styles.checkboxLabel}>All users</span>
          </label>
        )}
      </div>
      <div style={styles.usersGrid}>
        {availableUsers.map((u) => (
          <button
            key={u}
            onClick={() => onToggleUser(u)}
            style={{
              ...styles.userButton,
              ...(users.includes(u) ? styles.userButtonSelected : {}),
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.35)";
              e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.08)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)";
              e.currentTarget.style.backgroundColor = users.includes(u)
                ? "rgba(255,255,255,0.12)"
                : "transparent";
            }}
          >
            {u}
          </button>
        ))}
      </div>
    </div>
  );
}
