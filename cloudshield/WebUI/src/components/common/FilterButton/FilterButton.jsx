import React from "react";
import FilterIcon from "../../../assets/FilterIcon.jsx";
import ActiveIcon from "../../../assets/ActiveIcon.jsx";
import { usePopover } from "../hooks/usePopover.js";
import { useThemeColors } from "../../../hooks/useThemeColors.js";
import {
  buttonStyle as baseButtonStyle,
  getButtonStyle,
  getPopoverStyle,
  getPopoverStyleLegacy,
  backdropStyle,
  buttonHoverHandlers,
  getButtonHoverHandlers,
} from "../styles/popoverStyles.js";

/**
 * FilterButton Component
 *
 * A reusable filter button with dynamic filter options based on the page context.
 *
 * @param {Array} filterGroups - Array of filter group objects with structure:
 *   [{
 *     id: string,
 *     label: string,
 *     type: 'checkbox' | 'radio',
 *     options: [{ value: string, label: string }]
 *   }]
 * @param {Object} activeFilters - Object containing active filter values by group id
 * @param {Function} onFilterChange - Callback function: (groupId, value, isActive) => void
 * @param {Object} style - Additional inline styles
 */
export default function FilterButton({
  filterGroups = [],
  activeFilters = {},
  onFilterChange,
  style = {},
}) {
  const themeColors = useThemeColors();
  const popover = usePopover({ popoverWidth: 320, popoverHeight: 500 });

  const handleFilterToggle = (groupId, value) => {
    const group = filterGroups.find((g) => g.id === groupId);
    if (!group) return;

    const currentFilters = activeFilters[groupId] || new Set();
    const isActive = currentFilters.has(value);

    onFilterChange?.(groupId, value, !isActive);
  };

  const buttonStyle = getButtonStyle(themeColors);
  const popoverStyle = {
    ...getPopoverStyle(themeColors, "320px"),
    maxHeight: "500px",
    overflowY: "auto",
  };
  const hoverHandlers = getButtonHoverHandlers(themeColors);

  const filterGroupStyle = {
    marginBottom: "16px",
  };

  const filterGroupLabelStyle = {
    fontSize: "12px",
    fontWeight: "600",
    opacity: 0.7,
    marginBottom: "8px",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    color: themeColors.textSecondary,
  };

  const filterOptionStyle = (isActive) => ({
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "8px 12px",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "all 0.2s ease",
    backgroundColor: "transparent",
    marginBottom: "4px",
  });

  const checkboxStyle = (isActive) => ({
    width: "16px",
    height: "16px",
    border: `2px solid ${themeColors.border}`,
    borderRadius: "4px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: isActive ? themeColors.secondary : "transparent",
    transition: "all 0.2s ease",
  });

  const checkmarkStyle = {
    width: "10px",
    height: "10px",
    color: themeColors.bgPrimary,
  };

  const labelStyle = (isActive) => ({
    fontSize: "14px",
    fontWeight: isActive ? 500 : 400,
    flex: 1,
    display: "flex",
    alignItems: "center",
    gap: "8px",
    color: themeColors.text,
  });

  const toggleSwitchStyle = (isActive) => ({
    width: "44px",
    height: "24px",
    backgroundColor: isActive
      ? themeColors.secondary
      : themeColors.border,
    borderRadius: "12px",
    position: "relative",
    transition: "all 0.2s ease",
    cursor: "pointer",
  });

  const toggleKnobStyle = (isActive) => ({
    width: "20px",
    height: "20px",
    backgroundColor: isActive ? themeColors.success : themeColors.textTertiary,
    borderRadius: "50%",
    position: "absolute",
    top: "2px",
    left: isActive ? "22px" : "2px",
    transition: "all 0.2s ease",
    boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
  });

  const dividerStyle = {
    height: "1px",
    backgroundColor: themeColors.border,
    margin: "12px 0",
  };

  // Count active filters
  const activeFilterCount = Object.values(activeFilters).reduce(
    (count, filterSet) =>
      count + (filterSet instanceof Set ? filterSet.size : 0),
    0
  );

  return (
    <>
      <div
        ref={popover.setButtonRef}
        style={buttonStyle}
        onClick={popover.handleOpen}
        onKeyDown={popover.handleKeyDown}
        role="button"
        tabIndex={0}
        aria-label="Filter options"
        {...hoverHandlers}
      >
        <FilterIcon width={16} height={16} color={themeColors.text} />
        Filter
        {activeFilterCount > 0 && (
          <span
            style={{
              backgroundColor: themeColors.text,
              color: themeColors.bgPrimary,
              fontSize: "11px",
              fontWeight: "600",
              padding: "2px 6px",
              borderRadius: "10px",
              marginLeft: "4px",
            }}
          >
            {activeFilterCount}
          </span>
        )}
      </div>

      {popover.isOpen && (
        <>
          {/* Backdrop */}
          <div
            onClick={popover.handleClose}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                popover.handleClose();
              }
            }}
            role="button"
            tabIndex={-1}
            aria-label="Close filters"
            style={backdropStyle}
          />

          {/* Popover */}
          <div style={{ ...popoverStyle, ...popover.popoverPosition }}>
            {filterGroups.map((group, groupIndex) => (
              <div key={group.id}>
                {groupIndex > 0 && <div style={dividerStyle} />}
                <div style={filterGroupStyle}>
                  <div style={filterGroupLabelStyle}>{group.label}</div>
                  {group.options.map((option) => {
                    const isActive =
                      activeFilters[group.id]?.has(option.value) || false;
                    const isToggleType = option.type === "toggle";

                    return (
                      <div
                        key={option.value}
                        style={filterOptionStyle(isActive)}
                        onClick={() =>
                          handleFilterToggle(group.id, option.value)
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleFilterToggle(group.id, option.value);
                          }
                        }}
                        role="button"
                        tabIndex={0}
                        aria-label={`${isActive ? "Deselect" : "Select"} ${
                          option.label
                        }`}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor =
                            "rgba(255,255,255,0.05)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "transparent";
                        }}
                      >
                        <div style={labelStyle(isActive)}>
                          {isToggleType && (
                            <ActiveIcon width={12} height={12} />
                          )}
                          {option.label}
                        </div>

                        {isToggleType ? (
                          // Toggle Switch
                          <div style={toggleSwitchStyle(isActive)}>
                            <div style={toggleKnobStyle(isActive)} />
                          </div>
                        ) : (
                          // Checkbox
                          <div style={checkboxStyle(isActive)}>
                            {isActive && (
                              <svg
                                style={checkmarkStyle}
                                viewBox="0 0 16 16"
                                fill="none"
                              >
                                <path
                                  d="M13.3333 4L6 11.3333L2.66666 8"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
