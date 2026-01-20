/**
 * AssignmentCard.jsx
 *
 * Displays an assigned item (workstation, group, or file) with:
 * - Avatar with initials or icon
 * - Name and ID
 * - Remove button (X)
 */

import { getColorFromString, getInitials } from "../../utils/avatarUtils";

const styles = {
  card: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    backgroundColor: "#1E1E1E",
    borderRadius: "12px",
    padding: "12px",
    border: "1px solid rgba(255,255,255,0.12)",
    minWidth: "140px",
    transition: "all 0.2s",
  },
  cardHover: {
    backgroundColor: "#252525",
    borderColor: "rgba(255,255,255,0.2)",
  },
  avatar: {
    width: "40px",
    height: "40px",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    fontWeight: 600,
    fontSize: "0.9rem",
    flexShrink: 0,
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: "0.875rem",
    fontWeight: 500,
    color: "#fff",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    margin: 0,
  },
  code: {
    fontSize: "0.75rem",
    color: "rgba(255,255,255,0.5)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    margin: 0,
  },
  removeButton: {
    position: "absolute",
    top: "-8px",
    right: "-8px",
    width: "24px",
    height: "24px",
    backgroundColor: "#EF4444",
    color: "#fff",
    border: "none",
    borderRadius: "50%",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "16px",
    transition: "background-color 0.2s",
  },
  removeButtonHover: {
    backgroundColor: "#DC2626",
  },
};

export default function AssignmentCard({
  item,
  onRemove,
  type = "workstation",
}) {
  const { id, name, code } = item;
  const displayName = name || code || id;
  const avatarColor = getColorFromString(displayName);
  const initials = getInitials(displayName);

  return (
    <div
      style={styles.card}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor =
          styles.cardHover.backgroundColor;
        e.currentTarget.style.borderColor = styles.cardHover.borderColor;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = styles.card.backgroundColor;
        e.currentTarget.style.borderColor = styles.card.border.split(" ")[2];
      }}
    >
      {/* Avatar */}
      <div style={{ ...styles.avatar, backgroundColor: avatarColor }}>
        {initials}
      </div>

      {/* Info */}
      <div style={styles.info}>
        <div style={styles.name}>{displayName}</div>
        {code && name && <div style={styles.code}>{code}</div>}
      </div>

      {/* Remove button */}
      <button
        onClick={() => onRemove(item)}
        style={styles.removeButton}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor =
            styles.removeButtonHover.backgroundColor;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor =
            styles.removeButton.backgroundColor;
        }}
        aria-label="Remove"
      >
        ×
      </button>
    </div>
  );
}
