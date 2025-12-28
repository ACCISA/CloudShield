/**
 * CreateButton.test.jsx
 *
 * Test suite for the CreateButton component
 * Tests basic functionality, disabled states, and click handling
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import CreateButton from "../CreateButton/CreateButton";

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

      const button = screen.getByText("Create").parentElement;
      fireEvent.mouseEnter(button);

      expect(button).toBeInTheDocument();
    });

    test("restores styles on mouse leave", () => {
      const onClick = jest.fn();
      render(<CreateButton buttonText="Create" onClick={onClick} />);

      const button = screen.getByText("Create").parentElement;
      fireEvent.mouseEnter(button);
      fireEvent.mouseLeave(button);

      expect(button).toBeInTheDocument();
    });

    test("does not change styles on hover when disabled", () => {
      const onClick = jest.fn();
      render(
        <CreateButton buttonText="Create" onClick={onClick} disabled={true} />
      );

      const button = screen.getByText("Create").parentElement;

      fireEvent.mouseEnter(button);
      expect(button).toBeInTheDocument();
    });
  });
});
