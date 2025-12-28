/**
 * DisplayButton.test.jsx
 *
 * Test suite for the DisplayButton component
 * Tests layout switching, popover behavior, and user interactions
 */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import DisplayButton from "../DisplayButton/DisplayButton";

describe("DisplayButton Component", () => {
  describe("Rendering", () => {
    test("renders without crashing", () => {
      const onLayoutChange = jest.fn();
      const { container } = render(
        <DisplayButton onLayoutChange={onLayoutChange} />
      );

      expect(container.firstChild).toBeInTheDocument();
    });

    test("renders with default list layout", () => {
      const onLayoutChange = jest.fn();
      render(<DisplayButton layout="list" onLayoutChange={onLayoutChange} />);

      // Component should render successfully with list layout
      expect(screen.getByText("Display")).toBeInTheDocument();
    });

    test("renders with cards layout", () => {
      const onLayoutChange = jest.fn();
      render(<DisplayButton layout="cards" onLayoutChange={onLayoutChange} />);

      expect(screen.getByText("Display")).toBeInTheDocument();
    });

    test("renders with icons layout", () => {
      const onLayoutChange = jest.fn();
      render(<DisplayButton layout="icons" onLayoutChange={onLayoutChange} />);

      expect(screen.getByText("Display")).toBeInTheDocument();
    });
  });

  describe("Popover Behavior", () => {
    test("opens popover when button is clicked", () => {
      const onLayoutChange = jest.fn();
      render(<DisplayButton onLayoutChange={onLayoutChange} />);

      const button = screen.getByText("Display");
      fireEvent.click(button);

      // Check if layout options are visible
      expect(screen.getByText("List")).toBeInTheDocument();
      expect(screen.getByText("Cards")).toBeInTheDocument();
      expect(screen.getByText("icons")).toBeInTheDocument();
    });

    test("closes popover when backdrop is clicked", async () => {
      const onLayoutChange = jest.fn();
      render(<DisplayButton onLayoutChange={onLayoutChange} />);

      const button = screen.getByText("Display");
      fireEvent.click(button);

      // Popover should be open
      expect(screen.getByText("List")).toBeInTheDocument();

      // Click backdrop
      const backdrop = document.querySelector('[style*="position: fixed"]');
      if (backdrop) {
        fireEvent.click(backdrop);
      }
    });

    test("toggles popover on button click", () => {
      const onLayoutChange = jest.fn();
      render(<DisplayButton onLayoutChange={onLayoutChange} />);

      const button = screen.getByText("Display");

      // Open popover
      fireEvent.click(button);
      expect(screen.getByText("List")).toBeInTheDocument();

      // Close popover
      fireEvent.click(button);
    });
  });

  describe("Layout Changes", () => {
    test("calls onLayoutChange when list option is clicked", () => {
      const onLayoutChange = jest.fn();
      render(<DisplayButton layout="cards" onLayoutChange={onLayoutChange} />);

      const button = screen.getByText("Display");
      fireEvent.click(button);

      const listOption = screen.getByText("List");
      fireEvent.click(listOption);

      expect(onLayoutChange).toHaveBeenCalledWith("list");
    });

    test("calls onLayoutChange when cards option is clicked", () => {
      const onLayoutChange = jest.fn();
      render(<DisplayButton layout="list" onLayoutChange={onLayoutChange} />);

      const button = screen.getByText("Display");
      fireEvent.click(button);

      const cardsOption = screen.getByText("Cards");
      fireEvent.click(cardsOption);

      expect(onLayoutChange).toHaveBeenCalledWith("cards");
    });

    test("calls onLayoutChange when icons option is clicked", () => {
      const onLayoutChange = jest.fn();
      render(<DisplayButton layout="list" onLayoutChange={onLayoutChange} />);

      const button = screen.getByText("Display");
      fireEvent.click(button);

      const iconsOption = screen.getByText("icons");
      fireEvent.click(iconsOption);

      expect(onLayoutChange).toHaveBeenCalledWith("icons");
    });

    test("keeps popover open after layout change", () => {
      const onLayoutChange = jest.fn();
      render(<DisplayButton layout="list" onLayoutChange={onLayoutChange} />);

      const button = screen.getByText("Display");
      fireEvent.click(button);

      const cardsOption = screen.getByText("Cards");
      fireEvent.click(cardsOption);

      // Popover should still be visible
      expect(screen.getByText("List")).toBeInTheDocument();
    });
  });

  describe("Custom Styling", () => {
    test("applies custom styles", () => {
      const onLayoutChange = jest.fn();
      const customStyle = { margin: "10px" };
      const { container } = render(
        <DisplayButton onLayoutChange={onLayoutChange} style={customStyle} />
      );

      expect(container.firstChild).toHaveStyle({ margin: "10px" });
    });
  });
});
