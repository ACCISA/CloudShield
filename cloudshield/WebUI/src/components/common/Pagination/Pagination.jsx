/**
 * Pagination.jsx
 *
 * Purpose:
 *   Reusable pagination bar with "Rows per page" selector and
 *   left/right chevron navigation. Designed for consistent use
 *   across all dashboard tables (Users, Workstations, Groups, Files).
 *
 * Features:
 *   - Rows-per-page dropdown with configurable options
 *   - "X–Y of Z" item range display
 *   - Previous / Next page buttons with disabled states
 *   - Resets to page 1 when rows-per-page changes
 *   - Dark-theme styling matching the application aesthetic
 *   - data-testid attributes for easy testing
 */
import React from "react";
import PropTypes from "prop-types";

/* ── Chevron SVGs ────────────────────────────── */

const ChevronLeft = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M15 18l-6-6 6-6" />
  </svg>
);

const ChevronRight = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M9 18l6-6-6-6" />
  </svg>
);

/* ── Styles ──────────────────────────────────── */

const styles = {
  container: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "16px",
    borderTop: "1px solid rgba(255, 255, 255, 0.1)",
    padding: "12px 20px",
  },
  rowsPerPageWrapper: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "0.75rem",
    color: "rgba(255, 255, 255, 0.6)",
  },
  select: {
    borderRadius: "6px",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    backgroundColor: "#101010",
    padding: "4px 8px",
    fontSize: "0.75rem",
    color: "rgba(255, 255, 255, 0.7)",
    outline: "none",
    cursor: "pointer",
  },
  rightSection: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
  },
  info: {
    fontSize: "0.75rem",
    color: "rgba(255, 255, 255, 0.6)",
  },
  buttonGroup: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
  },
  button: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "32px",
    height: "32px",
    borderRadius: "8px",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    backgroundColor: "#101010",
    color: "rgba(255, 255, 255, 0.7)",
    cursor: "pointer",
    transition: "background-color 0.15s ease",
    padding: 0,
  },
  buttonDisabled: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "32px",
    height: "32px",
    borderRadius: "8px",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    backgroundColor: "#101010",
    color: "rgba(255, 255, 255, 0.7)",
    cursor: "not-allowed",
    opacity: 0.4,
    padding: 0,
  },
};

/**
 * Pagination component with "Rows per page" selector and Left/Right
 * chevron navigation. Consistent design for all tables.
 *
 * @param {number}   currentPage          - Current page (1-indexed)
 * @param {number}   totalItems           - Total number of items
 * @param {number}   rowsPerPage          - Number of rows per page
 * @param {number[]} rowsPerPageOptions   - Available options for the dropdown
 * @param {Function} onPageChange         - Callback when page changes
 * @param {Function} onRowsPerPageChange  - Callback when rows per page changes
 * @param {string}   testId               - Test ID for testing purposes
 */
export default function Pagination({
  currentPage,
  totalItems,
  rowsPerPage,
  rowsPerPageOptions = [5, 10, 25, 50],
  onPageChange,
  onRowsPerPageChange,
  testId = "pagination",
}) {
  const totalPages = Math.ceil(totalItems / rowsPerPage);
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1;
  const endItem = Math.min(currentPage * rowsPerPage, totalItems);

  const canGoPrevious = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  const handlePrevious = () => {
    if (canGoPrevious) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (canGoNext) {
      onPageChange(currentPage + 1);
    }
  };

  const handleRowsPerPageChange = (event) => {
    const newRowsPerPage = parseInt(event.target.value, 10);
    onRowsPerPageChange(newRowsPerPage);
    // Reset to first page when changing rows per page
    onPageChange(1);
  };

  return (
    <div data-testid={testId} style={styles.container}>
      {/* Rows per page selector */}
      <div style={styles.rowsPerPageWrapper}>
        <label htmlFor={`${testId}-rows-per-page`}>Rows per page:</label>
        <select
          id={`${testId}-rows-per-page`}
          data-testid={`${testId}-rows-per-page`}
          value={rowsPerPage}
          onChange={handleRowsPerPageChange}
          style={styles.select}
        >
          {rowsPerPageOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      {/* Right section: info + nav */}
      <div style={styles.rightSection}>
        <span data-testid={`${testId}-info`} style={styles.info}>
          {startItem}–{endItem} of {totalItems}
        </span>

        <div style={styles.buttonGroup}>
          <button
            type="button"
            onClick={handlePrevious}
            disabled={!canGoPrevious}
            data-testid={`${testId}-prev`}
            aria-label="Previous page"
            style={canGoPrevious ? styles.button : styles.buttonDisabled}
          >
            <ChevronLeft />
          </button>
          <button
            type="button"
            onClick={handleNext}
            disabled={!canGoNext}
            data-testid={`${testId}-next`}
            aria-label="Next page"
            style={canGoNext ? styles.button : styles.buttonDisabled}
          >
            <ChevronRight />
          </button>
        </div>
      </div>
    </div>
  );
}

Pagination.propTypes = {
  /** Current page (1-indexed) */
  currentPage: PropTypes.number.isRequired,
  /** Total number of items */
  totalItems: PropTypes.number.isRequired,
  /** Number of rows per page */
  rowsPerPage: PropTypes.number.isRequired,
  /** Available options for rows per page */
  rowsPerPageOptions: PropTypes.arrayOf(PropTypes.number),
  /** Callback when page changes */
  onPageChange: PropTypes.func.isRequired,
  /** Callback when rows per page changes */
  onRowsPerPageChange: PropTypes.func.isRequired,
  /** Test ID for testing purposes */
  testId: PropTypes.string,
};
