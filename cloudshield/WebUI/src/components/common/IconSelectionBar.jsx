import React from "react";
import PropTypes from "prop-types";
import Checkbox from "./Checkbox/Checkbox.jsx";

function handleButtonMouseEnter(e) {
  e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
}

function handleButtonMouseLeave(e) {
  e.currentTarget.style.background = "rgba(255, 255, 255, 0.03)";
}

export default function IconSelectionBar({
  styles,
  allVisibleSelected,
  isIndeterminate,
  onToggleSelectAll,
  selectedCount,
}) {
  return (
    <div style={styles.selectionBar}>
      <div style={styles.selectionLeft}>
        <Checkbox
          checked={allVisibleSelected}
          indeterminate={isIndeterminate}
          onChange={onToggleSelectAll}
        />
        <button
          type="button"
          style={styles.selectAllButton}
          onClick={onToggleSelectAll}
          onMouseEnter={handleButtonMouseEnter}
          onMouseLeave={handleButtonMouseLeave}
        >
          {allVisibleSelected || isIndeterminate ? "Clear selection" : "Select all"}
        </button>
      </div>
      <div style={styles.selectedCount}>{selectedCount} selected</div>
    </div>
  );
}

IconSelectionBar.propTypes = {
  styles: PropTypes.shape({
    selectionBar: PropTypes.object.isRequired,
    selectionLeft: PropTypes.object.isRequired,
    selectAllButton: PropTypes.object.isRequired,
    selectedCount: PropTypes.object.isRequired,
  }).isRequired,
  allVisibleSelected: PropTypes.bool.isRequired,
  isIndeterminate: PropTypes.bool.isRequired,
  onToggleSelectAll: PropTypes.func.isRequired,
  selectedCount: PropTypes.number.isRequired,
};
