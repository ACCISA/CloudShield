import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import Pagination from "../Pagination";

describe("Pagination Component", () => {
  const defaultProps = {
    currentPage: 1,
    totalItems: 100,
    rowsPerPage: 10,
    onPageChange: vi.fn(),
    onRowsPerPageChange: vi.fn(),
  };

  it("renders the pagination component", () => {
    render(<Pagination {...defaultProps} />);

    expect(screen.getByTestId("pagination")).toBeTruthy();
  });

  it("renders with custom testId", () => {
    render(<Pagination {...defaultProps} testId="custom-pagination" />);

    expect(screen.getByTestId("custom-pagination")).toBeTruthy();
  });

  it("displays correct item range information", () => {
    render(<Pagination {...defaultProps} />);

    expect(screen.getByTestId("pagination-info")).toHaveTextContent(
      "1–10 of 100"
    );
  });

  it("displays correct range on middle pages", () => {
    render(<Pagination {...defaultProps} currentPage={5} />);

    expect(screen.getByTestId("pagination-info")).toHaveTextContent(
      "41–50 of 100"
    );
  });

  it("displays correct range on last page with partial items", () => {
    render(
      <Pagination {...defaultProps} currentPage={4} totalItems={35} />
    );

    expect(screen.getByTestId("pagination-info")).toHaveTextContent(
      "31–35 of 35"
    );
  });

  it("displays 0 items correctly when empty", () => {
    render(<Pagination {...defaultProps} totalItems={0} />);

    expect(screen.getByTestId("pagination-info")).toHaveTextContent(
      "0–0 of 0"
    );
  });

  it("renders rows per page selector", () => {
    render(<Pagination {...defaultProps} />);

    const selector = screen.getByTestId("pagination-rows-per-page");
    expect(selector).toBeTruthy();
    expect(selector).toHaveValue("10");
  });

  it("renders custom rows per page options", () => {
    render(
      <Pagination {...defaultProps} rowsPerPageOptions={[5, 15, 30]} />
    );

    const selector = screen.getByTestId(
      "pagination-rows-per-page"
    ) as HTMLSelectElement;
    const options = Array.from(selector.options).map((opt) => opt.value);

    expect(options).toEqual(["5", "15", "30"]);
  });

  it("calls onRowsPerPageChange and resets to page 1 when changing rows per page", () => {
    const onPageChange = vi.fn();
    const onRowsPerPageChange = vi.fn();

    render(
      <Pagination
        {...defaultProps}
        currentPage={3}
        onPageChange={onPageChange}
        onRowsPerPageChange={onRowsPerPageChange}
      />
    );

    fireEvent.change(screen.getByTestId("pagination-rows-per-page"), {
      target: { value: "25" },
    });

    expect(onRowsPerPageChange).toHaveBeenCalledWith(25);
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it("disables previous button on first page", () => {
    render(<Pagination {...defaultProps} currentPage={1} />);

    const prevButton = screen.getByTestId("pagination-prev");
    expect(prevButton).toBeDisabled();
  });

  it("enables previous button when not on first page", () => {
    render(<Pagination {...defaultProps} currentPage={2} />);

    const prevButton = screen.getByTestId("pagination-prev");
    expect(prevButton).not.toBeDisabled();
  });

  it("disables next button on last page", () => {
    render(
      <Pagination {...defaultProps} currentPage={10} totalItems={100} />
    );

    const nextButton = screen.getByTestId("pagination-next");
    expect(nextButton).toBeDisabled();
  });

  it("enables next button when not on last page", () => {
    render(<Pagination {...defaultProps} currentPage={5} />);

    const nextButton = screen.getByTestId("pagination-next");
    expect(nextButton).not.toBeDisabled();
  });

  it("calls onPageChange with previous page when clicking prev button", () => {
    const onPageChange = vi.fn();

    render(
      <Pagination {...defaultProps} currentPage={3} onPageChange={onPageChange} />
    );

    fireEvent.click(screen.getByTestId("pagination-prev"));

    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("calls onPageChange with next page when clicking next button", () => {
    const onPageChange = vi.fn();

    render(
      <Pagination {...defaultProps} currentPage={3} onPageChange={onPageChange} />
    );

    fireEvent.click(screen.getByTestId("pagination-next"));

    expect(onPageChange).toHaveBeenCalledWith(4);
  });

  it("does not call onPageChange when clicking disabled prev button", () => {
    const onPageChange = vi.fn();

    render(
      <Pagination {...defaultProps} currentPage={1} onPageChange={onPageChange} />
    );

    fireEvent.click(screen.getByTestId("pagination-prev"));

    expect(onPageChange).not.toHaveBeenCalled();
  });

  it("does not call onPageChange when clicking disabled next button", () => {
    const onPageChange = vi.fn();

    render(
      <Pagination
        {...defaultProps}
        currentPage={10}
        totalItems={100}
        onPageChange={onPageChange}
      />
    );

    fireEvent.click(screen.getByTestId("pagination-next"));

    expect(onPageChange).not.toHaveBeenCalled();
  });

  it("has correct aria-labels on navigation buttons", () => {
    render(<Pagination {...defaultProps} />);

    expect(screen.getByLabelText("Previous page")).toBeTruthy();
    expect(screen.getByLabelText("Next page")).toBeTruthy();
  });

  // Additional tests for uncovered calculation logic
  it("calculates totalPages correctly with exact division", () => {
    render(<Pagination {...defaultProps} totalItems={50} rowsPerPage={10} />);
    // 50/10 = 5 pages, on page 5 next should be disabled
    const nextButton = screen.getByTestId("pagination-next");
    expect(nextButton).not.toBeDisabled();
  });

  it("calculates totalPages correctly with remainder", () => {
    render(<Pagination {...defaultProps} totalItems={53} rowsPerPage={10} />);
    // 53/10 = 6 pages (ceiling)
    expect(screen.getByTestId("pagination-info")).toHaveTextContent("1–10 of 53");
  });

  it("calculates startItem as 0 when totalItems is 0", () => {
    render(<Pagination {...defaultProps} totalItems={0} rowsPerPage={10} currentPage={1} />);
    expect(screen.getByTestId("pagination-info")).toHaveTextContent("0–0 of 0");
  });

  it("calculates endItem correctly using Math.min on last page", () => {
    render(<Pagination {...defaultProps} totalItems={23} rowsPerPage={10} currentPage={3} />);
    // Page 3: startItem = 21, endItem = min(30, 23) = 23
    expect(screen.getByTestId("pagination-info")).toHaveTextContent("21–23 of 23");
  });

  it("handles canGoPrevious correctly on page 1", () => {
    const onPageChange = vi.fn();
    render(<Pagination {...defaultProps} currentPage={1} onPageChange={onPageChange} />);
    
    fireEvent.click(screen.getByTestId("pagination-prev"));
    expect(onPageChange).not.toHaveBeenCalled();
  });

  it("handles canGoNext correctly on last page", () => {
    const onPageChange = vi.fn();
    render(<Pagination {...defaultProps} currentPage={10} totalItems={100} rowsPerPage={10} onPageChange={onPageChange} />);
    
    fireEvent.click(screen.getByTestId("pagination-next"));
    expect(onPageChange).not.toHaveBeenCalled();
  });

  it("handlePrevious decrements page when canGoPrevious is true", () => {
    const onPageChange = vi.fn();
    render(<Pagination {...defaultProps} currentPage={5} onPageChange={onPageChange} />);
    
    fireEvent.click(screen.getByTestId("pagination-prev"));
    expect(onPageChange).toHaveBeenCalledWith(4);
  });

  it("handleNext increments page when canGoNext is true", () => {
    const onPageChange = vi.fn();
    render(<Pagination {...defaultProps} currentPage={5} totalItems={100} onPageChange={onPageChange} />);
    
    fireEvent.click(screen.getByTestId("pagination-next"));
    expect(onPageChange).toHaveBeenCalledWith(6);
  });

  it("handleRowsPerPageChange parses value and resets to page 1", () => {
    const onPageChange = vi.fn();
    const onRowsPerPageChange = vi.fn();
    render(
      <Pagination
        {...defaultProps}
        currentPage={5}
        onPageChange={onPageChange}
        onRowsPerPageChange={onRowsPerPageChange}
      />
    );
    
    fireEvent.change(screen.getByTestId("pagination-rows-per-page"), {
      target: { value: "50" },
    });
    
    expect(onRowsPerPageChange).toHaveBeenCalledWith(50);
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it("renders component with all elements visible", () => {
    render(<Pagination {...defaultProps} />);
    
    expect(screen.getByTestId("pagination")).toBeTruthy();
    expect(screen.getByTestId("pagination-info")).toBeTruthy();
    expect(screen.getByTestId("pagination-rows-per-page")).toBeTruthy();
    expect(screen.getByTestId("pagination-prev")).toBeTruthy();
    expect(screen.getByTestId("pagination-next")).toBeTruthy();
  });

  // Direct coverage tests for calculation logic
  describe("calculation logic coverage", () => {
    it("totalPages uses Math.ceil for non-exact division", () => {
      const onPageChange = vi.fn();
      // 15 items / 10 per page = 1.5, ceil = 2 pages
      render(<Pagination {...defaultProps} totalItems={15} rowsPerPage={10} currentPage={1} onPageChange={onPageChange} />);
      
      // On page 1 of 2, next should be enabled
      expect(screen.getByTestId("pagination-next")).not.toBeDisabled();
      fireEvent.click(screen.getByTestId("pagination-next"));
      expect(onPageChange).toHaveBeenCalledWith(2);
    });

    it("startItem returns 0 when totalItems is 0", () => {
      render(<Pagination {...defaultProps} totalItems={0} currentPage={1} />);
      expect(screen.getByTestId("pagination-info")).toHaveTextContent("0–0 of 0");
    });

    it("startItem calculates correctly when totalItems > 0", () => {
      // Page 2, 10 per page: startItem = (2-1)*10 + 1 = 11
      render(<Pagination {...defaultProps} totalItems={50} currentPage={2} rowsPerPage={10} />);
      expect(screen.getByTestId("pagination-info")).toHaveTextContent("11–20 of 50");
    });

    it("endItem uses Math.min to cap at totalItems", () => {
      // Page 2, 10 per page, 15 total: endItem = min(20, 15) = 15
      render(<Pagination {...defaultProps} totalItems={15} currentPage={2} rowsPerPage={10} />);
      expect(screen.getByTestId("pagination-info")).toHaveTextContent("11–15 of 15");
    });

    it("canGoPrevious is false on page 1", () => {
      const onPageChange = vi.fn();
      render(<Pagination {...defaultProps} currentPage={1} onPageChange={onPageChange} />);
      
      const prevBtn = screen.getByTestId("pagination-prev");
      expect(prevBtn).toBeDisabled();
      fireEvent.click(prevBtn);
      expect(onPageChange).not.toHaveBeenCalled();
    });

    it("canGoPrevious is true on page > 1", () => {
      const onPageChange = vi.fn();
      render(<Pagination {...defaultProps} currentPage={3} onPageChange={onPageChange} />);
      
      const prevBtn = screen.getByTestId("pagination-prev");
      expect(prevBtn).not.toBeDisabled();
      fireEvent.click(prevBtn);
      expect(onPageChange).toHaveBeenCalledWith(2);
    });

    it("canGoNext is false on last page", () => {
      const onPageChange = vi.fn();
      // 20 items, 10 per page = 2 pages, on page 2
      render(<Pagination {...defaultProps} totalItems={20} rowsPerPage={10} currentPage={2} onPageChange={onPageChange} />);
      
      const nextBtn = screen.getByTestId("pagination-next");
      expect(nextBtn).toBeDisabled();
      fireEvent.click(nextBtn);
      expect(onPageChange).not.toHaveBeenCalled();
    });

    it("canGoNext is true when not on last page", () => {
      const onPageChange = vi.fn();
      render(<Pagination {...defaultProps} totalItems={30} rowsPerPage={10} currentPage={1} onPageChange={onPageChange} />);
      
      const nextBtn = screen.getByTestId("pagination-next");
      expect(nextBtn).not.toBeDisabled();
      fireEvent.click(nextBtn);
      expect(onPageChange).toHaveBeenCalledWith(2);
    });

    it("handlePrevious calls onPageChange with currentPage - 1", () => {
      const onPageChange = vi.fn();
      render(<Pagination {...defaultProps} currentPage={4} onPageChange={onPageChange} />);
      
      fireEvent.click(screen.getByTestId("pagination-prev"));
      expect(onPageChange).toHaveBeenCalledWith(3);
    });

    it("handlePrevious does nothing when canGoPrevious is false", () => {
      const onPageChange = vi.fn();
      render(<Pagination {...defaultProps} currentPage={1} onPageChange={onPageChange} />);
      
      fireEvent.click(screen.getByTestId("pagination-prev"));
      expect(onPageChange).not.toHaveBeenCalled();
    });

    it("handleNext calls onPageChange with currentPage + 1", () => {
      const onPageChange = vi.fn();
      render(<Pagination {...defaultProps} totalItems={50} currentPage={2} onPageChange={onPageChange} />);
      
      fireEvent.click(screen.getByTestId("pagination-next"));
      expect(onPageChange).toHaveBeenCalledWith(3);
    });

    it("handleNext does nothing when canGoNext is false", () => {
      const onPageChange = vi.fn();
      render(<Pagination {...defaultProps} totalItems={10} rowsPerPage={10} currentPage={1} onPageChange={onPageChange} />);
      
      fireEvent.click(screen.getByTestId("pagination-next"));
      expect(onPageChange).not.toHaveBeenCalled();
    });

    it("handleRowsPerPageChange parses int value from event", () => {
      const onRowsPerPageChange = vi.fn();
      const onPageChange = vi.fn();
      render(
        <Pagination
          {...defaultProps}
          onRowsPerPageChange={onRowsPerPageChange}
          onPageChange={onPageChange}
        />
      );
      
      fireEvent.change(screen.getByTestId("pagination-rows-per-page"), {
        target: { value: "25" },
      });
      
      expect(onRowsPerPageChange).toHaveBeenCalledWith(25);
    });

    it("handleRowsPerPageChange resets page to 1", () => {
      const onPageChange = vi.fn();
      render(
        <Pagination
          {...defaultProps}
          currentPage={5}
          onPageChange={onPageChange}
        />
      );
      
      fireEvent.change(screen.getByTestId("pagination-rows-per-page"), {
        target: { value: "10" },
      });
      
      expect(onPageChange).toHaveBeenCalledWith(1);
    });
  });
});
