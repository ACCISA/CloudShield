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
import PropTypes from "prop-types";

function Pagination({
  totalItems,
  itemsPerPage = 10,
  currentPage = 1,
  onPageChange,
  itemLabel = "items",
  maxPageButtons = 7,
}) {
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
    for (let i = startPage; i <= endPage; i++) {
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
      borderTop: "1px solid rgba(255,255,255,0.08)",
    },
    controls: {
      display: "flex",
      alignItems: "center",
      gap: "4px",
    },
    pageButton: {
      background: "none",
      border: "1px solid rgba(255,255,255,0.12)",
      borderRadius: "6px",
      color: "rgba(255,255,255,0.7)",
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
      backgroundColor: "#fff",
      color: "#0f0f0f",
      borderColor: "#fff",
      fontWeight: "600",
    },
    pageButtonDisabled: {
      opacity: 0.3,
      cursor: "not-allowed",
    },
    ellipsis: {
      color: "rgba(255,255,255,0.5)",
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
      color: "rgba(255,255,255,0.7)",
      fontSize: "13px",
      margin: "0 4px",
    },
    itemCount: {
      fontSize: "13px",
      color: "rgba(255,255,255,0.5)",
      fontWeight: "400",
    },
  };

  return (
    <div style={styles.container}>
      <span style={styles.itemCount}>
        Showing {totalItems > 0 ? startIndex : 0}-
        {totalItems > 0 ? endIndex : 0} of {totalItems} {itemLabel}
      </span>
      {totalPages > 1 && (
        <div style={styles.controls}>
          <button
            style={{
              ...styles.pageButton,
              ...(currentPage === 1 ? styles.pageButtonDisabled : {}),
            }}
            onClick={handlePreviousPage}
            disabled={currentPage === 1}
            onMouseEnter={(e) => {
              if (currentPage !== 1) {
                e.currentTarget.style.backgroundColor =
                  "rgba(255,255,255,0.08)";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)";
              }
            }}
            onMouseLeave={(e) => {
              if (currentPage !== 1) {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
              }
            }}
            aria-label="Previous page"
          >
            ←
          </button>

          {/* Page numbers with ellipsis */}
          {pageNumbers.map((page, index) => {
            if (page === "...") {
              // Use position-based key for ellipsis (start or end)
              const ellipsisKey =
                index < pageNumbers.length / 2 ? "start" : "end";
              return (
                <span key={`ellipsis-${ellipsisKey}`} style={styles.ellipsis}>
                  ...
                </span>
              );
            }

            return (
              <button
                key={page}
                style={{
                  ...styles.pageButton,
                  ...(page === currentPage ? styles.pageButtonActive : {}),
                }}
                onClick={() => handlePageClick(page)}
                onMouseEnter={(e) => {
                  if (page !== currentPage) {
                    e.currentTarget.style.backgroundColor =
                      "rgba(255,255,255,0.08)";
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (page !== currentPage) {
                    e.currentTarget.style.backgroundColor = "transparent";
                    e.currentTarget.style.borderColor =
                      "rgba(255,255,255,0.12)";
                  }
                }}
                aria-label={`Page ${page}`}
                aria-current={page === currentPage ? "page" : undefined}
              >
                {page}
              </button>
            );
          })}

          <button
            style={{
              ...styles.pageButton,
              ...(currentPage === totalPages ? styles.pageButtonDisabled : {}),
            }}
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
            onMouseEnter={(e) => {
              if (currentPage !== totalPages) {
                e.currentTarget.style.backgroundColor =
                  "rgba(255,255,255,0.08)";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)";
              }
            }}
            onMouseLeave={(e) => {
              if (currentPage !== totalPages) {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
              }
            }}
            aria-label="Next page"
          >
            →
          </button>

          <span style={styles.pageInfo}>
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
};

export default Pagination;
