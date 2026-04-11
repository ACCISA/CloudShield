import { render } from "@testing-library/react";
import UsersIcon from "../NavBar/UsersIcon";

describe("UsersIcon", () => {
  it("renders without crashing", () => {
    const { container } = render(<UsersIcon />);
    expect(container).toBeTruthy();
  });

  it("renders an SVG element", () => {
    const { container } = render(<UsersIcon />);
    const svg = container.querySelector("svg");
    expect(svg).toBeTruthy();
  });

  it("uses default dimensions", () => {
    const { container } = render(<UsersIcon />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("width", "18");
    expect(svg).toHaveAttribute("height", "14");
  });

  it("accepts custom width and height", () => {
    const { container } = render(<UsersIcon width={36} height={28} />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("width", "36");
    expect(svg).toHaveAttribute("height", "28");
  });

  it("has correct viewBox", () => {
    const { container } = render(<UsersIcon />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("viewBox", "0 0 18 14");
  });

  it("renders SVG with correct namespace", () => {
    const { container } = render(<UsersIcon />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("xmlns", "http://www.w3.org/2000/svg");
  });

  it("contains multiple path elements", () => {
    const { container } = render(<UsersIcon />);
    const paths = container.querySelectorAll("path");
    expect(paths.length).toBeGreaterThan(0);
  });

  it("applies selected state with white color", () => {
    const { container } = render(<UsersIcon selected={true} />);
    const paths = container.querySelectorAll("path");
    paths.forEach((path) => {
      const stroke = path.getAttribute("stroke");
      if (stroke) expect(stroke).toBe("var(--sidebar-icon-active)");
    });
  });

  it("applies unselected state with gray color", () => {
    const { container } = render(<UsersIcon selected={false} />);
    const paths = container.querySelectorAll("path");
    paths.forEach((path) => {
      const stroke = path.getAttribute("stroke");
      if (stroke) expect(stroke).toBe("#BCBCBC");
    });
  });

  it("has fillOpacity 1 when selected", () => {
    const { container } = render(<UsersIcon selected={true} />);
    const paths = container.querySelectorAll("path");
    paths.forEach((path) => {
      const fillOpacity = path.getAttribute("fillOpacity");
      if (fillOpacity) expect(fillOpacity).toBe("1");
    });
  });

  it("has fillOpacity 0 when not selected", () => {
    const { container } = render(<UsersIcon selected={false} />);
    const paths = container.querySelectorAll("path");
    paths.forEach((path) => {
      const fillOpacity = path.getAttribute("fillOpacity");
      if (fillOpacity) expect(fillOpacity).toBe("0");
    });
  });

  it("applies custom className", () => {
    const { container } = render(<UsersIcon className="users-icon" />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveClass("users-icon");
  });

  it('renders with SVG fill="none"', () => {
    const { container } = render(<UsersIcon />);
    const svg = container.querySelector("svg");
    expect(svg).toBeTruthy();
  });
});
