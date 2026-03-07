import { render, screen } from "@testing-library/react";

import TableSurface from "../TableSurface";

describe("TableSurface", () => {
  it("renders children", () => {
    render(
      <TableSurface>
        <div data-testid="content">Hello</div>
      </TableSurface>
    );

    expect(screen.getByTestId("content")).toBeInTheDocument();
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  it("applies outer container layout styles", () => {
    const { container } = render(
      <TableSurface>
        <div>Content</div>
      </TableSurface>
    );

    const outer = container.firstChild;
    expect(outer).toBeTruthy();

    // Inline styles are applied on the outer div
    expect(outer).toHaveStyle({
      height: "100%",
      display: "flex",
      flexDirection: "column",
      minHeight: "0",
      border: "var(--border)",
      borderRadius: "var(--radius)",
      background: "var(--surface)",
    });
  });

  it("applies scroll container styles to the inner wrapper", () => {
    const { container } = render(
      <TableSurface>
        <div data-testid="content">Content</div>
      </TableSurface>
    );

    const outer = container.firstChild;
    const inner = outer?.firstChild;

    expect(inner).toBeTruthy();
    expect(inner).toHaveStyle({
      flex: "1",
      minHeight: "0",
      overflow: "auto",
    });

    // Ensure children are inside the scroll wrapper
    expect(screen.getByTestId("content")).toBeInTheDocument();
  });
});