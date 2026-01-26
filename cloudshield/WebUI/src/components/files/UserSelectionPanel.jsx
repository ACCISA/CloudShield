import React, { useState, useMemo } from "react";
import DisplayIcon from "../common/DisplayIcon/DisplayIcon.jsx";
import Tooltip from "@mui/material/Tooltip";
import "./UserSelectionPanel.css";

/**
 * Two-panel user selection component inspired by GroupsPage
 * Left panel: searchable list with checkmarks
 * Right panel: selected users as cards with remove buttons
 */
export default function UserSelectionPanel({
  availableUsers = [],
  selectedUsers = [],
  onSelectionChange,
}) {
  const [searchTerm, setSearchTerm] = useState("");

  // Filter users based on search
  const filteredUsers = useMemo(() => {
    if (!searchTerm.trim()) return availableUsers;
    const search = searchTerm.toLowerCase();
    return availableUsers.filter((user) => {
      const username = typeof user === "string" ? user : user.username || "";
      const fullName = typeof user === "object" ? user.full_name || "" : "";
      return (
        username.toLowerCase().includes(search) ||
        fullName.toLowerCase().includes(search)
      );
    });
  }, [availableUsers, searchTerm]);

  // Normalize user to object
  const normalizeUser = (user) => {
    if (typeof user === "string") {
      return { id: user, username: user };
    }
    return user;
  };

  // Get user ID
  const getUserId = (user) => {
    const normalized = normalizeUser(user);
    return normalized.id || normalized.username;
  };

  // Check if user is selected
  const isSelected = (user) => {
    const userId = getUserId(user);
    return selectedUsers.some((u) => getUserId(u) === userId);
  };

  // Toggle user selection
  const handleToggle = (user) => {
    const userId = getUserId(user);
    if (isSelected(user)) {
      onSelectionChange(selectedUsers.filter((u) => getUserId(u) !== userId));
    } else {
      onSelectionChange([...selectedUsers, user]);
    }
  };

  // Remove user
  const handleRemove = (userId) => {
    onSelectionChange(selectedUsers.filter((u) => getUserId(u) !== userId));
  };

  // Get display name
  const getDisplayName = (user) => {
    const normalized = normalizeUser(user);
    if (normalized.full_name) return normalized.full_name;
    if (normalized.firstName && normalized.lastName) {
      return `${normalized.firstName} ${normalized.lastName}`;
    }
    return normalized.username || "Unknown";
  };

  return (
    <div className="user-selection-panel">
      {/* Left Panel: Search and List */}
      <div className="user-selection-search-section">
        <label className="user-selection-label">Add Users</label>
        <input
          type="text"
          className="user-selection-search"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search users..."
        />

        <div className="user-selection-dropdown">
          {filteredUsers.length === 0 ? (
            <div
              className="user-selection-dropdown-item"
              style={{ opacity: 0.7, cursor: "default" }}
            >
              No users found
            </div>
          ) : (
            filteredUsers.map((user) => {
              const normalized = normalizeUser(user);
              const selected = isSelected(user);
              const isActive = normalized.active !== undefined ? normalized.active : true;

              return (
                <div
                  key={getUserId(user)}
                  className={`user-selection-dropdown-item ${selected ? "selected" : ""}`}
                  onClick={() => handleToggle(user)}
                >
                  <DisplayIcon type="user" data={normalized} size="small" showHoverCard={true} />
                  <div className="user-selection-dropdown-item-info">
                    <div className="user-selection-dropdown-item-name">
                      {getDisplayName(user)}
                    </div>
                  </div>
                  {selected && (
                    <span className="user-selection-checkmark">✓</span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Panel: Selected Users */}
      {selectedUsers.length > 0 && (
        <div className="user-selection-selected-section">
          <div className="user-selection-selected-header">
            Selected Users ({selectedUsers.length})
          </div>
          <div className="user-selection-selected-cards">
            {selectedUsers.map((user) => {
              const normalized = normalizeUser(user);
              return (
                <div
                  key={getUserId(user)}
                  className="user-selection-selected-card"
                >
                  <button
                    type="button"
                    className="user-selection-card-remove-btn"
                    onClick={() => handleRemove(getUserId(user))}
                  >
                    ×
                  </button>
                  <DisplayIcon type="user" data={normalized} size="medium" showHoverCard={true} />
                  <span className="user-selection-selected-card-name">
                    {getDisplayName(user)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
