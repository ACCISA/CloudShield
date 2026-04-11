/**
 * GroupsIcon.test.jsx
 *
 * Test suite for the GroupsIcon component
 */
import React from "react";
import { render } from "@testing-library/react";
import GroupsIcon from "../GroupsIcon.jsx";

describe("GroupsIcon", () => {
  test("renders with default props (unselected)", () => {
    const { container } = render(<GroupsIcon />);
    const svg = container.querySelector("svg");

    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute("width", "14");
    expect(svg).toHaveAttribute("height", "12");
  });

  test("renders with custom width and height", () => {
    const { container } = render(<GroupsIcon width={20} height={18} />);
    const svg = container.querySelector("svg");

    expect(svg).toHaveAttribute("width", "20");
    expect(svg).toHaveAttribute("height", "18");
  });

  test("uses correct colors when selected", () => {
    const { container } = render(<GroupsIcon selected={true} />);
    const paths = container.querySelectorAll("path");

    paths.forEach((path) => {
      expect(path).toHaveAttribute("fill", "var(--sidebar-icon-active)");
      expect(path).toHaveAttribute("stroke", "var(--sidebar-icon-active)");
    });
  });

  test("uses correct colors when not selected", () => {
    const { container } = render(<GroupsIcon selected={false} />);
    const paths = container.querySelectorAll("path");

    paths.forEach((path) => {
      expect(path).toHaveAttribute("fill", "#BCBCBC");
      expect(path).toHaveAttribute("stroke", "#BCBCBC");
    });
  });

  test("applies custom className", () => {
    const { container } = render(<GroupsIcon className="nav-icon" />);
    const svg = container.querySelector("svg");

    expect(svg).toHaveClass("nav-icon");
  });

  test("renders correct number of path elements", () => {
    const { container } = render(<GroupsIcon />);
    const paths = container.querySelectorAll("path");

    expect(paths.length).toBeGreaterThan(0);
  });

  test("renders SVG with correct viewBox", () => {
    const { container } = render(<GroupsIcon />);
    const svg = container.querySelector("svg");

    expect(svg).toHaveAttribute("viewBox", "0 0 14 12");
  });

  test("toggles selected state", () => {
    const { container, rerender } = render(<GroupsIcon selected={false} />);
    let paths = container.querySelectorAll("path");

    paths.forEach((path) => {
      expect(path).toHaveAttribute("fill", "#BCBCBC");
    });

    rerender(<GroupsIcon selected={true} />);
    paths = container.querySelectorAll("path");

    paths.forEach((path) => {
      expect(path).toHaveAttribute("fill", "var(--sidebar-icon-active)");
    });
  });
});
