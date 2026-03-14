import { render, screen } from "@testing-library/react";

import TableSkeleton from "../TableSkeleton.jsx";

// Mock Skeleton so we can assert how many times it renders and what props it receives
jest.mock("../../ui/Skeleton", () => {
  return function MockSkeleton(props) {
    const height = props?.height ?? "";
    return <div data-testid="skeleton" data-height={String(height)} />;
  };
});

describe("TableSkeleton", () => {
  it("renders default skeleton grid (rows=8, cols=5)", () => {
    render(<TableSkeleton />);

    // 1 header skeleton (height=36) + (rows * cols) body skeletons (height=14)
    const skeletons = screen.getAllByTestId("skeleton");
    expect(skeletons).toHaveLength(1 + 8 * 5);

    const header = skeletons.find((n) => n.getAttribute("data-height") === "36");
    expect(header).toBeTruthy();

    const body = skeletons.filter((n) => n.getAttribute("data-height") === "14");
    expect(body).toHaveLength(8 * 5);
  });

  it("renders correct number of skeletons for custom rows/cols", () => {
    render(<TableSkeleton rows={3} cols={2} />);

    // 1 header + 3*2 body
    const skeletons = screen.getAllByTestId("skeleton");
    expect(skeletons).toHaveLength(1 + 3 * 2);

    const headerCount = skeletons.filter((n) => n.getAttribute("data-height") === "36").length;
    const bodyCount = skeletons.filter((n) => n.getAttribute("data-height") === "14").length;

    expect(headerCount).toBe(1);
    expect(bodyCount).toBe(3 * 2);
  });

  it("renders only the header skeleton when rows=0", () => {
    render(<TableSkeleton rows={0} cols={5} />);

    const skeletons = screen.getAllByTestId("skeleton");
    expect(skeletons).toHaveLength(1);

    expect(skeletons[0]).toHaveAttribute("data-height", "36");
  });

  it("renders only the header skeleton when cols=0 (no body cells)", () => {
    render(<TableSkeleton rows={4} cols={0} />);

    const skeletons = screen.getAllByTestId("skeleton");
    expect(skeletons).toHaveLength(1);

    expect(skeletons[0]).toHaveAttribute("data-height", "36");
  });
});