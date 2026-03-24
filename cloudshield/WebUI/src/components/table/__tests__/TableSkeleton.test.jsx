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
  it("renders default skeleton grid (rows=6, cols=5)", () => {
    render(<TableSkeleton />);

    // headers: 5x14, body rows: first col 6x28, remaining 24x16
    const skeletons = screen.getAllByTestId("skeleton");
    expect(skeletons).toHaveLength(35);

    const headers = skeletons.filter((n) => n.getAttribute("data-height") === "14");
    const avatars = skeletons.filter((n) => n.getAttribute("data-height") === "28");
    const cells = skeletons.filter((n) => n.getAttribute("data-height") === "16");

    expect(headers).toHaveLength(5);
    expect(avatars).toHaveLength(6);
    expect(cells).toHaveLength(24);
  });

  it("renders correct number of skeletons for custom rows/cols", () => {
    render(<TableSkeleton rows={3} cols={2} />);

    // 2 headers + (3x1 avatar) + (3x1 text cell)
    const skeletons = screen.getAllByTestId("skeleton");
    expect(skeletons).toHaveLength(8);

    const headerCount = skeletons.filter((n) => n.getAttribute("data-height") === "14").length;
    const avatarCount = skeletons.filter((n) => n.getAttribute("data-height") === "28").length;
    const cellCount = skeletons.filter((n) => n.getAttribute("data-height") === "16").length;

    expect(headerCount).toBe(2);
    expect(avatarCount).toBe(3);
    expect(cellCount).toBe(3);
  });

  it("renders only header skeletons when rows=0", () => {
    render(<TableSkeleton rows={0} cols={5} />);

    const skeletons = screen.getAllByTestId("skeleton");
    expect(skeletons).toHaveLength(5);
    expect(
      skeletons.every((node) => node.getAttribute("data-height") === "14")
    ).toBe(true);
  });

  it("renders no skeleton cells when cols=0", () => {
    render(<TableSkeleton rows={4} cols={0} />);

    expect(screen.queryAllByTestId("skeleton")).toHaveLength(0);
  });
});
