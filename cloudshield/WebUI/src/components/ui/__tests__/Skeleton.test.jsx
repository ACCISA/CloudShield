import React from "react";
import { render } from "@testing-library/react";
import Skeleton from "../Skeleton";

describe("Skeleton", () => {
  it("renders a div with default height/width and base styles that JSDOM preserves", () => {
    const { container } = render(<Skeleton />);
    const el = container.firstChild;

    expect(el).toBeInTheDocument();
    expect(el.tagName.toLowerCase()).toBe("div");

    // Defaults
    expect(el).toHaveStyle({ height: "14px" });
    expect(el).toHaveStyle({ width: "100%" });

    // Base styles (reliably represented in JSDOM)
    expect(el).toHaveStyle({ borderRadius: "8px" });
    expect(el).toHaveStyle({ backgroundSize: "400% 100%" });
    expect(el).toHaveStyle({ animation: "shimmer 1.2s ease-in-out infinite" });

    // Optional: ensure style attribute is not empty (smoke)
    expect(el.getAttribute("style")).toBeTruthy();
  });

  it("accepts custom numeric height/width (px) and string values", () => {
    const { container, rerender } = render(<Skeleton height={32} width={250} />);
    let el = container.firstChild;

    expect(el).toHaveStyle({ height: "32px" });
    expect(el).toHaveStyle({ width: "250px" });

    rerender(<Skeleton height="3rem" width="40%" />);
    el = container.firstChild;

    expect(el).toHaveStyle({ height: "3rem" });
    expect(el).toHaveStyle({ width: "40%" });
  });

  it("merges style prop and allows overriding base styles", () => {
    const { container } = render(
      <Skeleton
        height={20}
        width="60%"
        style={{
          borderRadius: 2,             // override base
          animation: "none",           // override base
          opacity: 0.5,                // add new
          backgroundSize: "200% 100%", // override base
        }}
      />
    );

    const el = container.firstChild;

    // Props applied
    expect(el).toHaveStyle({ height: "20px" });
    expect(el).toHaveStyle({ width: "60%" });

    // Overrides applied
    expect(el).toHaveStyle({ borderRadius: "2px" });
    expect(el).toHaveStyle({ animation: "none" });
    expect(el).toHaveStyle({ opacity: "0.5" });
    expect(el).toHaveStyle({ backgroundSize: "200% 100%" });
  });

  it("handles style={undefined} safely", () => {
    const { container } = render(<Skeleton style={undefined} />);
    const el = container.firstChild;

    expect(el).toBeInTheDocument();
    expect(el).toHaveStyle({ height: "14px" });
    expect(el).toHaveStyle({ width: "100%" });
  });

  it("handles style={null} safely", () => {
    const { container } = render(<Skeleton style={null} />);
    const el = container.firstChild;

    expect(el).toBeInTheDocument();
    expect(el).toHaveStyle({ height: "14px" });
    expect(el).toHaveStyle({ width: "100%" });
  });
});
