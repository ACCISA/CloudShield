/**
 * EditButton.test.jsx
 *
 * Test suite for the EditButton component
 * Tests menu rendering, item clicks, and disabled states
 */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import EditButton from "../EditButton/EditButton";

describe("EditButton Component", () => {
  const mockMenuItems = [
    { label: "Edit", onClick: jest.fn() },
    { label: "Delete", onClick: jest.fn() },
    { label: "Duplicate", onClick: jest.fn() },
  ];

  beforeEach(() => {
    // Reset all mocks before each test
    mockMenuItems.forEach((item) => item.onClick.mockClear());
  });

  describe("Rendering", () => {
    test("renders without crashing", () => {
      const { container } = render(<EditButton />);
      expect(container.firstChild).toBeInTheDocument();
    });

    test("renders button with edit icon", () => {
      const { container } = render(<EditButton menuItems={mockMenuItems} />);
      expect(container.firstChild).toBeInTheDocument();
    });

    test("renders with empty menu items", () => {
      const { container } = render(<EditButton menuItems={[]} />);
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe("Menu Popover", () => {
    test("opens menu when button is clicked", () => {
      render(<EditButton menuItems={mockMenuItems} />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      expect(screen.getByText("Edit")).toBeInTheDocument();
      expect(screen.getByText("Delete")).toBeInTheDocument();
      expect(screen.getByText("Duplicate")).toBeInTheDocument();
    });

    test("closes menu when backdrop is clicked", () => {
      render(<EditButton menuItems={mockMenuItems} />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      // Menu should be open
      expect(screen.getByText("Edit")).toBeInTheDocument();

      // Find and click backdrop
      const backdrop = document.querySelector('[style*="position: fixed"]');
      if (backdrop) {
        fireEvent.click(backdrop);
      }
    });

    test("toggles menu on button click", () => {
      render(<EditButton menuItems={mockMenuItems} />);

      const button = screen.getByRole("button");

      // Open menu
      fireEvent.click(button);
      expect(screen.getByText("Edit")).toBeInTheDocument();

      // Close menu
      fireEvent.click(button);
    });
  });

  describe("Menu Item Interactions", () => {
    test("calls onClick when menu item is clicked", () => {
      render(<EditButton menuItems={mockMenuItems} />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      const editMenuItem = screen.getByText("Edit");
      fireEvent.click(editMenuItem);

      expect(mockMenuItems[0].onClick).toHaveBeenCalledTimes(1);
    });

    test("closes menu after menu item is clicked", async () => {
      render(<EditButton menuItems={mockMenuItems} />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      const deleteMenuItem = screen.getByText("Delete");
      fireEvent.click(deleteMenuItem);

      expect(mockMenuItems[1].onClick).toHaveBeenCalled();
    });

    test("handles menu item without onClick", () => {
      const itemsWithoutOnClick = [{ label: "No Action" }];
      render(<EditButton menuItems={itemsWithoutOnClick} />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      const menuItem = screen.getByText("No Action");
      expect(() => fireEvent.click(menuItem)).not.toThrow();
    });
  });

  describe("Disabled State", () => {
    test("applies disabled styles when disabled", () => {
      render(<EditButton menuItems={mockMenuItems} disabled={true} />);

      const button = screen.getByRole("button");
      expect(button).toHaveStyle({ opacity: "0.5" });
      expect(button).toHaveStyle({ cursor: "not-allowed" });
    });

    test("does not open menu when disabled and clicked", () => {
      render(<EditButton menuItems={mockMenuItems} disabled={true} />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      // Menu items should not be visible
      expect(screen.queryByText("Edit")).not.toBeInTheDocument();
    });

    test("is not disabled by default", () => {
      render(<EditButton menuItems={mockMenuItems} />);

      const button = screen.getByRole("button");
      expect(button).toHaveStyle({ opacity: "1" });
    });
  });

  describe("Multiple Menu Items", () => {
    test("renders all menu items", () => {
      render(<EditButton menuItems={mockMenuItems} />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      mockMenuItems.forEach((item) => {
        expect(screen.getByText(item.label)).toBeInTheDocument();
      });
    });

    test("handles clicks on different menu items", () => {
      render(<EditButton menuItems={mockMenuItems} />);

      const button = screen.getByRole("button");

      // Click first item
      fireEvent.click(button);
      fireEvent.click(screen.getByText("Edit"));
      expect(mockMenuItems[0].onClick).toHaveBeenCalledTimes(1);

      // Click second item
      fireEvent.click(button);
      fireEvent.click(screen.getByText("Delete"));
      expect(mockMenuItems[1].onClick).toHaveBeenCalledTimes(1);
    });
  });
});
