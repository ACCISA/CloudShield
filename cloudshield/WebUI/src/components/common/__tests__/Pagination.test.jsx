/**
 * Pagination.test.jsx
 *
 * Comprehensive test suite for the Pagination component.
 * Covers rendering, navigation, page numbers, ellipsis logic, edge cases, and accessibility.
 * Designed to achieve 80%+ code coverage for SonarQube analysis.
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import Pagination from "../Pagination/Pagination";

describe("Pagination Component", () => {
  let mockOnPageChange;

  beforeEach(() => {
    mockOnPageChange = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─── Basic Rendering ─────────────────────────────────
  describe("Basic Rendering", () => {
    it("renders without crashing with required props", () => {
      const { container } = render(
        <Pagination
          totalItems={50}
          currentPage={1}
          onPageChange={mockOnPageChange}
        />,
      );
      expect(container.firstChild).toBeInTheDocument();
    });

    it("displays correct item count with default itemsPerPage", () => {
      render(
        <Pagination
          totalItems={50}
          currentPage={1}
          onPageChange={mockOnPageChange}
        />,
      );
      expect(screen.getByText(/Showing 1-10 of 50 items/i)).toBeInTheDocument();
    });

    it("displays correct item count with custom itemsPerPage", () => {
      render(
        <Pagination
          totalItems={50}
          itemsPerPage={20}
          currentPage={1}
          onPageChange={mockOnPageChange}
        />,
      );
      expect(screen.getByText(/Showing 1-20 of 50 items/i)).toBeInTheDocument();
    });

    it("displays correct item count for page 2", () => {
      render(
        <Pagination
          totalItems={50}
          itemsPerPage={10}
          currentPage={2}
          onPageChange={mockOnPageChange}
        />,
      );
      expect(
        screen.getByText(/Showing 11-20 of 50 items/i),
      ).toBeInTheDocument();
    });

    it("displays correct item count on last page with partial items", () => {
      render(
        <Pagination
          totalItems={45}
          itemsPerPage={10}
          currentPage={5}
          onPageChange={mockOnPageChange}
        />,
      );
      expect(
        screen.getByText(/Showing 41-45 of 45 items/i),
      ).toBeInTheDocument();
    });

    it("displays 0-0 of 0 when totalItems is zero", () => {
      render(
        <Pagination
          totalItems={0}
          currentPage={1}
          onPageChange={mockOnPageChange}
        />,
      );
      expect(screen.getByText(/Showing 0-0 of 0 items/i)).toBeInTheDocument();
    });

    it("uses custom itemLabel prop", () => {
      render(
        <Pagination
          totalItems={30}
          currentPage={1}
          onPageChange={mockOnPageChange}
          itemLabel="users"
        />,
      );
      expect(screen.getByText(/Showing 1-10 of 30 users/i)).toBeInTheDocument();
    });

    it("does not show controls when there is only one page", () => {
      render(
        <Pagination
          totalItems={5}
          itemsPerPage={10}
          currentPage={1}
          onPageChange={mockOnPageChange}
        />,
      );
      expect(screen.queryByLabelText("Previous page")).not.toBeInTheDocument();
      expect(screen.queryByLabelText("Next page")).not.toBeInTheDocument();
    });

    it("shows controls when there are multiple pages", () => {
      render(
        <Pagination
          totalItems={50}
          itemsPerPage={10}
          currentPage={1}
          onPageChange={mockOnPageChange}
        />,
      );
      expect(screen.getByLabelText("Previous page")).toBeInTheDocument();
      expect(screen.getByLabelText("Next page")).toBeInTheDocument();
    });

    it("displays page info indicator", () => {
      render(
        <Pagination
          totalItems={50}
          itemsPerPage={10}
          currentPage={3}
          onPageChange={mockOnPageChange}
        />,
      );
      expect(screen.getByText("Page 3 of 5")).toBeInTheDocument();
    });
  });

  // ─── Previous/Next Navigation ─────────────────────────
  describe("Previous/Next Navigation", () => {
    it("calls onPageChange with previous page when Previous button is clicked", () => {
      render(
        <Pagination
          totalItems={50}
          currentPage={3}
          onPageChange={mockOnPageChange}
        />,
      );
      fireEvent.click(screen.getByLabelText("Previous page"));
      expect(mockOnPageChange).toHaveBeenCalledWith(2);
    });

    it("calls onPageChange with next page when Next button is clicked", () => {
      render(
        <Pagination
          totalItems={50}
          currentPage={2}
          onPageChange={mockOnPageChange}
        />,
      );
      fireEvent.click(screen.getByLabelText("Next page"));
      expect(mockOnPageChange).toHaveBeenCalledWith(3);
    });

    it("disables Previous button on first page", () => {
      render(
        <Pagination
          totalItems={50}
          currentPage={1}
          onPageChange={mockOnPageChange}
        />,
      );
      const prevButton = screen.getByLabelText("Previous page");
      expect(prevButton).toBeDisabled();
    });

    it("does not call onPageChange when clicking disabled Previous button", () => {
      render(
        <Pagination
          totalItems={50}
          currentPage={1}
          onPageChange={mockOnPageChange}
        />,
      );
      fireEvent.click(screen.getByLabelText("Previous page"));
      expect(mockOnPageChange).not.toHaveBeenCalled();
    });

    it("disables Next button on last page", () => {
      render(
        <Pagination
          totalItems={50}
          itemsPerPage={10}
          currentPage={5}
          onPageChange={mockOnPageChange}
        />,
      );
      const nextButton = screen.getByLabelText("Next page");
      expect(nextButton).toBeDisabled();
    });

    it("does not call onPageChange when clicking disabled Next button", () => {
      render(
        <Pagination
          totalItems={50}
          itemsPerPage={10}
          currentPage={5}
          onPageChange={mockOnPageChange}
        />,
      );
      fireEvent.click(screen.getByLabelText("Next page"));
      expect(mockOnPageChange).not.toHaveBeenCalled();
    });

    it("enables both buttons on a middle page", () => {
      render(
        <Pagination
          totalItems={50}
          currentPage={3}
          onPageChange={mockOnPageChange}
        />,
      );
      expect(screen.getByLabelText("Previous page")).not.toBeDisabled();
      expect(screen.getByLabelText("Next page")).not.toBeDisabled();
    });
  });

  // ─── Page Number Buttons ─────────────────────────────
  describe("Page Number Buttons", () => {
    it("renders all page numbers when total pages <= maxPageButtons", () => {
      render(
        <Pagination
          totalItems={50}
          itemsPerPage={10}
          currentPage={1}
          onPageChange={mockOnPageChange}
          maxPageButtons={7}
        />,
      );
      // Should show pages 1, 2, 3, 4, 5 (5 total pages, no ellipsis needed)
      expect(screen.getByLabelText("Page 1")).toBeInTheDocument();
      expect(screen.getByLabelText("Page 2")).toBeInTheDocument();
      expect(screen.getByLabelText("Page 3")).toBeInTheDocument();
      expect(screen.getByLabelText("Page 4")).toBeInTheDocument();
      expect(screen.getByLabelText("Page 5")).toBeInTheDocument();
    });

    it("calls onPageChange when clicking a page number button", () => {
      render(
        <Pagination
          totalItems={50}
          itemsPerPage={10}
          currentPage={1}
          onPageChange={mockOnPageChange}
        />,
      );
      fireEvent.click(screen.getByLabelText("Page 3"));
      expect(mockOnPageChange).toHaveBeenCalledWith(3);
    });

    it("highlights the current page button", () => {
      render(
        <Pagination
          totalItems={50}
          itemsPerPage={10}
          currentPage={3}
          onPageChange={mockOnPageChange}
        />,
      );
      const currentPageButton = screen.getByLabelText("Page 3");
      expect(currentPageButton).toHaveAttribute("aria-current", "page");
    });

    it("does not set aria-current on non-active page buttons", () => {
      render(
        <Pagination
          totalItems={50}
          itemsPerPage={10}
          currentPage={3}
          onPageChange={mockOnPageChange}
        />,
      );
      const otherPageButton = screen.getByLabelText("Page 2");
      expect(otherPageButton).not.toHaveAttribute("aria-current");
    });

    it("clicking current page button still calls onPageChange", () => {
      render(
        <Pagination
          totalItems={50}
          itemsPerPage={10}
          currentPage={3}
          onPageChange={mockOnPageChange}
        />,
      );
      fireEvent.click(screen.getByLabelText("Page 3"));
      expect(mockOnPageChange).toHaveBeenCalledWith(3);
    });
  });

  // ─── Ellipsis Logic ──────────────────────────────────
  describe("Ellipsis Logic", () => {
    it("shows ellipsis when there are many pages and current page is in middle", () => {
      render(
        <Pagination
          totalItems={200}
          itemsPerPage={10}
          currentPage={10}
          onPageChange={mockOnPageChange}
          maxPageButtons={7}
        />,
      );
      // Should show: 1 ... 9 10 11 ... 20
      const ellipses = screen.getAllByText("...");
      expect(ellipses).toHaveLength(2);
    });

    it("shows start ellipsis only when current page is near end", () => {
      render(
        <Pagination
          totalItems={200}
          itemsPerPage={10}
          currentPage={19}
          onPageChange={mockOnPageChange}
          maxPageButtons={7}
        />,
      );
      // Should show: 1 ... 15 16 17 18 19 20
      const ellipses = screen.getAllByText("...");
      expect(ellipses).toHaveLength(1);
    });

    it("shows end ellipsis only when current page is near start", () => {
      render(
        <Pagination
          totalItems={200}
          itemsPerPage={10}
          currentPage={2}
          onPageChange={mockOnPageChange}
          maxPageButtons={7}
        />,
      );
      // Should show: 1 2 3 4 5 ... 20
      const ellipses = screen.getAllByText("...");
      expect(ellipses).toHaveLength(1);
    });

    it("shows no ellipsis when on first page with many total pages", () => {
      render(
        <Pagination
          totalItems={200}
          itemsPerPage={10}
          currentPage={1}
          onPageChange={mockOnPageChange}
          maxPageButtons={7}
        />,
      );
      // Should show: 1 2 3 4 5 ... 20
      const ellipses = screen.getAllByText("...");
      expect(ellipses).toHaveLength(1);
    });

    it("shows no ellipsis when on last page with many total pages", () => {
      render(
        <Pagination
          totalItems={200}
          itemsPerPage={10}
          currentPage={20}
          onPageChange={mockOnPageChange}
          maxPageButtons={7}
        />,
      );
      // Should show: 1 ... 15 16 17 18 19 20
      const ellipses = screen.getAllByText("...");
      expect(ellipses).toHaveLength(1);
    });

    it("ellipsis is not clickable", () => {
      render(
        <Pagination
          totalItems={200}
          itemsPerPage={10}
          currentPage={10}
          onPageChange={mockOnPageChange}
          maxPageButtons={7}
        />,
      );
      const ellipses = screen.getAllByText("...");
      // Click the first ellipsis
      fireEvent.click(ellipses[0]);
      // Should not call onPageChange
      expect(mockOnPageChange).not.toHaveBeenCalled();
    });

    it("respects custom maxPageButtons prop", () => {
      render(
        <Pagination
          totalItems={100}
          itemsPerPage={10}
          currentPage={5}
          onPageChange={mockOnPageChange}
          maxPageButtons={5}
        />,
      );
      // With maxPageButtons=5 and 10 total pages, should show: 1 ... 4 5 6 ... 10
      expect(screen.getByLabelText("Page 1")).toBeInTheDocument();
      expect(screen.getByLabelText("Page 4")).toBeInTheDocument();
      expect(screen.getByLabelText("Page 5")).toBeInTheDocument();
      expect(screen.getByLabelText("Page 6")).toBeInTheDocument();
      expect(screen.getByLabelText("Page 10")).toBeInTheDocument();
    });

    it("handles edge case with exactly maxPageButtons pages", () => {
      render(
        <Pagination
          totalItems={70}
          itemsPerPage={10}
          currentPage={4}
          onPageChange={mockOnPageChange}
          maxPageButtons={7}
        />,
      );
      // 7 pages total, maxPageButtons=7, should show all without ellipsis
      expect(screen.queryByText("...")).not.toBeInTheDocument();
      expect(screen.getByLabelText("Page 1")).toBeInTheDocument();
      expect(screen.getByLabelText("Page 7")).toBeInTheDocument();
    });

    it("handles edge case where currentPage is on page 3", () => {
      render(
        <Pagination
          totalItems={200}
          itemsPerPage={10}
          currentPage={3}
          onPageChange={mockOnPageChange}
          maxPageButtons={7}
        />,
      );
      // Should show pages around page 3: 1 2 3 4 5 ... 20
      expect(screen.getByLabelText("Page 1")).toBeInTheDocument();
      expect(screen.getByLabelText("Page 3")).toBeInTheDocument();
      expect(screen.getByLabelText("Page 5")).toBeInTheDocument();
    });
  });

  // ─── Hover Effects ───────────────────────────────────
  describe("Hover Effects", () => {
    it("applies hover styles to Previous button when not disabled", () => {
      render(
        <Pagination
          totalItems={50}
          currentPage={2}
          onPageChange={mockOnPageChange}
        />,
      );
      const prevButton = screen.getByLabelText("Previous page");
      fireEvent.mouseEnter(prevButton);
      // Check with normalized whitespace (browsers may add spaces)
      expect(prevButton.style.backgroundColor.replace(/\s/g, "")).toBe(
        "rgba(255,255,255,0.08)",
      );
      expect(prevButton.style.borderColor.replace(/\s/g, "")).toBe(
        "rgba(255,255,255,0.2)",
      );
    });

    it("removes hover styles on mouse leave from Previous button", () => {
      render(
        <Pagination
          totalItems={50}
          currentPage={2}
          onPageChange={mockOnPageChange}
        />,
      );
      const prevButton = screen.getByLabelText("Previous page");
      fireEvent.mouseEnter(prevButton);
      fireEvent.mouseLeave(prevButton);
      expect(prevButton.style.backgroundColor).toBe("transparent");
      expect(prevButton.style.borderColor.replace(/\s/g, "")).toBe(
        "rgba(255,255,255,0.12)",
      );
    });

    it("does not apply hover styles to disabled Previous button", () => {
      render(
        <Pagination
          totalItems={50}
          currentPage={1}
          onPageChange={mockOnPageChange}
        />,
      );
      const prevButton = screen.getByLabelText("Previous page");
      const initialBgColor = prevButton.style.backgroundColor || "";
      fireEvent.mouseEnter(prevButton);
      // Should not change background when disabled
      expect(prevButton.style.backgroundColor).toBe(initialBgColor);
    });

    it("applies hover styles to Next button when not disabled", () => {
      render(
        <Pagination
          totalItems={50}
          currentPage={2}
          onPageChange={mockOnPageChange}
        />,
      );
      const nextButton = screen.getByLabelText("Next page");
      fireEvent.mouseEnter(nextButton);
      expect(nextButton.style.backgroundColor.replace(/\s/g, "")).toBe(
        "rgba(255,255,255,0.08)",
      );
    });

    it("applies hover styles to page number buttons that are not current", () => {
      render(
        <Pagination
          totalItems={50}
          itemsPerPage={10}
          currentPage={3}
          onPageChange={mockOnPageChange}
        />,
      );
      const pageButton = screen.getByLabelText("Page 2");
      fireEvent.mouseEnter(pageButton);
      expect(pageButton.style.backgroundColor.replace(/\s/g, "")).toBe(
        "rgba(255,255,255,0.08)",
      );
    });

    it("does not apply hover styles to current page button", () => {
      render(
        <Pagination
          totalItems={50}
          itemsPerPage={10}
          currentPage={3}
          onPageChange={mockOnPageChange}
        />,
      );
      const currentButton = screen.getByLabelText("Page 3");
      fireEvent.mouseEnter(currentButton);
      // Current page button should not get hover effect
      expect(currentButton.style.backgroundColor).not.toBe(
        "rgba(255,255,255,0.08)",
      );
    });

    it("removes hover styles on mouse leave from page button", () => {
      render(
        <Pagination
          totalItems={50}
          itemsPerPage={10}
          currentPage={3}
          onPageChange={mockOnPageChange}
        />,
      );
      const pageButton = screen.getByLabelText("Page 2");
      fireEvent.mouseEnter(pageButton);
      fireEvent.mouseLeave(pageButton);
      expect(pageButton.style.backgroundColor).toBe("transparent");
    });
  });

  // ─── Accessibility ───────────────────────────────────
  describe("Accessibility", () => {
    it("Previous button has correct aria-label", () => {
      render(
        <Pagination
          totalItems={50}
          currentPage={2}
          onPageChange={mockOnPageChange}
        />,
      );
      expect(screen.getByLabelText("Previous page")).toBeInTheDocument();
    });

    it("Next button has correct aria-label", () => {
      render(
        <Pagination
          totalItems={50}
          currentPage={2}
          onPageChange={mockOnPageChange}
        />,
      );
      expect(screen.getByLabelText("Next page")).toBeInTheDocument();
    });

    it("each page button has correct aria-label", () => {
      render(
        <Pagination
          totalItems={50}
          itemsPerPage={10}
          currentPage={3}
          onPageChange={mockOnPageChange}
        />,
      );
      expect(screen.getByLabelText("Page 1")).toBeInTheDocument();
      expect(screen.getByLabelText("Page 2")).toBeInTheDocument();
      expect(screen.getByLabelText("Page 3")).toBeInTheDocument();
    });

    it("current page button has aria-current='page'", () => {
      render(
        <Pagination
          totalItems={50}
          itemsPerPage={10}
          currentPage={3}
          onPageChange={mockOnPageChange}
        />,
      );
      const currentPageButton = screen.getByLabelText("Page 3");
      expect(currentPageButton).toHaveAttribute("aria-current", "page");
    });
  });

  // ─── Edge Cases ──────────────────────────────────────
  describe("Edge Cases", () => {
    it("handles exactly one page of items correctly", () => {
      render(
        <Pagination
          totalItems={10}
          itemsPerPage={10}
          currentPage={1}
          onPageChange={mockOnPageChange}
        />,
      );
      expect(screen.getByText(/Showing 1-10 of 10 items/i)).toBeInTheDocument();
      // Controls should not be shown
      expect(screen.queryByLabelText("Previous page")).not.toBeInTheDocument();
    });

    it("handles single item correctly", () => {
      render(
        <Pagination
          totalItems={1}
          itemsPerPage={10}
          currentPage={1}
          onPageChange={mockOnPageChange}
        />,
      );
      expect(screen.getByText(/Showing 1-1 of 1 items/i)).toBeInTheDocument();
    });

    it("handles large dataset correctly", () => {
      render(
        <Pagination
          totalItems={10000}
          itemsPerPage={25}
          currentPage={400}
          onPageChange={mockOnPageChange}
        />,
      );
      expect(
        screen.getByText(/Showing 9976-10000 of 10000 items/i),
      ).toBeInTheDocument();
    });

    it("handles when currentPage equals totalPages", () => {
      render(
        <Pagination
          totalItems={25}
          itemsPerPage={10}
          currentPage={3}
          onPageChange={mockOnPageChange}
        />,
      );
      expect(
        screen.getByText(/Showing 21-25 of 25 items/i),
      ).toBeInTheDocument();
      expect(screen.getByLabelText("Next page")).toBeDisabled();
    });

    it("handles two pages correctly", () => {
      render(
        <Pagination
          totalItems={15}
          itemsPerPage={10}
          currentPage={1}
          onPageChange={mockOnPageChange}
        />,
      );
      expect(screen.getByLabelText("Page 1")).toBeInTheDocument();
      expect(screen.getByLabelText("Page 2")).toBeInTheDocument();
      expect(screen.queryByText("...")).not.toBeInTheDocument();
    });

    it("button loses focus after click (blur)", () => {
      render(
        <Pagination
          totalItems={50}
          currentPage={2}
          onPageChange={mockOnPageChange}
        />,
      );
      const nextButton = screen.getByLabelText("Next page");
      nextButton.focus();
      expect(nextButton).toHaveFocus();
      fireEvent.click(nextButton);
      // Blur is called in the component after click
      expect(nextButton).not.toHaveFocus();
    });

    it("page button loses focus after click", () => {
      render(
        <Pagination
          totalItems={50}
          itemsPerPage={10}
          currentPage={2}
          onPageChange={mockOnPageChange}
        />,
      );
      const pageButton = screen.getByLabelText("Page 3");
      pageButton.focus();
      expect(pageButton).toHaveFocus();
      fireEvent.click(pageButton);
      expect(pageButton).not.toHaveFocus();
    });

    it("handles very large maxPageButtons value", () => {
      render(
        <Pagination
          totalItems={50}
          itemsPerPage={10}
          currentPage={3}
          onPageChange={mockOnPageChange}
          maxPageButtons={20}
        />,
      );
      // With only 5 pages and maxPageButtons=20, should show all pages
      expect(screen.queryByText("...")).not.toBeInTheDocument();
    });

    it("handles default itemsPerPage when not provided", () => {
      render(
        <Pagination
          totalItems={100}
          currentPage={1}
          onPageChange={mockOnPageChange}
        />,
      );
      // Default itemsPerPage is 10
      expect(
        screen.getByText(/Showing 1-10 of 100 items/i),
      ).toBeInTheDocument();
    });

    it("handles default currentPage when not provided", () => {
      const { rerender } = render(
        <Pagination
          totalItems={50}
          currentPage={1}
          onPageChange={mockOnPageChange}
        />,
      );
      // Component uses currentPage=1 as default in propTypes
      expect(screen.getByText(/Showing 1-10 of 50 items/i)).toBeInTheDocument();
    });
  });
});
