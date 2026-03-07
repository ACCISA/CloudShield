import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import Pagination from "../Pagination/Pagination";

const defaultProps = {
  currentPage: 1,
  totalItems: 50,
  itemsPerPage: 10,
  onPageChange: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("Pagination Component", () => {
  it("renders without crashing", () => {
    render(<Pagination {...defaultProps} />);
    expect(screen.getByTestId("pagination")).toBeInTheDocument();
  });

  it("displays the correct item range", () => {
    render(<Pagination {...defaultProps} />);
    expect(screen.getByTestId("pagination-info")).toHaveTextContent(
      "Showing 1-10 of 50 items",
    );
  });

  it("displays the correct range on page 2", () => {
    render(<Pagination {...defaultProps} currentPage={2} />);
    expect(screen.getByTestId("pagination-info")).toHaveTextContent(
      "Showing 11-20 of 50 items",
    );
  });

  it("displays the correct range on a partial last page", () => {
    render(<Pagination {...defaultProps} currentPage={6} totalItems={53} />);
    expect(screen.getByTestId("pagination-info")).toHaveTextContent(
      "Showing 51-53 of 53 items",
    );
  });

  it("displays zero range when no items exist", () => {
    render(<Pagination {...defaultProps} totalItems={0} />);
    expect(screen.getByTestId("pagination-info")).toHaveTextContent(
      "Showing 0-0 of 0 items",
    );
  });

  it("calls onPageChange when Next is clicked", () => {
    render(<Pagination {...defaultProps} />);
    fireEvent.click(screen.getByTestId("pagination-next"));
    expect(defaultProps.onPageChange).toHaveBeenCalledWith(2);
  });

  it("calls onPageChange when Previous is clicked", () => {
    render(<Pagination {...defaultProps} currentPage={3} />);
    fireEvent.click(screen.getByTestId("pagination-prev"));
    expect(defaultProps.onPageChange).toHaveBeenCalledWith(2);
  });

  it("disables Previous on the first page", () => {
    render(<Pagination {...defaultProps} />);
    expect(screen.getByTestId("pagination-prev")).toBeDisabled();
  });

  it("disables Next on the last page", () => {
    render(<Pagination {...defaultProps} currentPage={5} />);
    expect(screen.getByTestId("pagination-next")).toBeDisabled();
  });

  it("renders page numbers and page info when multiple pages exist", () => {
    render(<Pagination {...defaultProps} currentPage={3} />);
    expect(screen.getByTestId("pagination-page-1")).toBeInTheDocument();
    expect(screen.getByTestId("pagination-page-3")).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByTestId("pagination-page-info")).toHaveTextContent(
      "Page 3 of 5",
    );
  });

  it("hides controls when only one page exists", () => {
    render(<Pagination {...defaultProps} totalItems={5} itemsPerPage={10} />);
    expect(screen.queryByTestId("pagination-prev")).not.toBeInTheDocument();
    expect(screen.queryByTestId("pagination-next")).not.toBeInTheDocument();
    expect(screen.queryByTestId("pagination-page-info")).not.toBeInTheDocument();
  });

  it("shows ellipsis for large datasets", () => {
    render(
      <Pagination
        {...defaultProps}
        totalItems={200}
        itemsPerPage={10}
        currentPage={10}
      />,
    );
    expect(screen.getByTestId("pagination-ellipsis-start")).toBeInTheDocument();
    expect(screen.getByTestId("pagination-ellipsis-end")).toBeInTheDocument();
  });

  it("uses custom item label and test id", () => {
    render(
      <Pagination
        {...defaultProps}
        itemLabel="alerts"
        testId="alerts-pagination"
      />,
    );
    expect(screen.getByTestId("alerts-pagination-info")).toHaveTextContent(
      "Showing 1-10 of 50 alerts",
    );
    expect(screen.getByTestId("alerts-pagination-prev")).toBeInTheDocument();
  });
});
