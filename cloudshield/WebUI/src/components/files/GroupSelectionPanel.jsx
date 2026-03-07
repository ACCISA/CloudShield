import React, { useState, useMemo } from "react";
import Checkbox from "../common/Checkbox/Checkbox.jsx";
import DisplayIcon from "../common/DisplayIcon/DisplayIcon.jsx";
import "./GroupSelectionPanel.css";

/**
 * Group selection component matching GroupsModal styling
 * Search dropdown on top, selected groups displayed as cards below
 */
export default function GroupSelectionPanel({
  availableGroups = [],
  selectedGroups = [],
  onSelectionChange,
}) {
  const [searchTerm, setSearchTerm] = useState("");

  // Calculate indeterminate state
  const hasSelected = selectedGroups.length > 0;
  const allAreSelected =
    selectedGroups.length === availableGroups.length &&
    availableGroups.length > 0;
  const isIndeterminate = hasSelected && !allAreSelected;

  // Handle Select All
  const handleSelectAll = () => {
    if (hasSelected && !allAreSelected) {
      // Indeterminate state - deselect all
      onSelectionChange([]);
    } else if (!hasSelected) {
      // Nothing selected - select all
      onSelectionChange(availableGroups);
    } else {
      // All selected - deselect all
      onSelectionChange([]);
    }
  };

  // Filter groups based on search
  const filteredGroups = useMemo(() => {
    if (!searchTerm.trim()) return availableGroups;
    const search = searchTerm.toLowerCase();
    return availableGroups.filter((group) => {
      const groupName =
        typeof group === "string" ? group : group.name || group.groupName || "";
      return groupName.toLowerCase().includes(search);
    });
  }, [availableGroups, searchTerm]);

  // Normalize group to object
  const normalizeGroup = (group) => {
    if (typeof group === "string") {
      return { id: group, name: group, groupName: group };
    }
    // Pass through all group data including member_count, members_info, etc.
    return {
      ...group,
      name: group.name || group.group_name || group.groupName,
      groupName: group.group_name || group.name || group.groupName,
    };
  };

  // Get group ID
  const getGroupId = (group) => {
    const normalized = normalizeGroup(group);
    return normalized.id || normalized.name || normalized.groupName;
  };

  // Check if group is selected
  const isSelected = (group) => {
    const groupId = getGroupId(group);
    return selectedGroups.some((g) => getGroupId(g) === groupId);
  };

  // Toggle group selection
  const handleToggle = (group) => {
    const groupId = getGroupId(group);
    if (isSelected(group)) {
      onSelectionChange(
        selectedGroups.filter((g) => getGroupId(g) !== groupId),
      );
    } else {
      onSelectionChange([...selectedGroups, group]);
    }
  };

  // Remove group
  const handleRemove = (groupId) => {
    onSelectionChange(selectedGroups.filter((g) => getGroupId(g) !== groupId));
  };

  // Get display name
  const getDisplayName = (group) => {
    const normalized = normalizeGroup(group);
    return normalized.name || normalized.groupName || "Unknown";
  };

  return (
    <div className="group-selection-container">
      <div className="group-selection-search-section">
        <div className="group-selection-label-row">
          <label className="group-selection-label">Add Groups</label>
          <div className="group-selection-all-toggle">
            <Checkbox
              checked={allAreSelected}
              indeterminate={isIndeterminate}
              onChange={handleSelectAll}
            />
            <span>All Groups</span>
          </div>
        </div>
        <input
          type="text"
          className="group-selection-search"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search groups..."
        />

        <div className="group-selection-dropdown">
          {filteredGroups.length === 0 ? (
            <div
              className="group-selection-dropdown-item"
              style={{ opacity: 0.7, cursor: "default" }}
            >
              No groups found
            </div>
          ) : (
            filteredGroups.map((group) => {
              const normalized = normalizeGroup(group);
              const selected = isSelected(group);

              return (
                <div
                  key={getGroupId(group)}
                  className={`group-selection-dropdown-item ${selected ? "selected" : ""}`}
                  onClick={() => handleToggle(group)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleToggle(group);
                    }
                  }}
                >
                  <DisplayIcon
                    type="group"
                    data={normalized}
                    size="small"
                    showHoverCard={true}
                  />
                  <div className="group-selection-dropdown-item-info">
                    <div className="group-selection-dropdown-item-name">
                      {getDisplayName(group)}
                    </div>
                    {normalized.member_count !== undefined && (
                      <div className="group-selection-dropdown-item-detail">
                        {normalized.member_count}{" "}
                        {normalized.member_count === 1 ? "member" : "members"}
                      </div>
                    )}
                  </div>
                  {selected && (
                    <span className="group-selection-checkmark">✓</span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Selected Groups Section */}
      {selectedGroups.length > 0 && (
        <div className="group-selection-selected-section">
          <div className="group-selection-selected-header">
            Selected Groups ({selectedGroups.length})
          </div>
          <div className="group-selection-selected-cards">
            {selectedGroups.map((group) => {
              const normalized = normalizeGroup(group);
              return (
                <div
                  key={getGroupId(group)}
                  className="group-selection-selected-card"
                >
                  <button
                    type="button"
                    className="group-selection-card-remove-btn"
                    onClick={() => handleRemove(getGroupId(group))}
                  >
                    ×
                  </button>
                  <DisplayIcon
                    type="group"
                    data={normalized}
                    size="small"
                    showHoverCard={true}
                  />
                  <span className="group-selection-selected-card-name">
                    {getDisplayName(group)}
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
