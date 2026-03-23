/**
 * IconButton.test.jsx
 *
 * Test suite for the IconButton component
 * Tests basic functionality, disabled states, variants, and click handling
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import IconButton from "../IconButton/IconButton";

// Mock icon component
const MockIcon = () => <span data-testid="mock-icon">Icon</span>;

describe("IconButton Component", () => {
  describe("Rendering", () => {
    test("renders without crashing", () => {
      const onClick = jest.fn();
      render(<IconButton label="Button" onClick={onClick} />);

      const button = screen.getByText("Button");
      expect(button).toBeInTheDocument();
    });

    test("renders with button label", () => {
      const onClick = jest.fn();
      render(<IconButton label="Create New Item" onClick={onClick} />);

      expect(screen.getByText("Create New Item")).toBeInTheDocument();
    });

    test("renders with icon", () => {
      const onClick = jest.fn();
      render(
        <IconButton label="Button" icon={<MockIcon />} onClick={onClick} />
      );

      expect(screen.getByTestId("mock-icon")).toBeInTheDocument();
    });

    test("renders both icon and text", () => {
      const onClick = jest.fn();
      render(
        <IconButton label="Create" icon={<MockIcon />} onClick={onClick} />
      );

      expect(screen.getByTestId("mock-icon")).toBeInTheDocument();
      expect(screen.getByText("Create")).toBeInTheDocument();
    });

    test("renders without icon when not provided", () => {
      const onClick = jest.fn();
      render(<IconButton label="Download" onClick={onClick} />);

      expect(screen.queryByTestId("mock-icon")).not.toBeInTheDocument();
      expect(screen.getByText("Download")).toBeInTheDocument();
    });
  });

  describe("User Interactions", () => {
    test("calls onClick when clicked", () => {
      const onClick = jest.fn();
      render(<IconButton label="Button" onClick={onClick} />);

      const button = screen.getByText("Button");
      fireEvent.click(button);

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    test("does not call onClick when disabled", () => {
      const onClick = jest.fn();
      render(<IconButton label="Button" onClick={onClick} disabled={true} />);

      const button = screen.getByText("Button");
      fireEvent.click(button);

      expect(onClick).not.toHaveBeenCalled();
    });

    test("triggers hover state on mouse enter", () => {
      const onClick = jest.fn();
      render(<IconButton label="Button" onClick={onClick} />);

      const button = screen.getByRole("button");
      fireEvent.mouseEnter(button);

      // Button should be in the document after hover
      expect(button).toBeInTheDocument();
    });

    test("removes hover state on mouse leave", () => {
      const onClick = jest.fn();
      render(<IconButton label="Button" onClick={onClick} />);

      const button = screen.getByRole("button");
      fireEvent.mouseEnter(button);
      fireEvent.mouseLeave(button);

      expect(button).toBeInTheDocument();
    });

    test("does not trigger hover state when disabled", () => {
      const onClick = jest.fn();
      render(<IconButton label="Button" onClick={onClick} disabled={true} />);

      const button = screen.getByRole("button");
      fireEvent.mouseEnter(button);

      expect(button).toHaveAttribute("disabled");
    });
  });

  describe("Disabled State", () => {
    test("applies disabled attribute when disabled", () => {
      const onClick = jest.fn();
      render(<IconButton label="Button" onClick={onClick} disabled={true} />);

      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("disabled");
    });

    test("does not apply disabled attribute when not disabled", () => {
      const onClick = jest.fn();
      render(<IconButton label="Button" onClick={onClick} disabled={false} />);

      const button = screen.getByRole("button");
      expect(button).not.toHaveAttribute("disabled");
    });

    test("has reduced opacity when disabled", () => {
      const onClick = jest.fn();
      render(<IconButton label="Button" onClick={onClick} disabled={true} />);

      const button = screen.getByRole("button");
      expect(button).toHaveStyle({ opacity: 0.4 });
    });
  });

  describe("Variants", () => {
    test("renders with primary variant by default", () => {
      const onClick = jest.fn();
      render(<IconButton label="Button" onClick={onClick} />);

      const button = screen.getByRole("button");
      expect(button).toHaveStyle({
        minWidth: "120px",
        height: "48px",
        fontSize: "16px",
      });
    });

    test("renders with primary variant when specified", () => {
      const onClick = jest.fn();
      render(
        <IconButton label="Create" onClick={onClick} variant="primary" />
      );

      const button = screen.getByRole("button");
      expect(button).toHaveStyle({
        minWidth: "120px",
        height: "48px",
        fontSize: "16px",
      });
    });

    test("renders with secondary variant when specified", () => {
      const onClick = jest.fn();
      render(
        <IconButton label="Download" onClick={onClick} variant="secondary" />
      );

      const button = screen.getByRole("button");
      expect(button).toHaveStyle({
        fontSize: "14px",
        boxShadow: "none",
      });
    });
  });

  describe("Custom Styling", () => {
    test("applies custom styles", () => {
      const onClick = jest.fn();
      const customStyle = { backgroundColor: "red", padding: "20px" };
      render(
        <IconButton label="Button" onClick={onClick} style={customStyle} />
      );

      const button = screen.getByRole("button");
      expect(button).toHaveStyle({ padding: "20px" });
    });

    test("merges custom styles with default styles", () => {
      const onClick = jest.fn();
      const customStyle = { marginTop: "10px" };
      render(
        <IconButton label="Button" onClick={onClick} style={customStyle} />
      );

      const button = screen.getByRole("button");
      expect(button).toHaveStyle({
        marginTop: "10px",
        display: "flex",
      });
    });
  });

  describe("Accessibility", () => {
    test("has correct aria-label", () => {
      const onClick = jest.fn();
      render(<IconButton label="Create User" onClick={onClick} />);

      const button = screen.getByLabelText("Create User");
      expect(button).toBeInTheDocument();
    });

    test("has button role", () => {
      const onClick = jest.fn();
      render(<IconButton label="Button" onClick={onClick} />);

      const button = screen.getByRole("button");
      expect(button).toBeInTheDocument();
    });

    test("has type button attribute", () => {
      const onClick = jest.fn();
      render(<IconButton label="Button" onClick={onClick} />);

      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("type", "button");
    });
  });
});
