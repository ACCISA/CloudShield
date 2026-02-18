/**
 * Pagination.test.jsx
 *
 * Test suite for the Pagination component.
 * Covers rendering, navigation, rows-per-page, edge cases, and accessibility.
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import Pagination from "../Pagination/Pagination";

const defaultProps = {
  currentPage: 1,
  totalItems: 50,
  rowsPerPage: 10,
  onPageChange: jest.fn(),
  onRowsPerPageChange: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("Pagination Component", () => {
  // ─── Basic rendering ─────────────────────────────────
  describe("Rendering", () => {
    it("renders without crashing", () => {
      render(<Pagination {...defaultProps} />);
      expect(screen.getByTestId("pagination")).toBeInTheDocument();
    });

    it("displays the correct item range", () => {
      render(<Pagination {...defaultProps} />);
      expect(screen.getByTestId("pagination-info")).toHaveTextContent(
        "1–10 of 50",
      );
    });

    it("displays the correct range on page 2", () => {
      render(<Pagination {...defaultProps} currentPage={2} />);
      expect(screen.getByTestId("pagination-info")).toHaveTextContent(
        "11–20 of 50",
      );
    });

    it("displays the correct range on the last page", () => {
      render(<Pagination {...defaultProps} currentPage={5} />);
      expect(screen.getByTestId("pagination-info")).toHaveTextContent(
        "41–50 of 50",
      );
    });

    it("handles partial last page correctly", () => {
      render(
        <Pagination {...defaultProps} totalItems={53} currentPage={6} />,
      );
      expect(screen.getByTestId("pagination-info")).toHaveTextContent(
        "51–53 of 53",
      );
    });

    it("displays 0–0 of 0 when totalItems is zero", () => {
      render(<Pagination {...defaultProps} totalItems={0} />);
      expect(screen.getByTestId("pagination-info")).toHaveTextContent(
        "0–0 of 0",
      );
    });

    it("renders the rows-per-page label", () => {
      render(<Pagination {...defaultProps} />);
      expect(screen.getByText("Rows per page:")).toBeInTheDocument();
    });

    it("renders the rows-per-page select with default options", () => {
      render(<Pagination {...defaultProps} />);
      const select = screen.getByTestId("pagination-rows-per-page");
      const options = select.querySelectorAll("option");
      expect(options).toHaveLength(4);
      expect(options[0]).toHaveValue("5");
      expect(options[1]).toHaveValue("10");
      expect(options[2]).toHaveValue("25");
      expect(options[3]).toHaveValue("50");
    });

    it("renders custom rows-per-page options", () => {
      render(
        <Pagination {...defaultProps} rowsPerPageOptions={[20, 40, 100]} />,
      );
      const select = screen.getByTestId("pagination-rows-per-page");
      const options = select.querySelectorAll("option");
      expect(options).toHaveLength(3);
      expect(options[0]).toHaveValue("20");
      expect(options[1]).toHaveValue("40");
      expect(options[2]).toHaveValue("100");
    });

    it("selects the current rowsPerPage value", () => {
      render(<Pagination {...defaultProps} rowsPerPage={25} />);
      const select = screen.getByTestId("pagination-rows-per-page");
      expect(select.value).toBe("25");
    });
  });

  // ─── Navigation ───────────────────────────────────────
  describe("Navigation", () => {
    it("calls onPageChange with next page when Next is clicked", () => {
      render(<Pagination {...defaultProps} />);
      fireEvent.click(screen.getByTestId("pagination-next"));
      expect(defaultProps.onPageChange).toHaveBeenCalledWith(2);
    });

    it("calls onPageChange with previous page when Previous is clicked", () => {
      render(<Pagination {...defaultProps} currentPage={3} />);
      fireEvent.click(screen.getByTestId("pagination-prev"));
      expect(defaultProps.onPageChange).toHaveBeenCalledWith(2);
    });

    it("disables Previous button on the first page", () => {
      render(<Pagination {...defaultProps} currentPage={1} />);
      const prev = screen.getByTestId("pagination-prev");
      expect(prev).toBeDisabled();
    });

    it("does not call onPageChange when clicking disabled Previous", () => {
      render(<Pagination {...defaultProps} currentPage={1} />);
      fireEvent.click(screen.getByTestId("pagination-prev"));
      expect(defaultProps.onPageChange).not.toHaveBeenCalled();
    });

    it("disables Next button on the last page", () => {
      render(<Pagination {...defaultProps} currentPage={5} />);
      const next = screen.getByTestId("pagination-next");
      expect(next).toBeDisabled();
    });

    it("does not call onPageChange when clicking disabled Next", () => {
      render(<Pagination {...defaultProps} currentPage={5} />);
      fireEvent.click(screen.getByTestId("pagination-next"));
      expect(defaultProps.onPageChange).not.toHaveBeenCalled();
    });

    it("enables both buttons on a middle page", () => {
      render(<Pagination {...defaultProps} currentPage={3} />);
      expect(screen.getByTestId("pagination-prev")).not.toBeDisabled();
      expect(screen.getByTestId("pagination-next")).not.toBeDisabled();
    });

    it("disables both buttons when there are zero items", () => {
      render(<Pagination {...defaultProps} totalItems={0} />);
      expect(screen.getByTestId("pagination-prev")).toBeDisabled();
      expect(screen.getByTestId("pagination-next")).toBeDisabled();
    });

    it("disables both buttons when all items fit on one page", () => {
      render(<Pagination {...defaultProps} totalItems={5} rowsPerPage={10} />);
      expect(screen.getByTestId("pagination-prev")).toBeDisabled();
      expect(screen.getByTestId("pagination-next")).toBeDisabled();
    });
  });

  // ─── Rows per page ───────────────────────────────────
  describe("Rows per page", () => {
    it("calls onRowsPerPageChange when selection changes", () => {
      render(<Pagination {...defaultProps} />);
      fireEvent.change(screen.getByTestId("pagination-rows-per-page"), {
        target: { value: "25" },
      });
      expect(defaultProps.onRowsPerPageChange).toHaveBeenCalledWith(25);
    });

    it("resets to page 1 when rows per page changes", () => {
      render(<Pagination {...defaultProps} currentPage={3} />);
      fireEvent.change(screen.getByTestId("pagination-rows-per-page"), {
        target: { value: "50" },
      });
      expect(defaultProps.onPageChange).toHaveBeenCalledWith(1);
    });

    it("calls both onRowsPerPageChange and onPageChange", () => {
      render(<Pagination {...defaultProps} currentPage={2} />);
      fireEvent.change(screen.getByTestId("pagination-rows-per-page"), {
        target: { value: "5" },
      });
      expect(defaultProps.onRowsPerPageChange).toHaveBeenCalledWith(5);
      expect(defaultProps.onPageChange).toHaveBeenCalledWith(1);
    });
  });

  // ─── Custom testId ────────────────────────────────────
  describe("Custom testId", () => {
    it("applies a custom testId to all sub-elements", () => {
      render(<Pagination {...defaultProps} testId="users-pagination" />);
      expect(screen.getByTestId("users-pagination")).toBeInTheDocument();
      expect(
        screen.getByTestId("users-pagination-rows-per-page"),
      ).toBeInTheDocument();
      expect(screen.getByTestId("users-pagination-info")).toBeInTheDocument();
      expect(screen.getByTestId("users-pagination-prev")).toBeInTheDocument();
      expect(screen.getByTestId("users-pagination-next")).toBeInTheDocument();
    });
  });

  // ─── Accessibility ───────────────────────────────────
  describe("Accessibility", () => {
    it("Previous button has aria-label", () => {
      render(<Pagination {...defaultProps} />);
      expect(screen.getByTestId("pagination-prev")).toHaveAttribute(
        "aria-label",
        "Previous page",
      );
    });

    it("Next button has aria-label", () => {
      render(<Pagination {...defaultProps} />);
      expect(screen.getByTestId("pagination-next")).toHaveAttribute(
        "aria-label",
        "Next page",
      );
    });

    it("select is associated with its label via htmlFor", () => {
      render(<Pagination {...defaultProps} />);
      const select = screen.getByTestId("pagination-rows-per-page");
      const label = screen.getByText("Rows per page:");
      expect(label).toHaveAttribute("for", select.id);
    });
  });

  // ─── Boundary / edge cases ───────────────────────────
  describe("Edge cases", () => {
    it("handles exactly one page of items", () => {
      render(<Pagination {...defaultProps} totalItems={10} rowsPerPage={10} />);
      expect(screen.getByTestId("pagination-info")).toHaveTextContent(
        "1–10 of 10",
      );
      expect(screen.getByTestId("pagination-prev")).toBeDisabled();
      expect(screen.getByTestId("pagination-next")).toBeDisabled();
    });

    it("handles a single item", () => {
      render(<Pagination {...defaultProps} totalItems={1} rowsPerPage={10} />);
      expect(screen.getByTestId("pagination-info")).toHaveTextContent(
        "1–1 of 1",
      );
    });

    it("handles large dataset correctly", () => {
      render(
        <Pagination
          {...defaultProps}
          totalItems={10000}
          rowsPerPage={25}
          currentPage={400}
        />,
      );
      expect(screen.getByTestId("pagination-info")).toHaveTextContent(
        "9976–10000 of 10000",
      );
    });
  });
});
