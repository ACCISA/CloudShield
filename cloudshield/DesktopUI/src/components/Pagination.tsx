export interface PaginationProps {
  /** Current page (1-indexed) */
  currentPage: number;
  /** Total number of items */
  totalItems: number;
  /** Number of rows per page */
  rowsPerPage: number;
  /** Available options for rows per page */
  rowsPerPageOptions?: number[];
  /** Callback when page changes */
  onPageChange: (page: number) => void;
  /** Callback when rows per page changes */
  onRowsPerPageChange: (rowsPerPage: number) => void;
  /** Test ID for testing purposes */
  testId?: string;
}

/**
 * Pagination component with "Rows per page" selector and Left/Right chevron navigation
 * Consistent design for all tables in the application
 */
export default function Pagination({
  currentPage,
  totalItems,
  rowsPerPage,
  rowsPerPageOptions = [5, 10, 25, 50],
  onPageChange,
  onRowsPerPageChange,
  testId = "pagination",
}: PaginationProps) {
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

  const handleRowsPerPageChange = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const newRowsPerPage = parseInt(event.target.value, 10);
    onRowsPerPageChange(newRowsPerPage);
    // Reset to first page when changing rows per page
    onPageChange(1);
  };

  return (
    <div
      data-testid={testId}
      className="flex flex-wrap items-center justify-between gap-4 border-t border-white/10 px-5 py-3"
    >
      <div className="flex items-center gap-2 text-xs text-white/60">
        <label htmlFor={`${testId}-rows-per-page`} className="text-white/60">
          Rows per page:
        </label>
        <select
          id={`${testId}-rows-per-page`}
          data-testid={`${testId}-rows-per-page`}
          value={rowsPerPage}
          onChange={handleRowsPerPageChange}
          className="rounded-md border border-white/10 bg-[#101010] px-2 py-1 text-xs text-white/70 focus:border-white/30 focus:outline-none"
        >
          {rowsPerPageOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-4">
        <span
          data-testid={`${testId}-info`}
          className="text-xs text-white/60"
        >
          {startItem}–{endItem} of {totalItems}
        </span>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handlePrevious}
            disabled={!canGoPrevious}
            data-testid={`${testId}-prev`}
            aria-label="Previous page"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-[#101010] text-white/70 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-[#101010]"
          >
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
          </button>
          <button
            type="button"
            onClick={handleNext}
            disabled={!canGoNext}
            data-testid={`${testId}-next`}
            aria-label="Next page"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-[#101010] text-white/70 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-[#101010]"
          >
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
          </button>
        </div>
      </div>
    </div>
  );
}
