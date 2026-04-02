import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import Pagination from "../Pagination";

describe("Pagination", () => {
  it("renders the range text and hides controls for a single page", () => {
    render(
      <Pagination
        totalItems={8}
        itemsPerPage={10}
        currentPage={1}
        onPageChange={vi.fn()}
        itemLabel="records"
      />,
    );

    expect(screen.getByTestId("pagination-info").textContent).toContain(
      "Showing 1-8 of 8 records",
    );
    expect(screen.queryByTestId("pagination-prev")).toBeNull();
    expect(screen.queryByTestId("pagination-next")).toBeNull();
  });

  it("renders bounded page buttons and supports direct page changes", () => {
    const onPageChange = vi.fn();

    render(
      <Pagination
        totalItems={45}
        itemsPerPage={10}
        currentPage={2}
        onPageChange={onPageChange}
      />,
    );

    expect(screen.getByTestId("pagination-page-1")).not.toBeNull();
    expect(screen.getByTestId("pagination-page-5")).not.toBeNull();
    expect(screen.queryByText("...")).toBeNull();

    fireEvent.click(screen.getByTestId("pagination-prev"));
    fireEvent.click(screen.getByTestId("pagination-next"));
    fireEvent.click(screen.getByTestId("pagination-page-4"));

    expect(onPageChange).toHaveBeenCalledWith(1);
    expect(onPageChange).toHaveBeenCalledWith(3);
    expect(onPageChange).toHaveBeenCalledWith(4);
  });

  it("shows trailing ellipsis when current page is near the beginning", () => {
    render(
      <Pagination
        totalItems={200}
        itemsPerPage={10}
        currentPage={2}
        onPageChange={vi.fn()}
        maxPageButtons={7}
      />,
    );

    expect(screen.getByTestId("pagination-page-6")).not.toBeNull();
    expect(screen.getByTestId("pagination-page-20")).not.toBeNull();
    expect(screen.getAllByText("...")).toHaveLength(1);
  });

  it("shows both ellipses when current page is in the middle", () => {
    const onPageChange = vi.fn();

    render(
      <Pagination
        totalItems={200}
        itemsPerPage={10}
        currentPage={10}
        onPageChange={onPageChange}
      />,
    );

    expect(screen.getAllByText("...")).toHaveLength(2);

    fireEvent.click(screen.getByTestId("pagination-prev"));
    fireEvent.click(screen.getByTestId("pagination-next"));

    expect(onPageChange).toHaveBeenCalledWith(9);
    expect(onPageChange).toHaveBeenCalledWith(11);
  });

  it("disables next button on the last page and supports previous navigation", () => {
    const onPageChange = vi.fn();

    render(
      <Pagination
        totalItems={200}
        itemsPerPage={10}
        currentPage={20}
        onPageChange={onPageChange}
      />,
    );

    const nextButton = screen.getByTestId("pagination-next");
    const prevButton = screen.getByTestId("pagination-prev");

    expect((nextButton as HTMLButtonElement).disabled).toBe(true);
    expect((prevButton as HTMLButtonElement).disabled).toBe(false);

    fireEvent.click(nextButton);
    fireEvent.click(prevButton);

    expect(onPageChange).toHaveBeenCalledTimes(1);
    expect(onPageChange).toHaveBeenCalledWith(19);
  });

  it("renders a zero range when there are no items", () => {
    render(
      <Pagination
        totalItems={0}
        itemsPerPage={10}
        currentPage={1}
        onPageChange={vi.fn()}
      />,
    );

    expect(screen.getByTestId("pagination-info").textContent).toContain(
      "Showing 0-0 of 0 items",
    );
  });
});
