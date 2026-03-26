/**
 * HoverableRow.test.jsx
 *
 * Test suite for the HoverableRow component
 * Tests hover effects, styling, and props handling
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import HoverableRow from "../HoverableRow";

// Mock useThemeColors hook
jest.mock("../../../hooks/useThemeColors.js", () => ({
  useThemeColors: () => ({
    isDark: true,
    isLight: false,
    lightOverlaySubtle: "rgba(255,255,255,0.03)",
  }),
}));

describe("HoverableRow Component", () => {
  describe("Rendering", () => {
    test("renders without crashing", () => {
      const { container } = render(
        <HoverableRow>
          <span>Test Content</span>
        </HoverableRow>
      );
      expect(container.firstChild).toBeInTheDocument();
    });

    test("renders children correctly", () => {
      render(
        <HoverableRow>
          <span data-testid="test-content">Test Content</span>
        </HoverableRow>
      );
      const content = screen.getByTestId("test-content");
      expect(content).toBeInTheDocument();
      expect(content).toHaveTextContent("Test Content");
    });

    test("renders with multiple children", () => {
      render(
        <HoverableRow>
          <span data-testid="child-1">Child 1</span>
          <span data-testid="child-2">Child 2</span>
          <span data-testid="child-3">Child 3</span>
        </HoverableRow>
      );
      expect(screen.getByTestId("child-1")).toBeInTheDocument();
      expect(screen.getByTestId("child-2")).toBeInTheDocument();
      expect(screen.getByTestId("child-3")).toBeInTheDocument();
    });
  });

  describe("Props Handling", () => {
    test("applies custom className", () => {
      const { container } = render(
        <HoverableRow className="custom-class">
          <span>Content</span>
        </HoverableRow>
      );
      expect(container.firstChild).toHaveClass("custom-class");
    });

    test("applies custom style", () => {
      const customStyle = { padding: "20px", margin: "10px" };
      const { container } = render(
        <HoverableRow style={customStyle}>
          <span>Content</span>
        </HoverableRow>
      );
      const row = container.firstChild;
      expect(row).toHaveStyle("padding: 20px");
      expect(row).toHaveStyle("margin: 10px");
    });

    test("merges custom styles with default style", () => {
      const customStyle = { color: "red" };
      const { container } = render(
        <HoverableRow style={customStyle}>
          <span>Content</span>
        </HoverableRow>
      );
      const row = container.firstChild;
      expect(row).toHaveStyle("color: red");
    });
  });

  describe("Hover Effects", () => {
    test("applies background color on hover", () => {
      const { container } = render(
        <HoverableRow>
          <span>Content</span>
        </HoverableRow>
      );
      const row = container.firstChild;

      fireEvent.mouseEnter(row);
      expect(row.style.backgroundColor).toBe("rgba(255, 255, 255, 0.03)");
    });

    test("updates zIndex on hover", () => {
      const { container } = render(
        <HoverableRow>
          <span>Content</span>
        </HoverableRow>
      );
      const row = container.firstChild;

      fireEvent.mouseEnter(row);
      expect(row.style.zIndex).toBe("100");
    });

    test("removes background color on mouse leave", () => {
      const { container } = render(
        <HoverableRow>
          <span>Content</span>
        </HoverableRow>
      );
      const row = container.firstChild;

      fireEvent.mouseEnter(row);
      expect(row.style.backgroundColor).toBe("rgba(255, 255, 255, 0.03)");

      fireEvent.mouseLeave(row);
      expect(row.style.backgroundColor).toBe("transparent");
    });

    test("resets zIndex on mouse leave", () => {
      const { container } = render(
        <HoverableRow>
          <span>Content</span>
        </HoverableRow>
      );
      const row = container.firstChild;

      fireEvent.mouseEnter(row);
      expect(row.style.zIndex).toBe("100");

      fireEvent.mouseLeave(row);
      expect(row.style.zIndex).toBe("1");
    });

    test("handles multiple hover/leave cycles", () => {
      const { container } = render(
        <HoverableRow>
          <span>Content</span>
        </HoverableRow>
      );
      const row = container.firstChild;

      // First cycle
      fireEvent.mouseEnter(row);
      expect(row.style.backgroundColor).toBe("rgba(255, 255, 255, 0.03)");
      fireEvent.mouseLeave(row);
      expect(row.style.backgroundColor).toBe("transparent");

      // Second cycle
      fireEvent.mouseEnter(row);
      expect(row.style.backgroundColor).toBe("rgba(255, 255, 255, 0.03)");
      fireEvent.mouseLeave(row);
      expect(row.style.backgroundColor).toBe("transparent");
    });
  });

  describe("Additional Props (Rest Props)", () => {
    test("passes through onClick handler", () => {
      const handleClick = jest.fn();
      const { container } = render(
        <HoverableRow onClick={handleClick}>
          <span>Content</span>
        </HoverableRow>
      );
      const row = container.firstChild;

      fireEvent.click(row);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    test("passes through data attributes", () => {
      const { container } = render(
        <HoverableRow data-testid="hoverable-row" data-custom="test-value">
          <span>Content</span>
        </HoverableRow>
      );
      const row = screen.getByTestId("hoverable-row");
      expect(row).toHaveAttribute("data-custom", "test-value");
    });

    test("supports id attribute", () => {
      const { container } = render(
        <HoverableRow id="my-row">
          <span>Content</span>
        </HoverableRow>
      );
      const row = container.firstChild;
      expect(row).toHaveAttribute("id", "my-row");
    });
  });

  describe("Complex Scenarios", () => {
    test("handles null onClick handler gracefully", () => {
      const { container } = render(
        <HoverableRow onClick={undefined}>
          <span>Content</span>
        </HoverableRow>
      );
      const row = container.firstChild;

      expect(() => {
        fireEvent.click(row);
      }).not.toThrow();
    });

    test("combines className and style props", () => {
      const { container } = render(
        <HoverableRow className="row-class" style={{ padding: "10px" }}>
          <span>Content</span>
        </HoverableRow>
      );
      const row = container.firstChild;
      expect(row).toHaveClass("row-class");
      expect(row).toHaveStyle("padding: 10px");
    });

    test("handles empty children", () => {
      const { container } = render(<HoverableRow />);
      expect(container.firstChild).toBeInTheDocument();
    });

    test("works with form elements as children", () => {
      const handleChange = jest.fn();
      const { container } = render(
        <HoverableRow>
          <input
            type="checkbox"
            data-testid="checkbox"
            onChange={handleChange}
          />
        </HoverableRow>
      );
      const checkbox = screen.getByTestId("checkbox");
      fireEvent.click(checkbox);
      expect(handleChange).toHaveBeenCalled();
    });
  });
});
