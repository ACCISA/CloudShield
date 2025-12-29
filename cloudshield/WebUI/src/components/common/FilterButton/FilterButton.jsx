import React, { useState, useEffect } from "react";
import FilterIcon from "../../../assets/FilterIcon.jsx";
import ActiveIcon from "../../../assets/ActiveIcon.jsx";

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
  const [isOpen, setIsOpen] = useState(false);
  const [buttonRef, setButtonRef] = useState(null);
  const [popoverPosition, setPopoverPosition] = useState({});

  const updatePosition = () => {
    if (buttonRef) {
      const rect = buttonRef.getBoundingClientRect();
      setPopoverPosition({
        left: `${rect.left}px`,
        top: `${rect.bottom}px`,
      });
    }
  };

  const handleOpen = () => {
    updatePosition();
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleOpen();
    }
  };

  const handleFilterToggle = (groupId, value) => {
    const group = filterGroups.find((g) => g.id === groupId);
    if (!group) return;

    const currentFilters = activeFilters[groupId] || new Set();
    const isActive = currentFilters.has(value);

    onFilterChange?.(groupId, value, !isActive);
  };

  // Update position on window resize when popover is open
  useEffect(() => {
    if (!isOpen) return;

    const handleResize = () => {
      updatePosition();
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isOpen, buttonRef]);

  // Button styling matching CreateButton
  const buttonStyle = {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: "12px 24px",
    gap: "8px",
    minWidth: "120px",
    height: "48px",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "16px",
    fontWeight: "500",
    color: "#ffffff",
    transition: "all 0.2s ease",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
    position: "relative",
    ...style,
  };

  // Popover container
  const popoverStyle = {
    position: "fixed",
    backgroundColor: "#0A0A0A",
    color: "#fff",
    border: "1px solid rgba(255,255,255,0.2)",
    borderRadius: "16px",
    width: "320px",
    marginTop: "8px",
    boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
    padding: "16px",
    zIndex: 1300,
    maxHeight: "500px",
    overflowY: "auto",
  };

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
    border: "2px solid rgba(255,255,255,0.5)",
    borderRadius: "4px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: isActive ? "#fff" : "transparent",
    transition: "all 0.2s ease",
  });

  const checkmarkStyle = {
    width: "10px",
    height: "10px",
    color: "#000",
  };

  const labelStyle = (isActive) => ({
    fontSize: "14px",
    fontWeight: isActive ? 500 : 400,
    flex: 1,
    display: "flex",
    alignItems: "center",
    gap: "8px",
  });

  const toggleSwitchStyle = (isActive) => ({
    width: "44px",
    height: "24px",
    backgroundColor: isActive
      ? "rgba(255,255,255,0.2)"
      : "rgba(255,255,255,0.1)",
    borderRadius: "12px",
    position: "relative",
    transition: "all 0.2s ease",
    cursor: "pointer",
  });

  const toggleKnobStyle = (isActive) => ({
    width: "20px",
    height: "20px",
    backgroundColor: isActive ? "#4CAF50" : "rgba(255,255,255,0.5)",
    borderRadius: "50%",
    position: "absolute",
    top: "2px",
    left: isActive ? "22px" : "2px",
    transition: "all 0.2s ease",
    boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
  });

  const dividerStyle = {
    height: "1px",
    backgroundColor: "rgba(255,255,255,0.1)",
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
        ref={setButtonRef}
        style={buttonStyle}
        onClick={handleOpen}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        aria-label="Filter options"
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "#242424";
          e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.2)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "#0A0A0A";
          e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
        }}
      >
        <FilterIcon width={16} height={16} color="#fff" />
        Filter
        {activeFilterCount > 0 && (
          <span
            style={{
              backgroundColor: "#fff",
              color: "#000",
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

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            onClick={handleClose}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                handleClose();
              }
            }}
            role="button"
            tabIndex={-1}
            aria-label="Close filters"
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 1299,
            }}
          />

          {/* Popover */}
          <div style={{ ...popoverStyle, ...popoverPosition }}>
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
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleFilterToggle(group.id, option.value);
                          }
                        }}
                        role="button"
                        tabIndex={0}
                        aria-label={`${isActive ? 'Deselect' : 'Select'} ${option.label}`}
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
