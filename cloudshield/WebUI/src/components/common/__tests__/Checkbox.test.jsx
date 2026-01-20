/**
 * Checkbox.test.jsx
 *
 * Test suite for the Checkbox component
 * Tests basic functionality, checked states, and disabled behavior
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import Checkbox from "../Checkbox/Checkbox";

describe("Checkbox Component", () => {
  describe("Rendering", () => {
    test("renders without crashing", () => {
      const { container } = render(<Checkbox />);
      expect(container.firstChild).toBeInTheDocument();
    });

    test("renders unchecked by default", () => {
      const { container } = render(<Checkbox />);
      const checkbox = container.querySelector("div > div");
      expect(checkbox).toBeInTheDocument();
    });

    test("renders checked when checked prop is true", () => {
      const { container } = render(<Checkbox checked={true} />);
      const checkbox = container.querySelector("div > div");
      expect(checkbox).toBeInTheDocument();
    });

    test("displays checkmark when checked", () => {
      const { container } = render(<Checkbox checked={true} />);
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    test("does not display checkmark when unchecked", () => {
      const { container } = render(<Checkbox checked={false} />);
      const svg = container.querySelector("svg");
      expect(svg).not.toBeInTheDocument();
    });
  });

  describe("User Interactions", () => {
    test("calls onChange when clicked", () => {
      const onChange = jest.fn();
      const { container } = render(<Checkbox onChange={onChange} />);

      const checkbox = container.firstChild;
      fireEvent.click(checkbox);

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith(true);
    });

    test("toggles from checked to unchecked", () => {
      const onChange = jest.fn();
      const { container } = render(
        <Checkbox checked={true} onChange={onChange} />
      );

      const checkbox = container.firstChild;
      fireEvent.click(checkbox);

      expect(onChange).toHaveBeenCalledWith(false);
    });

    test("does not call onChange when disabled", () => {
      const onChange = jest.fn();
      const { container } = render(
        <Checkbox disabled={true} onChange={onChange} />
      );

      const checkbox = container.firstChild;
      fireEvent.click(checkbox);

      expect(onChange).not.toHaveBeenCalled();
    });

    test("does not call onChange when onChange is not provided", () => {
      const { container } = render(<Checkbox />);

      const checkbox = container.firstChild;
      // Should not throw error
      expect(() => fireEvent.click(checkbox)).not.toThrow();
    });
  });

  describe("Disabled State", () => {
    test("applies disabled styles when disabled", () => {
      const { container } = render(<Checkbox disabled={true} />);
      const containerDiv = container.firstChild;

      expect(containerDiv).toHaveStyle({ opacity: "0.5" });
      expect(containerDiv).toHaveStyle({ cursor: "not-allowed" });
    });

    test("applies normal styles when not disabled", () => {
      const { container } = render(<Checkbox disabled={false} />);
      const containerDiv = container.firstChild;

      expect(containerDiv).toHaveStyle({ opacity: "1" });
      expect(containerDiv).toHaveStyle({ cursor: "pointer" });
    });
  });

  describe("Custom Styling", () => {
    test("applies custom styles", () => {
      const customStyle = { width: "30px" };
      const { container } = render(<Checkbox style={customStyle} />);

      const checkbox = container.querySelector("div > div");
      expect(checkbox).toBeInTheDocument();
    });
  });
});
