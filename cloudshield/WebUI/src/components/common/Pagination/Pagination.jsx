/**
 * Pagination.jsx
 *
 * Purpose:
 *   Reusable pagination bar with numbered page buttons for
 *   consistent use across all dashboard tables.
 *
 * Features:
 *   - Numbered page buttons with active state
 *   - Ellipsis (...) for large page counts (configurable max buttons)
 *   - "Showing X-Y of Z items" item range display
 *   - Previous / Next page buttons (←/→) with disabled states
 *   - "Page X of Y" indicator
 *   - Only shows controls when there are multiple pages
 *   - Dark-theme styling matching the application aesthetic
 */
import { useState } from "react";
import PropTypes from "prop-types";
import { useThemeColors } from "../../../hooks/useThemeColors.js";

function Pagination({
  totalItems,
  itemsPerPage = 10,
  currentPage = 1,
  onPageChange,
  itemLabel = "items",
  maxPageButtons = 7,
  testId = "pagination",
}) {
  const [hoveredControl, setHoveredControl] = useState(null);
  const themeColors = useThemeColors();
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage + 1;
  const endIndex = Math.min(currentPage * itemsPerPage, totalItems);

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  const handlePageClick = (page) => {
    onPageChange(page);
  };
  // Generate page numbers with ellipsis
  const getPageNumbers = () => {
    const pages = [];

    // If total pages is less than max, show all pages
    if (totalPages <= maxPageButtons) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    // Always show first page
    pages.push(1);

    // Calculate range around current page
    const showEllipsisStart = currentPage > 3;
    const showEllipsisEnd = currentPage < totalPages - 2;

    if (showEllipsisStart) {
      pages.push("...");
    }

    // Determine page range to show around current page
    let startPage = Math.max(2, currentPage - 1);
    let endPage = Math.min(totalPages - 1, currentPage + 1);

    // Adjust for edges
    if (currentPage <= 3) {
      startPage = 2;
      endPage = Math.min(maxPageButtons - 1, totalPages - 1);
    } else if (currentPage >= totalPages - 2) {
      startPage = Math.max(2, totalPages - (maxPageButtons - 2));
      endPage = totalPages - 1;
    }

    // Add page numbers in range
    for (let i = startPage; i <= endPage; i += 1) {
      pages.push(i);
    }

    if (showEllipsisEnd) {
      pages.push("...");
    }

    // Always show last page (if more than 1 page)
    if (totalPages > 1) {
      pages.push(totalPages);
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  const styles = {
    container: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: "8px",
      paddingTop: "8px",
      borderTop: `1px solid ${themeColors.borderLight}`,
      flexWrap: "wrap",
    },
    controls: {
      display: "flex",
      alignItems: "center",
      gap: "4px",
    },
    pageButton: {
      backgroundColor: "transparent",
      borderWidth: "1px",
      borderStyle: "solid",
      borderColor: themeColors.border,
      borderRadius: "6px",
      color: themeColors.textSecondary,
      padding: "4px 8px",
      fontSize: "13px",
      cursor: "pointer",
      transition: "all 0.2s",
      minWidth: "28px",
      height: "28px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    pageButtonActive: {
      backgroundColor: themeColors.primary,
      color: themeColors.primaryText,
      borderColor: themeColors.primary,
      fontWeight: "600",
    },
    pageButtonDisabled: {
      opacity: 0.3,
      cursor: "not-allowed",
    },
    ellipsis: {
      color: themeColors.textTertiary,
      fontSize: "13px",
      padding: "4px 8px",
      minWidth: "28px",
      height: "28px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      userSelect: "none",
    },
    pageInfo: {
      color: themeColors.textSecondary,
      fontSize: "13px",
      margin: "0 4px",
    },
    itemCount: {
      fontSize: "13px",
      color: themeColors.textTertiary,
      fontWeight: "400",
    },
  };

  const getPageButtonStyle = ({
    isActive = false,
    isDisabled = false,
    controlKey,
  }) => {
    const isHovered = hoveredControl === controlKey;

    return {
      ...styles.pageButton,
      ...(isActive ? styles.pageButtonActive : {}),
      ...(isDisabled ? styles.pageButtonDisabled : {}),
      ...(!isActive && !isDisabled && isHovered
        ? {
            backgroundColor: themeColors.lightOverlay,
            borderColor: themeColors.borderStrong,
          }
        : {}),
    };
  };

  return (
    <div data-testid={testId} style={styles.container}>
      <span data-testid={`${testId}-info`} style={styles.itemCount}>
        Showing {totalItems > 0 ? startIndex : 0}-
        {totalItems > 0 ? endIndex : 0} of {totalItems} {itemLabel}
      </span>
      {totalPages > 1 && (
        <div style={styles.controls}>
          <button
            type="button"
            data-testid={`${testId}-prev`}
            style={getPageButtonStyle({
              isDisabled: currentPage === 1,
              controlKey: "prev",
            })}
            onClick={handlePreviousPage}
            disabled={currentPage === 1}
            onMouseEnter={() => setHoveredControl("prev")}
            onMouseLeave={() => setHoveredControl(null)}
            aria-label="Previous page"
          >
            ←
          </button>

          {/* Page numbers with ellipsis */}
          {pageNumbers.map((page, index) => {
            if (page === "...") {
              const ellipsisKey =
                index < pageNumbers.length / 2 ? "start" : "end";
              return (
                <span
                  key={`ellipsis-${ellipsisKey}`}
                  style={styles.ellipsis}
                  data-testid={`${testId}-ellipsis-${ellipsisKey}`}
                >
                  ...
                </span>
              );
            }

            return (
              <button
                key={page}
                type="button"
                data-testid={`${testId}-page-${page}`}
                style={getPageButtonStyle({
                  isActive: page === currentPage,
                  controlKey: `page-${page}`,
                })}
                onClick={() => handlePageClick(page)}
                onMouseEnter={() => setHoveredControl(`page-${page}`)}
                onMouseLeave={() => setHoveredControl(null)}
                aria-label={`Page ${page}`}
                aria-current={page === currentPage ? "page" : undefined}
              >
                {page}
              </button>
            );
          })}

          <button
            type="button"
            data-testid={`${testId}-next`}
            style={getPageButtonStyle({
              isDisabled: currentPage === totalPages,
              controlKey: "next",
            })}
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
            onMouseEnter={() => setHoveredControl("next")}
            onMouseLeave={() => setHoveredControl(null)}
            aria-label="Next page"
          >
            →
          </button>

          <span data-testid={`${testId}-page-info`} style={styles.pageInfo}>
            Page {currentPage} of {totalPages}
          </span>
        </div>
      )}
    </div>
  );
}

Pagination.propTypes = {
  /** Total number of items */
  totalItems: PropTypes.number.isRequired,
  /** Number of items per page */
  itemsPerPage: PropTypes.number,
  /** Current page (1-indexed) */
  currentPage: PropTypes.number.isRequired,
  /** Callback when page changes */
  onPageChange: PropTypes.func.isRequired,
  /** Label for items (e.g., "items", "alerts", "users") */
  itemLabel: PropTypes.string,
  /** Maximum number of page buttons to show (default 7) */
  maxPageButtons: PropTypes.number,
  testId: PropTypes.string,
};

export default Pagination;
