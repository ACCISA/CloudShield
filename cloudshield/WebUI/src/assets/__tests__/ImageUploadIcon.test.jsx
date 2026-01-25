/**
 * ImageUploadIcon.test.jsx
 *
 * Test suite for the ImageUploadIcon component
 */
import React from "react";
import { render } from "@testing-library/react";
import ImageUploadIcon from "../ImageUploadIcon.jsx";

describe("ImageUploadIcon", () => {
  test("renders with default props", () => {
    const { container } = render(<ImageUploadIcon />);
    const svg = container.querySelector("svg");

    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute("width", "64");
    expect(svg).toHaveAttribute("height", "64");
  });

  test("renders with custom width and height", () => {
    const { container } = render(<ImageUploadIcon width={32} height={32} />);
    const svg = container.querySelector("svg");

    expect(svg).toHaveAttribute("width", "32");
    expect(svg).toHaveAttribute("height", "32");
  });

  test("renders with custom fill color", () => {
    const { container } = render(<ImageUploadIcon fill="#FF0000" />);
    const paths = container.querySelectorAll("path");

    paths.forEach((path) => {
      expect(path).toHaveAttribute("fill", "#FF0000");
    });
  });

  test("applies custom className", () => {
    const { container } = render(<ImageUploadIcon className="custom-class" />);
    const svg = container.querySelector("svg");

    expect(svg).toHaveClass("custom-class");
  });

  test("renders SVG with correct viewBox", () => {
    const { container } = render(<ImageUploadIcon />);
    const svg = container.querySelector("svg");

    expect(svg).toHaveAttribute("viewBox", "0 0 24 24");
  });

  test("renders all SVG path elements", () => {
    const { container } = render(<ImageUploadIcon />);
    const paths = container.querySelectorAll("path");

    expect(paths.length).toBe(2);
  });
});
