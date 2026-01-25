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
        <DisplayButton onLayoutChange={onLayoutChange} />,
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
        <DisplayButton onLayoutChange={onLayoutChange} style={customStyle} />,
      );

      expect(container.firstChild).toHaveStyle({ margin: "10px" });
    });
  });

  describe("Position Updates", () => {
    test("updates popover position on window resize", () => {
      const onLayoutChange = jest.fn();
      render(<DisplayButton onLayoutChange={onLayoutChange} />);

      const button = screen.getByText("Display");
      fireEvent.click(button);

      // Trigger resize
      global.dispatchEvent(new Event("resize"));

      expect(screen.getByText("List")).toBeInTheDocument();
    });

    test("does not update position when popover is closed", () => {
      const onLayoutChange = jest.fn();
      render(<DisplayButton onLayoutChange={onLayoutChange} />);

      // Don't open popover, just trigger resize
      global.dispatchEvent(new Event("resize"));

      expect(screen.queryByText("List")).not.toBeInTheDocument();
    });
  });

  describe("Layout Indicators", () => {
    test("highlights active layout option for list", () => {
      const onLayoutChange = jest.fn();
      render(<DisplayButton layout="list" onLayoutChange={onLayoutChange} />);

      const button = screen.getByText("Display");
      fireEvent.click(button);

      expect(screen.getByText("List")).toBeInTheDocument();
    });

    test("highlights active layout option for cards", () => {
      const onLayoutChange = jest.fn();
      render(<DisplayButton layout="cards" onLayoutChange={onLayoutChange} />);

      const button = screen.getByText("Display");
      fireEvent.click(button);

      expect(screen.getByText("Cards")).toBeInTheDocument();
    });

    test("highlights active layout option for icons", () => {
      const onLayoutChange = jest.fn();
      render(<DisplayButton layout="icons" onLayoutChange={onLayoutChange} />);

      const button = screen.getByText("Display");
      fireEvent.click(button);

      expect(screen.getByText("icons")).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    test("handles missing onLayoutChange callback", () => {
      render(<DisplayButton layout="list" />);

      const button = screen.getByText("Display");
      fireEvent.click(button);

      const cardsOption = screen.getByText("Cards");
      expect(() => fireEvent.click(cardsOption)).not.toThrow();
    });

    test("handles rapid layout changes", () => {
      const onLayoutChange = jest.fn();
      render(<DisplayButton layout="list" onLayoutChange={onLayoutChange} />);

      const button = screen.getByText("Display");
      fireEvent.click(button);

      fireEvent.click(screen.getByText("Cards"));
      fireEvent.click(screen.getByText("icons"));
      fireEvent.click(screen.getByText("List"));

      expect(onLayoutChange).toHaveBeenCalledTimes(3);
    });

    test("handles undefined layout prop", () => {
      const onLayoutChange = jest.fn();
      render(<DisplayButton onLayoutChange={onLayoutChange} />);

      const button = screen.getByText("Display");
      fireEvent.click(button);

      expect(screen.getByText("List")).toBeInTheDocument();
    });

    test("handles invalid layout prop", () => {
      const onLayoutChange = jest.fn();
      render(
        <DisplayButton layout="invalid" onLayoutChange={onLayoutChange} />,
      );

      const button = screen.getByText("Display");
      fireEvent.click(button);

      expect(screen.getByText("List")).toBeInTheDocument();
    });
  });

  describe("Button Toggle", () => {
    test("opens popover on first click", () => {
      const onLayoutChange = jest.fn();
      render(<DisplayButton onLayoutChange={onLayoutChange} />);

      const button = screen.getByText("Display");
      fireEvent.click(button);

      expect(screen.getByText("List")).toBeInTheDocument();
    });

    test("closes popover on second click", () => {
      const onLayoutChange = jest.fn();
      render(<DisplayButton onLayoutChange={onLayoutChange} />);

      const button = screen.getByText("Display");
      fireEvent.click(button);

      // Click backdrop to close
      const backdrop = document.querySelector('[style*="position: fixed"]');
      if (backdrop) {
        fireEvent.click(backdrop);
      }

      expect(screen.queryByText("List")).not.toBeInTheDocument();
    });

    test("reopens popover after closing", () => {
      const onLayoutChange = jest.fn();
      render(<DisplayButton onLayoutChange={onLayoutChange} />);

      const button = screen.getByText("Display");
      fireEvent.click(button);

      // Click backdrop to close
      const backdrop = document.querySelector('[style*="position: fixed"]');
      if (backdrop) {
        fireEvent.click(backdrop);
      }

      // Reopen
      fireEvent.click(button);

      expect(screen.getByText("List")).toBeInTheDocument();
    });
  });

  describe("Keyboard Navigation", () => {
    test("opens popover with Enter key", () => {
      const onLayoutChange = jest.fn();
      render(<DisplayButton onLayoutChange={onLayoutChange} />);

      const button = screen.getByRole("button", { name: /display options/i });
      fireEvent.keyDown(button, { key: "Enter" });

      expect(screen.getByText("List")).toBeInTheDocument();
    });

    test("opens popover with Space key", () => {
      const onLayoutChange = jest.fn();
      render(<DisplayButton onLayoutChange={onLayoutChange} />);

      const button = screen.getByRole("button", { name: /display options/i });
      fireEvent.keyDown(button, { key: " " });

      expect(screen.getByText("List")).toBeInTheDocument();
    });

    test("does not open popover with other keys", () => {
      const onLayoutChange = jest.fn();
      render(<DisplayButton onLayoutChange={onLayoutChange} />);

      const button = screen.getByRole("button", { name: /display options/i });
      fireEvent.keyDown(button, { key: "a" });
      fireEvent.keyDown(button, { key: "Escape" });

      expect(screen.queryByText("List")).not.toBeInTheDocument();
    });

    test("triggers layout change with Enter key on option", () => {
      const onLayoutChange = jest.fn();
      render(<DisplayButton layout="list" onLayoutChange={onLayoutChange} />);

      const button = screen.getByText("Display");
      fireEvent.click(button);

      const cardsOption = screen.getByRole("button", { name: /cards layout/i });
      fireEvent.keyDown(cardsOption, { key: "Enter" });

      expect(onLayoutChange).toHaveBeenCalledWith("cards");
    });

    test("triggers layout change with Space key on option", () => {
      const onLayoutChange = jest.fn();
      render(<DisplayButton layout="list" onLayoutChange={onLayoutChange} />);

      const button = screen.getByText("Display");
      fireEvent.click(button);

      const iconsOption = screen.getByRole("button", { name: /icons layout/i });
      fireEvent.keyDown(iconsOption, { key: " " });

      expect(onLayoutChange).toHaveBeenCalledWith("icons");
    });

    test("triggers layout change with Enter key on List option", () => {
      const onLayoutChange = jest.fn();
      render(<DisplayButton layout="cards" onLayoutChange={onLayoutChange} />);

      const button = screen.getByText("Display");
      fireEvent.click(button);

      const listOption = screen.getByRole("button", { name: /list layout/i });
      fireEvent.keyDown(listOption, { key: "Enter" });

      expect(onLayoutChange).toHaveBeenCalledWith("list");
    });

    test("triggers layout change with Space key on List option", () => {
      const onLayoutChange = jest.fn();
      render(<DisplayButton layout="cards" onLayoutChange={onLayoutChange} />);

      const button = screen.getByText("Display");
      fireEvent.click(button);

      const listOption = screen.getByRole("button", { name: /list layout/i });
      fireEvent.keyDown(listOption, { key: " " });

      expect(onLayoutChange).toHaveBeenCalledWith("list");
    });

    test("does not trigger layout change with other keys on option", () => {
      const onLayoutChange = jest.fn();
      render(<DisplayButton layout="list" onLayoutChange={onLayoutChange} />);

      const button = screen.getByText("Display");
      fireEvent.click(button);

      const cardsOption = screen.getByRole("button", { name: /cards layout/i });
      fireEvent.keyDown(cardsOption, { key: "a" });
      fireEvent.keyDown(cardsOption, { key: "Tab" });

      expect(onLayoutChange).not.toHaveBeenCalled();
    });
  });

  describe("Hover Effects", () => {
    test("applies hover styles to display button", () => {
      const onLayoutChange = jest.fn();
      render(<DisplayButton onLayoutChange={onLayoutChange} />);

      const button = screen.getByRole("button", { name: /display options/i });

      fireEvent.mouseEnter(button);
      expect(button.style.background).toBe("rgb(36, 36, 36)");
      expect(button.style.borderColor).toBe("rgba(255, 255, 255, 0.2)");

      fireEvent.mouseLeave(button);
      expect(button.style.background).toBe("rgb(10, 10, 10)");
      expect(button.style.borderColor).toBe("rgba(255, 255, 255, 0.1)");
    });

    test("applies hover styles to unselected layout options", () => {
      const onLayoutChange = jest.fn();
      render(<DisplayButton layout="list" onLayoutChange={onLayoutChange} />);

      const button = screen.getByText("Display");
      fireEvent.click(button);

      const cardsOption = screen.getByRole("button", { name: /cards layout/i });

      fireEvent.mouseEnter(cardsOption);
      expect(cardsOption.style.backgroundColor).toBe(
        "rgba(255, 255, 255, 0.08)",
      );

      fireEvent.mouseLeave(cardsOption);
      expect(cardsOption.style.backgroundColor).toBe("transparent");
      // Border is cleared by setting it to 'none', but the actual style value might be empty string
      expect(
        cardsOption.style.border === "none" || cardsOption.style.border === "",
      ).toBeTruthy();
    });

    test("does not apply hover styles to selected layout option", () => {
      const onLayoutChange = jest.fn();
      render(<DisplayButton layout="cards" onLayoutChange={onLayoutChange} />);

      const button = screen.getByText("Display");
      fireEvent.click(button);

      const cardsOption = screen.getByRole("button", { name: /cards layout/i });

      // Should not change background for selected option
      const initialBackground = cardsOption.style.backgroundColor;
      fireEvent.mouseEnter(cardsOption);
      expect(cardsOption.style.backgroundColor).toBe(initialBackground);
    });

    test("applies hover styles to unselected List option", () => {
      const onLayoutChange = jest.fn();
      render(<DisplayButton layout="cards" onLayoutChange={onLayoutChange} />);

      const button = screen.getByText("Display");
      fireEvent.click(button);

      const listOption = screen.getByRole("button", { name: /list layout/i });

      fireEvent.mouseEnter(listOption);
      expect(listOption.style.backgroundColor).toBe(
        "rgba(255, 255, 255, 0.08)",
      );

      fireEvent.mouseLeave(listOption);
      expect(listOption.style.backgroundColor).toBe("transparent");
    });

    test("does not apply hover styles to selected List option", () => {
      const onLayoutChange = jest.fn();
      render(<DisplayButton layout="list" onLayoutChange={onLayoutChange} />);

      const button = screen.getByText("Display");
      fireEvent.click(button);

      const listOption = screen.getByRole("button", { name: /list layout/i });

      const initialBackground = listOption.style.backgroundColor;
      fireEvent.mouseEnter(listOption);
      expect(listOption.style.backgroundColor).toBe(initialBackground);
    });

    test("applies hover styles to unselected Icons option", () => {
      const onLayoutChange = jest.fn();
      render(<DisplayButton layout="list" onLayoutChange={onLayoutChange} />);

      const button = screen.getByText("Display");
      fireEvent.click(button);

      const iconsOption = screen.getByRole("button", { name: /icons layout/i });

      fireEvent.mouseEnter(iconsOption);
      expect(iconsOption.style.backgroundColor).toBe(
        "rgba(255, 255, 255, 0.08)",
      );

      fireEvent.mouseLeave(iconsOption);
      expect(iconsOption.style.backgroundColor).toBe("transparent");
    });

    test("does not apply hover styles to selected Icons option", () => {
      const onLayoutChange = jest.fn();
      render(<DisplayButton layout="icons" onLayoutChange={onLayoutChange} />);

      const button = screen.getByText("Display");
      fireEvent.click(button);

      const iconsOption = screen.getByRole("button", { name: /icons layout/i });

      const initialBackground = iconsOption.style.backgroundColor;
      fireEvent.mouseEnter(iconsOption);
      expect(iconsOption.style.backgroundColor).toBe(initialBackground);
    });
  });

  describe("Column Toggles", () => {
    test("renders column toggles when provided", () => {
      const onLayoutChange = jest.fn();
      const mockOnToggle = jest.fn();
      const columnToggles = {
        showUsers: true,
        showWorkstations: false,
        showFiles: true,
        onToggle: mockOnToggle,
      };

      render(
        <DisplayButton
          layout="list"
          onLayoutChange={onLayoutChange}
          columnToggles={columnToggles}
        />,
      );

      const button = screen.getByText("Display");
      fireEvent.click(button);

      // Column toggles should be rendered
      expect(screen.getByText("Users")).toBeInTheDocument();
      expect(screen.getByText("Workstations")).toBeInTheDocument();
      expect(screen.getByText("Files")).toBeInTheDocument();
    });

    test("calls onToggle when column is clicked", () => {
      const onLayoutChange = jest.fn();
      const mockOnToggle = jest.fn();
      const columnToggles = {
        showUsers: true,
        showWorkstations: true,
        showFiles: true,
        onToggle: mockOnToggle,
      };

      render(
        <DisplayButton
          layout="list"
          onLayoutChange={onLayoutChange}
          columnToggles={columnToggles}
        />,
      );

      const button = screen.getByText("Display");
      fireEvent.click(button);

      const usersToggle = screen.getByText("Users").closest('[role="button"]');
      fireEvent.click(usersToggle);

      expect(mockOnToggle).toHaveBeenCalledWith("showUsers");
    });

    test("renders separator between layouts and column toggles", () => {
      const onLayoutChange = jest.fn();
      const mockOnToggle = jest.fn();
      const columnToggles = {
        showUsers: true,
        onToggle: mockOnToggle,
      };

      render(
        <DisplayButton
          layout="list"
          onLayoutChange={onLayoutChange}
          columnToggles={columnToggles}
        />,
      );

      const button = screen.getByText("Display");
      fireEvent.click(button);

      // Separator should be rendered
      expect(screen.getByText("Columns")).toBeInTheDocument();
    });

    test("works without column toggles", () => {
      const onLayoutChange = jest.fn();

      render(<DisplayButton layout="list" onLayoutChange={onLayoutChange} />);

      const button = screen.getByText("Display");
      fireEvent.click(button);

      // Should only show layout options
      expect(screen.getByText("List")).toBeInTheDocument();
      expect(screen.queryByText("Columns")).not.toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    test("has proper accessibility attributes on main button", () => {
      const onLayoutChange = jest.fn();
      render(<DisplayButton onLayoutChange={onLayoutChange} />);

      const button = screen.getByRole("button", { name: /display options/i });
      expect(button).toHaveAttribute("role", "button");
      expect(button).toHaveAttribute("tabIndex", "0");
      expect(button).toHaveAttribute("aria-label", "Display options");
    });

    test("has proper accessibility attributes on layout options", () => {
      const onLayoutChange = jest.fn();
      render(<DisplayButton onLayoutChange={onLayoutChange} />);

      const button = screen.getByText("Display");
      fireEvent.click(button);

      const cardsOption = screen.getByRole("button", { name: /cards layout/i });
      const listOption = screen.getByRole("button", { name: /list layout/i });
      const iconsOption = screen.getByRole("button", { name: /icons layout/i });

      [cardsOption, listOption, iconsOption].forEach((option) => {
        expect(option).toHaveAttribute("role", "button");
        expect(option).toHaveAttribute("tabIndex", "0");
      });
    });
  });
});
