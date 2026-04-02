import { useMemo } from "react";

type PaginationProps = {
  totalItems: number;
  itemsPerPage?: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  itemLabel?: string;
  maxPageButtons?: number;
  testId?: string;
};

export default function Pagination({
  totalItems,
  itemsPerPage = 10,
  currentPage,
  onPageChange,
  itemLabel = "items",
  maxPageButtons = 7,
  testId = "pagination",
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const startIndex = totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endIndex = totalItems > 0 ? Math.min(currentPage * itemsPerPage, totalItems) : 0;

  const pageNumbers = useMemo(() => {
    if (totalPages <= maxPageButtons) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages: Array<number | "..."> = [1];

    const showEllipsisStart = currentPage > 3;
    const showEllipsisEnd = currentPage < totalPages - 2;

    if (showEllipsisStart) pages.push("...");

    let startPage = Math.max(2, currentPage - 1);
    let endPage = Math.min(totalPages - 1, currentPage + 1);

    if (currentPage <= 3) {
      startPage = 2;
      endPage = Math.min(maxPageButtons - 1, totalPages - 1);
    } else if (currentPage >= totalPages - 2) {
      startPage = Math.max(2, totalPages - (maxPageButtons - 2));
      endPage = totalPages - 1;
    }

    for (let i = startPage; i <= endPage; i += 1) {
      pages.push(i);
    }

    if (showEllipsisEnd) pages.push("...");
    pages.push(totalPages);

    return pages;
  }, [currentPage, totalPages, maxPageButtons]);

  const goPrev = () => {
    if (currentPage > 1) onPageChange(currentPage - 1);
  };

  const goNext = () => {
    if (currentPage < totalPages) onPageChange(currentPage + 1);
  };

  return (
    <div
      data-testid={testId}
      className="mt-2 flex flex-wrap items-center justify-between gap-3 border-t border-white/8 pt-2"
    >
      <span data-testid={`${testId}-info`} className="text-xs text-white/50">
        Showing {startIndex}-{endIndex} of {totalItems} {itemLabel}
      </span>

      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            data-testid={`${testId}-prev`}
            aria-label="Previous page"
            onClick={goPrev}
            disabled={currentPage === 1}
            className="flex h-7 min-w-7 items-center justify-center rounded-md border border-white/12 px-2 text-xs text-white/70 transition hover:bg-white/8 disabled:cursor-not-allowed disabled:opacity-30"
          >
            ←
          </button>

          {pageNumbers.map((page, index) => {
            if (page === "...") {
              return (
                <span
                  key={`ellipsis-${index}`}
                  className="flex h-7 min-w-7 select-none items-center justify-center px-2 text-xs text-white/50"
                >
                  ...
                </span>
              );
            }

            const active = page === currentPage;
            return (
              <button
                key={page}
                type="button"
                data-testid={`${testId}-page-${page}`}
                aria-label={`Page ${page}`}
                aria-current={active ? "page" : undefined}
                onClick={() => onPageChange(page)}
                className={`flex h-7 min-w-7 items-center justify-center rounded-md border px-2 text-xs transition ${
                  active
                    ? "border-white bg-white font-semibold text-[#0f0f0f]"
                    : "border-white/12 text-white/70 hover:bg-white/8"
                }`}
              >
                {page}
              </button>
            );
          })}

          <button
            type="button"
            data-testid={`${testId}-next`}
            aria-label="Next page"
            onClick={goNext}
            disabled={currentPage === totalPages}
            className="flex h-7 min-w-7 items-center justify-center rounded-md border border-white/12 px-2 text-xs text-white/70 transition hover:bg-white/8 disabled:cursor-not-allowed disabled:opacity-30"
          >
            →
          </button>

          <span data-testid={`${testId}-page-info`} className="ml-1 text-xs text-white/70">
            Page {currentPage} of {totalPages}
          </span>
        </div>
      )}
    </div>
  );
}
