/**
 * PopoverMenuButton.test.jsx
 *
 * Test suite for the PopoverMenuButton component
 * Tests shared popover menu logic, positioning, and interactions
 */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import PopoverMenuButton from "../PopoverMenuButton/PopoverMenuButton";

describe("PopoverMenuButton Component", () => {
  const mockMenuItems = [
    { label: "Action 1", onClick: jest.fn(), icon: <span>Icon1</span> },
    { label: "Action 2", onClick: jest.fn(), icon: <span>Icon2</span> },
    { label: "Action 3", onClick: jest.fn(), color: "#ff0000" },
  ];

  beforeEach(() => {
    // Reset all mocks before each test
    mockMenuItems.forEach((item) => item.onClick.mockClear());
  });

  describe("Rendering", () => {
    test("renders children correctly", () => {
      render(
        <PopoverMenuButton menuItems={mockMenuItems}>
          <button>Test Button</button>
        </PopoverMenuButton>,
      );

      expect(screen.getByText("Test Button")).toBeInTheDocument();
    });

    test("renders with custom button content", () => {
      render(
        <PopoverMenuButton menuItems={mockMenuItems}>
          <div>Custom Content</div>
        </PopoverMenuButton>,
      );

      expect(screen.getByText("Custom Content")).toBeInTheDocument();
    });

    test("does not render menu initially", () => {
      render(
        <PopoverMenuButton menuItems={mockMenuItems}>
          <button>Test Button</button>
        </PopoverMenuButton>,
      );

      expect(screen.queryByText("Action 1")).not.toBeInTheDocument();
    });
  });

  describe("Menu Popover Opening/Closing", () => {
    test("opens menu when button is clicked", () => {
      render(
        <PopoverMenuButton menuItems={mockMenuItems}>
          <button>Test Button</button>
        </PopoverMenuButton>,
      );

      const button = screen.getByText("Test Button");
      fireEvent.click(button);

      expect(screen.getByText("Action 1")).toBeInTheDocument();
      expect(screen.getByText("Action 2")).toBeInTheDocument();
      expect(screen.getByText("Action 3")).toBeInTheDocument();
    });

    test("closes menu when backdrop is clicked", () => {
      render(
        <PopoverMenuButton menuItems={mockMenuItems}>
          <button>Test Button</button>
        </PopoverMenuButton>,
      );

      const button = screen.getByText("Test Button");
      fireEvent.click(button);

      // Menu should be open
      expect(screen.getByText("Action 1")).toBeInTheDocument();

      // Find and click backdrop
      const backdrop = screen.getByRole("button", { name: /close menu/i });
      fireEvent.click(backdrop);

      // Menu should be closed
      waitFor(() => {
        expect(screen.queryByText("Action 1")).not.toBeInTheDocument();
      });
    });

    test("closes menu when Escape key is pressed on backdrop", () => {
      render(
        <PopoverMenuButton menuItems={mockMenuItems}>
          <button>Test Button</button>
        </PopoverMenuButton>,
      );

      const button = screen.getByText("Test Button");
      fireEvent.click(button);

      // Menu should be open
      expect(screen.getByText("Action 1")).toBeInTheDocument();

      // Press Escape on backdrop
      const backdrop = screen.getByRole("button", { name: /close menu/i });
      fireEvent.keyDown(backdrop, { key: "Escape" });

      // Menu should be closed
      waitFor(() => {
        expect(screen.queryByText("Action 1")).not.toBeInTheDocument();
      });
    });

    test("toggles menu on multiple button clicks", () => {
      render(
        <PopoverMenuButton menuItems={mockMenuItems}>
          <button>Test Button</button>
        </PopoverMenuButton>,
      );

      const button = screen.getByText("Test Button");

      // Open menu
      fireEvent.click(button);
      expect(screen.getByText("Action 1")).toBeInTheDocument();

      // Close menu
      fireEvent.click(button);
      waitFor(() => {
        expect(screen.queryByText("Action 1")).not.toBeInTheDocument();
      });

      // Open again
      fireEvent.click(button);
      expect(screen.getByText("Action 1")).toBeInTheDocument();
    });
  });

  describe("Menu Item Interactions", () => {
    test("calls onClick when menu item is clicked", () => {
      render(
        <PopoverMenuButton menuItems={mockMenuItems}>
          <button>Test Button</button>
        </PopoverMenuButton>,
      );

      const button = screen.getByText("Test Button");
      fireEvent.click(button);

      const menuItem = screen.getByText("Action 1");
      fireEvent.click(menuItem);

      expect(mockMenuItems[0].onClick).toHaveBeenCalledTimes(1);
    });

    test("calls onClick for different menu items", () => {
      render(
        <PopoverMenuButton menuItems={mockMenuItems}>
          <button>Test Button</button>
        </PopoverMenuButton>,
      );

      const button = screen.getByText("Test Button");
      fireEvent.click(button);

      fireEvent.click(screen.getByText("Action 2"));
      expect(mockMenuItems[1].onClick).toHaveBeenCalledTimes(1);

      fireEvent.click(button);
      fireEvent.click(screen.getByText("Action 3"));
      expect(mockMenuItems[2].onClick).toHaveBeenCalledTimes(1);
    });

    test("closes menu after menu item is clicked", async () => {
      render(
        <PopoverMenuButton menuItems={mockMenuItems}>
          <button>Test Button</button>
        </PopoverMenuButton>,
      );

      const button = screen.getByText("Test Button");
      fireEvent.click(button);

      const menuItem = screen.getByText("Action 1");
      fireEvent.click(menuItem);

      expect(mockMenuItems[0].onClick).toHaveBeenCalled();

      await waitFor(() => {
        expect(screen.queryByText("Action 1")).not.toBeInTheDocument();
      });
    });

    test("handles Enter key on menu item", () => {
      render(
        <PopoverMenuButton menuItems={mockMenuItems}>
          <button>Test Button</button>
        </PopoverMenuButton>,
      );

      const button = screen.getByText("Test Button");
      fireEvent.click(button);

      const menuItem = screen.getByText("Action 2").closest('[role="button"]');
      fireEvent.keyDown(menuItem, { key: "Enter" });

      expect(mockMenuItems[1].onClick).toHaveBeenCalledTimes(1);
    });

    test("handles Space key on menu item", () => {
      render(
        <PopoverMenuButton menuItems={mockMenuItems}>
          <button>Test Button</button>
        </PopoverMenuButton>,
      );

      const button = screen.getByText("Test Button");
      fireEvent.click(button);

      const menuItem = screen.getByText("Action 3").closest('[role="button"]');
      fireEvent.keyDown(menuItem, { key: " " });

      expect(mockMenuItems[2].onClick).toHaveBeenCalledTimes(1);
    });

    test("handles menu item without onClick", () => {
      const itemsWithoutOnClick = [{ label: "No Action" }];
      render(
        <PopoverMenuButton menuItems={itemsWithoutOnClick}>
          <button>Test Button</button>
        </PopoverMenuButton>,
      );

      const button = screen.getByText("Test Button");
      fireEvent.click(button);

      const menuItem = screen.getByText("No Action");
      expect(() => fireEvent.click(menuItem)).not.toThrow();
    });
  });

  describe("Menu Item Rendering", () => {
    test("renders menu items with icons", () => {
      render(
        <PopoverMenuButton menuItems={mockMenuItems}>
          <button>Test Button</button>
        </PopoverMenuButton>,
      );

      const button = screen.getByText("Test Button");
      fireEvent.click(button);

      expect(screen.getByText("Icon1")).toBeInTheDocument();
      expect(screen.getByText("Icon2")).toBeInTheDocument();
    });

    test("renders menu items with custom colors", () => {
      render(
        <PopoverMenuButton menuItems={mockMenuItems}>
          <button>Test Button</button>
        </PopoverMenuButton>,
      );

      const button = screen.getByText("Test Button");
      fireEvent.click(button);

      const item3 = screen.getByText("Action 3");
      expect(item3).toHaveStyle({ color: "#ff0000" });
    });

    test("renders separators between menu items", () => {
      render(
        <PopoverMenuButton menuItems={mockMenuItems}>
          <button>Test Button</button>
        </PopoverMenuButton>,
      );

      const button = screen.getByText("Test Button");
      fireEvent.click(button);

      // Check for separator divs (there should be menuItems.length - 1)
      const popover = screen
        .getByText("Action 1")
        .closest('[style*="position: fixed"]');
      const separators = popover.querySelectorAll('[style*="height: 1px"]');
      expect(separators).toHaveLength(mockMenuItems.length - 1);
    });
  });

  describe("Disabled State", () => {
    test("does not open menu when disabled", () => {
      render(
        <PopoverMenuButton menuItems={mockMenuItems} disabled={true}>
          <button>Test Button</button>
        </PopoverMenuButton>,
      );

      const button = screen.getByText("Test Button");
      fireEvent.click(button);

      expect(screen.queryByText("Action 1")).not.toBeInTheDocument();
    });

    test("works normally when not disabled", () => {
      render(
        <PopoverMenuButton menuItems={mockMenuItems} disabled={false}>
          <button>Test Button</button>
        </PopoverMenuButton>,
      );

      const button = screen.getByText("Test Button");
      fireEvent.click(button);

      expect(screen.getByText("Action 1")).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    test("renders with empty menu items array", () => {
      render(
        <PopoverMenuButton menuItems={[]}>
          <button>Test Button</button>
        </PopoverMenuButton>,
      );

      const button = screen.getByText("Test Button");
      fireEvent.click(button);

      // Popover should still render but be empty
      expect(screen.queryByText("Action 1")).not.toBeInTheDocument();
    });

    test("handles rapid clicking", () => {
      render(
        <PopoverMenuButton menuItems={mockMenuItems}>
          <button>Test Button</button>
        </PopoverMenuButton>,
      );

      const button = screen.getByText("Test Button");

      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(button);

      // Should not throw errors
      expect(button).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    test("uses custom aria label when provided", () => {
      render(
        <PopoverMenuButton menuItems={mockMenuItems} ariaLabel="Custom menu">
          <button>Test Button</button>
        </PopoverMenuButton>,
      );

      const button = screen.getByText("Test Button");
      fireEvent.click(button);

      const backdrop = screen.getByRole("button", { name: "Custom menu" });
      expect(backdrop).toBeInTheDocument();
    });

    test("uses default aria label when not provided", () => {
      render(
        <PopoverMenuButton menuItems={mockMenuItems}>
          <button>Test Button</button>
        </PopoverMenuButton>,
      );

      const button = screen.getByText("Test Button");
      fireEvent.click(button);

      const backdrop = screen.getByRole("button", { name: /close menu/i });
      expect(backdrop).toBeInTheDocument();
    });

    test("menu items have proper aria labels", () => {
      render(
        <PopoverMenuButton menuItems={mockMenuItems}>
          <button>Test Button</button>
        </PopoverMenuButton>,
      );

      const button = screen.getByText("Test Button");
      fireEvent.click(button);

      const menuItem = screen.getByRole("button", { name: "Action 1" });
      expect(menuItem).toBeInTheDocument();
    });
  });
});
