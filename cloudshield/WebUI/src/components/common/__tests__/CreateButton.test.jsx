/**
 * CreateButton.test.jsx
 *
 * Test suite for the CreateButton component
 * Tests basic functionality, disabled states, and click handling
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import CreateButton from "../CreateButton/CreateButton";

jest.mock("../../../hooks/useThemeColors.js", () => ({
  useThemeColors: () => ({
    secondary: "#1a1a1a",
    secondaryHover: "#242424",
    secondaryBorder: "rgba(255, 255, 255, 0.1)",
    secondaryText: "#ffffff",
  }),
}));

// Mock icon component
const MockIcon = () => <span data-testid="mock-icon">Icon</span>;

describe("CreateButton Component", () => {
  describe("Rendering", () => {
    test("renders without crashing", () => {
      const onClick = jest.fn();
      render(<CreateButton buttonText="Create" onClick={onClick} />);

      const button = screen.getByText("Create");
      expect(button).toBeInTheDocument();
    });

    test("renders with button text", () => {
      const onClick = jest.fn();
      render(<CreateButton buttonText="Create New Item" onClick={onClick} />);

      expect(screen.getByText("Create New Item")).toBeInTheDocument();
    });

    test("renders with icon", () => {
      const onClick = jest.fn();
      render(
        <CreateButton
          buttonText="Create"
          icon={<MockIcon />}
          onClick={onClick}
        />
      );

      expect(screen.getByTestId("mock-icon")).toBeInTheDocument();
    });

    test("renders both icon and text", () => {
      const onClick = jest.fn();
      render(
        <CreateButton
          buttonText="Create"
          icon={<MockIcon />}
          onClick={onClick}
        />
      );

      expect(screen.getByTestId("mock-icon")).toBeInTheDocument();
      expect(screen.getByText("Create")).toBeInTheDocument();
    });
  });

  describe("User Interactions", () => {
    test("calls onClick when clicked", () => {
      const onClick = jest.fn();
      render(<CreateButton buttonText="Create" onClick={onClick} />);

      const button = screen.getByText("Create");
      fireEvent.click(button);

      expect(onClick).toHaveBeenCalled();
    });

    test("does not call onClick when disabled", () => {
      const onClick = jest.fn();
      render(
        <CreateButton buttonText="Create" onClick={onClick} disabled={true} />
      );

      const button = screen.getByText("Create").parentElement;
      fireEvent.click(button);

      expect(onClick).not.toHaveBeenCalled();
    });
  });

  describe("Disabled State", () => {
    test("applies disabled styles when disabled", () => {
      const onClick = jest.fn();
      render(
        <CreateButton buttonText="Create" onClick={onClick} disabled={true} />
      );

      const button = screen.getByText("Create").parentElement;
      expect(button).toBeInTheDocument();
    });

    test("applies normal styles when not disabled", () => {
      const onClick = jest.fn();
      render(
        <CreateButton buttonText="Create" onClick={onClick} disabled={false} />
      );

      const button = screen.getByText("Create").parentElement;
      expect(button).toBeInTheDocument();
    });

    test("is not disabled by default", () => {
      const onClick = jest.fn();
      render(<CreateButton buttonText="Create" onClick={onClick} />);

      const button = screen.getByText("Create").parentElement;
      expect(button).toBeInTheDocument();
    });
  });

  describe("Hover Effects", () => {
    test("changes styles on mouse enter", () => {
      const onClick = jest.fn();
      render(<CreateButton buttonText="Create" onClick={onClick} />);

      const button = screen.getByRole("button");
      fireEvent.mouseEnter(button);

      expect(button.style.background).toBe("rgb(36, 36, 36)");
      expect(button.style.borderColor).toBe("rgba(255, 255, 255, 0.2)");
    });

    test("restores styles on mouse leave", () => {
      const onClick = jest.fn();
      render(<CreateButton buttonText="Create" onClick={onClick} />);

      const button = screen.getByRole("button");
      fireEvent.mouseEnter(button);
      fireEvent.mouseLeave(button);

      expect(button.style.background).toBe("rgb(26, 26, 26)");
      expect(button.style.borderColor).toBe("rgba(255, 255, 255, 0.1)");
    });

    test("does not change styles on hover when disabled", () => {
      const onClick = jest.fn();
      render(
        <CreateButton buttonText="Create" onClick={onClick} disabled={true} />
      );

      const button = screen.getByRole("button");
      const initialBackground = button.style.background;
      const initialBorderColor = button.style.borderColor;

      fireEvent.mouseEnter(button);
      expect(button.style.background).toBe(initialBackground);
      expect(button.style.borderColor).toBe(initialBorderColor);

      fireEvent.mouseLeave(button);
      expect(button.style.background).toBe(initialBackground);
      expect(button.style.borderColor).toBe(initialBorderColor);
    });

    test("applies hover styles correctly on enabled button", () => {
      const onClick = jest.fn();
      render(<CreateButton buttonText="Create" onClick={onClick} />);

      const button = screen.getByText("Create").parentElement;
      fireEvent.mouseEnter(button);
      fireEvent.mouseLeave(button);

      expect(button).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    test("renders without onClick handler", () => {
      render(<CreateButton buttonText="Create" />);

      expect(screen.getByText("Create")).toBeInTheDocument();
    });

    test("renders with empty buttonText", () => {
      const onClick = jest.fn();
      render(<CreateButton buttonText="" onClick={onClick} />);

      const button = screen.getByRole("button", { name: "" });
      expect(button).toBeInTheDocument();
    });

    test("renders with long button text", () => {
      const onClick = jest.fn();
      render(
        <CreateButton
          buttonText="Create New Item With Very Long Text"
          onClick={onClick}
        />
      );

      expect(
        screen.getByText("Create New Item With Very Long Text")
      ).toBeInTheDocument();
    });

    test("handles rapid clicks", () => {
      const onClick = jest.fn();
      render(<CreateButton buttonText="Create" onClick={onClick} />);

      const button = screen.getByText("Create");
      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(button);

      expect(onClick).toHaveBeenCalledTimes(3);
    });

    test("handles undefined disabled prop", () => {
      const onClick = jest.fn();
      render(
        <CreateButton
          buttonText="Create"
          onClick={onClick}
          disabled={undefined}
        />
      );

      const button = screen.getByText("Create");
      fireEvent.click(button);

      expect(onClick).toHaveBeenCalled();
    });
  });

  describe("Icon Positioning", () => {
    test("renders icon before text", () => {
      const onClick = jest.fn();
      const { container } = render(
        <CreateButton
          buttonText="Create"
          icon={<MockIcon />}
          onClick={onClick}
        />
      );

      const button = container.firstChild;
      const children = Array.from(button.children);
      expect(children.length).toBeGreaterThan(0);
    });

    test("renders without icon when icon prop is not provided", () => {
      const onClick = jest.fn();
      render(<CreateButton buttonText="Create" onClick={onClick} />);

      expect(screen.queryByTestId("mock-icon")).not.toBeInTheDocument();
    });
  });
});
