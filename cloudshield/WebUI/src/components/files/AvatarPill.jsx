import React from "react";
import DisplayIcon from "../common/DisplayIcon/DisplayIcon.jsx";
import Tooltip from "@mui/material/Tooltip";

/**
 * Displays overlapping avatar circles for users/groups with "+N more" indicator
 * Inspired by GroupsList's ItemsPill pattern
 * 
 * @param {Array} items - Array of users or groups (strings or objects)
 * @param {string} type - Either "user" or "group"
 * @param {number} maxVisible - Maximum avatars to show before "+N" (default: 3)
 */
export default function AvatarPill({ items = [], type = "user", maxVisible = 3 }) {
  // Normalize items to objects
  const normalizeItem = (item) => {
    if (typeof item === "string") {
      return type === "user" 
        ? { username: item, id: item }
        : { name: item, groupName: item, id: item };
    }
    return item;
  };

  const normalizedItems = items.map(normalizeItem);
  const visibleItems = normalizedItems.slice(0, maxVisible);
  const hiddenItems = normalizedItems.slice(maxVisible);
  const hiddenCount = hiddenItems.length;

  if (items.length === 0) {
    return <span style={{ color: '#999' }}>—</span>;
  }

  const styles = {
    container: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
    },
    avatarsContainer: {
      display: "flex",
      alignItems: "center",
    },
    avatarWrapper: (idx) => ({
      marginLeft: idx === 0 ? 0 : "-8px",
      zIndex: visibleItems.length - idx,
      display: "flex",
      alignItems: "center",
      transition: "transform 0.2s ease",
    }),
    extraCount: {
      fontSize: "12px",
      color: "#ffffff",
      fontWeight: "500",
      padding: "2px 8px",
      backgroundColor: "rgba(255, 255, 255, 0.1)",
      borderRadius: "12px",
      cursor: "help",
    },
  };

  // Get display name for tooltip
  const getDisplayName = (item) => {
    if (type === "user") {
      if (item.full_name) return item.full_name;
      if (item.firstName && item.lastName) return `${item.firstName} ${item.lastName}`;
      return item.username || item.email || "Unknown";
    }
    return item.name || item.groupName || "Unknown";
  };

  return (
    <div style={styles.container}>
      <div style={styles.avatarsContainer}>
        {visibleItems.map((item, idx) => (
          <div
            key={item.id || idx}
            style={styles.avatarWrapper(idx)}
          >
            <DisplayIcon type={type} data={item} size="small" showHoverCard={true} />
          </div>
        ))}
      </div>
      
      {hiddenCount > 0 && (
        <Tooltip
          title={
            <div style={{ padding: "4px" }}>
              {hiddenItems.map((item, idx) => (
                <div key={item.id || idx} style={{ padding: "2px 0" }}>
                  {getDisplayName(item)}
                </div>
              ))}
            </div>
          }
          arrow
          placement="top"
        >
          <span style={styles.extraCount}>+{hiddenCount}</span>
        </Tooltip>
      )}
    </div>
  );
}
