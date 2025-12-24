import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import FilterIcon from "../../../assets/FilterIcon.jsx";
import ActiveIcon from "../../../assets/ActiveIcon.jsx";

const POPOVER_STYLE = {
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

const FILTER_GROUP_STYLE = {
  marginBottom: "16px",
};

const FILTER_GROUP_LABEL_STYLE = {
  fontSize: "12px",
  fontWeight: "600",
  opacity: 0.7,
  marginBottom: "8px",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
};

const DIVIDER_STYLE = {
  height: "1px",
  backgroundColor: "rgba(255,255,255,0.1)",
  margin: "12px 0",
};

const BADGE_STYLE = {
  backgroundColor: "#fff",
  color: "#000",
  fontSize: "11px",
  fontWeight: "600",
  padding: "2px 6px",
  borderRadius: "10px",
  marginLeft: "4px",
};

const CHECKMARK_STYLE = {
  width: "10px",
  height: "10px",
  color: "#000",
};

const getButtonStyle = (isHovered, inlineStyle) => {
  const hoverStyles = isHovered
    ? { background: "#242424", borderColor: "rgba(255, 255, 255, 0.2)" }
    : { background: "#0A0A0A", borderColor: "rgba(255, 255, 255, 0.1)" };

  return {
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
    ...hoverStyles,
    ...inlineStyle,
  };
};

const getFilterOptionStyle = (isActive, isHovering) => ({
  display: "flex",
  alignItems: "center",
  gap: "10px",
  padding: "8px 12px",
  borderRadius: "8px",
  cursor: "pointer",
  transition: "all 0.2s ease",
  backgroundColor: isActive || isHovering ? "rgba(255,255,255,0.05)" : "transparent",
  marginBottom: "4px",
});

const getCheckboxStyle = (isActive) => ({
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

const labelStyle = (isActive) => ({
  fontSize: "14px",
  fontWeight: isActive ? 500 : 400,
  flex: 1,
  display: "flex",
  alignItems: "center",
  gap: "8px",
});

const getToggleSwitchStyle = (isActive) => ({
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

const getToggleKnobStyle = (isActive) => ({
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

function Checkbox({ isActive }) {
  return (
    <div style={getCheckboxStyle(isActive)}>
      {isActive && (
        <svg style={CHECKMARK_STYLE} viewBox="0 0 16 16" fill="none">
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
  );
}

function ToggleSwitch({ isActive }) {
  return (
    <div style={getToggleSwitchStyle(isActive)}>
      <div style={getToggleKnobStyle(isActive)} />
    </div>
  );
}

function FilterOptionRow({
  option,
  isActive,
  isHovered,
  onToggle,
  onHoverChange,
}) {
  const isToggleType = option.type === "toggle";

  return (
    <div
      style={getFilterOptionStyle(isActive, isHovered)}
      onClick={onToggle}
      onMouseEnter={() => onHoverChange(true)}
      onMouseLeave={() => onHoverChange(false)}
    >
      <div style={labelStyle(isActive)}>
        {isToggleType && <ActiveIcon width={12} height={12} />}
        {option.label}
      </div>
      {isToggleType ? <ToggleSwitch isActive={isActive} /> : <Checkbox isActive={isActive} />}
    </div>
  );
}

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
  const [isHovered, setIsHovered] = useState(false);
  const [hoveredOptionKey, setHoveredOptionKey] = useState(null);
  const buttonRef = useRef(null);
  const [popoverPosition, setPopoverPosition] = useState({});

  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setPopoverPosition({
      left: `${rect.left}px`,
      top: `${rect.bottom}px`,
    });
  }, []);

  const handleOpen = useCallback(() => {
    updatePosition();
    setIsOpen(true);
  }, [updatePosition]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleFilterToggle = useCallback(
    (groupId, value) => {
      const group = filterGroups.find((g) => g.id === groupId);
      if (!group) return;

      const currentFilters = activeFilters[groupId] || new Set();
      const isActive = currentFilters.has(value);

      onFilterChange?.(groupId, value, !isActive);
    },
    [activeFilters, filterGroups, onFilterChange]
  );

  const handleOptionHover = useCallback((key, isHovering) => {
    setHoveredOptionKey(isHovering ? key : null);
  }, []);

  // Update position on window resize when popover is open
  useEffect(() => {
    if (!isOpen) return;

    const handleResize = () => {
      updatePosition();
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isOpen, updatePosition]);

  // Button styling matching CreateButton
  const buttonStyle = useMemo(
    () => getButtonStyle(isHovered, style),
    [isHovered, style]
  );

  const activeFilterCount = useMemo(
    () =>
      Object.values(activeFilters).reduce(
        (count, filterSet) =>
          count + (filterSet instanceof Set ? filterSet.size : 0),
        0
      ),
    [activeFilters]
  );

  return (
    <>
      <div
        ref={buttonRef}
        style={buttonStyle}
        onClick={handleOpen}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <FilterIcon width={16} height={16} color="#fff" />
        Filter
        {activeFilterCount > 0 && (
          <span style={BADGE_STYLE}>
            {activeFilterCount}
          </span>
        )}
      </div>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            onClick={handleClose}
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
          <div style={{ ...POPOVER_STYLE, ...popoverPosition }}>
            {filterGroups.map((group, groupIndex) => (
              <div key={group.id}>
                {groupIndex > 0 && <div style={DIVIDER_STYLE} />}
                <div style={FILTER_GROUP_STYLE}>
                  <div style={FILTER_GROUP_LABEL_STYLE}>{group.label}</div>
                  {group.options.map((option) => {
                    const optionKey = `${group.id}-${option.value}`;
                    const isActive =
                      activeFilters[group.id]?.has(option.value) || false;

                    return (
                      <FilterOptionRow
                        key={option.value}
                        option={option}
                        isActive={isActive}
                        isHovered={hoveredOptionKey === optionKey}
                        onToggle={() =>
                          handleFilterToggle(group.id, option.value)
                        }
                        onHoverChange={(isHovering) =>
                          handleOptionHover(optionKey, isHovering)
                        }
                      />
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
