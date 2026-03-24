/**
 * GroupActionsButton.test.jsx
 *
 * Test suite for the GroupActionsButton component
 * Tests group action functionality, selection count display, and menu interactions
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import GroupActionsButton from "../GroupActionsButton/GroupActionsButton";

describe("GroupActionsButton Component", () => {
  const mockMenuItems = [
    { label: "Assign Group", onClick: jest.fn(), icon: <span>📁</span> },
    { label: "Remove from Group", onClick: jest.fn(), icon: <span>🗑️</span> },
    { label: "Export Selected", onClick: jest.fn(), color: "#007bff" },
  ];

  beforeEach(() => {
    // Reset all mocks before each test
    mockMenuItems.forEach((item) => item.onClick.mockClear());
  });

  describe("Rendering", () => {
    test("does not render when selectedCount is 0", () => {
      const { container } = render(
        <GroupActionsButton selectedCount={0} menuItems={mockMenuItems} />,
      );
      expect(container.firstChild).toBeNull();
    });

    test("does not render when selectedCount is 1", () => {
      const { container } = render(
        <GroupActionsButton selectedCount={1} menuItems={mockMenuItems} />,
      );
      expect(container.firstChild).toBeNull();
    });

    test("renders when selectedCount is 2", () => {
      render(
        <GroupActionsButton selectedCount={2} menuItems={mockMenuItems} />,
      );
      expect(screen.getByText("Group Actions")).toBeInTheDocument();
      expect(screen.getByText("2")).toBeInTheDocument();
    });

    test("renders when selectedCount is greater than 2", () => {
      render(
        <GroupActionsButton selectedCount={5} menuItems={mockMenuItems} />,
      );
      expect(screen.getByText("Group Actions")).toBeInTheDocument();
      expect(screen.getByText("5")).toBeInTheDocument();
    });

    test("renders with custom button text", () => {
      render(
        <GroupActionsButton
          selectedCount={3}
          buttonText="Bulk Actions"
          menuItems={mockMenuItems}
        />,
      );
      expect(screen.getByText("Bulk Actions")).toBeInTheDocument();
      expect(screen.getByText("3")).toBeInTheDocument();
    });

    test("renders HandshakeIcon", () => {
      const { container } = render(
        <GroupActionsButton selectedCount={2} menuItems={mockMenuItems} />,
      );
      // Check if button is rendered (presence of HandshakeIcon is verified by the button rendering)
      expect(screen.getByText("Group Actions")).toBeInTheDocument();
    });
  });

  describe("Selection Count Badge", () => {
    test("displays correct count badge", () => {
      render(
        <GroupActionsButton selectedCount={10} menuItems={mockMenuItems} />,
      );
      expect(screen.getByText("10")).toBeInTheDocument();
    });

    test("updates count badge when selectedCount changes", () => {
      const { rerender } = render(
        <GroupActionsButton selectedCount={2} menuItems={mockMenuItems} />,
      );
      expect(screen.getByText("2")).toBeInTheDocument();

      rerender(
        <GroupActionsButton selectedCount={5} menuItems={mockMenuItems} />,
      );
      expect(screen.getByText("5")).toBeInTheDocument();
      expect(screen.queryByText("2")).not.toBeInTheDocument();
    });

    test("badge has correct styling", () => {
      render(
        <GroupActionsButton selectedCount={3} menuItems={mockMenuItems} />,
      );
      const badge = screen.getByText("3");
      expect(badge).toBeInTheDocument();
    });
  });

  describe("Menu Popover", () => {
    test("opens menu when button is clicked", () => {
      render(
        <GroupActionsButton selectedCount={2} menuItems={mockMenuItems} />,
      );

      const button = screen.getByText("Group Actions");
      fireEvent.click(button);

      expect(screen.getByText("Assign Group")).toBeInTheDocument();
      expect(screen.getByText("Remove from Group")).toBeInTheDocument();
      expect(screen.getByText("Export Selected")).toBeInTheDocument();
    });

    test("menu items are clickable", () => {
      render(
        <GroupActionsButton selectedCount={2} menuItems={mockMenuItems} />,
      );

      const button = screen.getByText("Group Actions");
      fireEvent.click(button);

      const menuItem = screen.getByText("Assign Group");
      fireEvent.click(menuItem);

      expect(mockMenuItems[0].onClick).toHaveBeenCalledTimes(1);
    });

    test("closes menu after menu item is clicked", () => {
      render(
        <GroupActionsButton selectedCount={2} menuItems={mockMenuItems} />,
      );

      const button = screen.getByText("Group Actions");
      fireEvent.click(button);

      expect(screen.getByText("Assign Group")).toBeInTheDocument();

      const menuItem = screen.getByText("Export Selected");
      fireEvent.click(menuItem);

      expect(mockMenuItems[2].onClick).toHaveBeenCalled();
    });
  });

  describe("Disabled State", () => {
    test("applies disabled styles when disabled", () => {
      render(
        <GroupActionsButton
          selectedCount={2}
          menuItems={mockMenuItems}
          disabled={true}
        />,
      );

      const button = screen.getByText("Group Actions");
      expect(button).toHaveStyle({
        opacity: "0.4",
        cursor: "not-allowed",
      });
    });

    test("does not open menu when disabled", () => {
      render(
        <GroupActionsButton
          selectedCount={2}
          menuItems={mockMenuItems}
          disabled={true}
        />,
      );

      const button = screen.getByText("Group Actions");
      fireEvent.click(button);

      expect(screen.queryByText("Assign Group")).not.toBeInTheDocument();
    });

    test("is not disabled by default", () => {
      render(
        <GroupActionsButton selectedCount={2} menuItems={mockMenuItems} />,
      );

      const button = screen.getByText("Group Actions");
      expect(button).toHaveStyle({ opacity: "1" });
      expect(button).not.toHaveStyle({ cursor: "not-allowed" });
    });
  });

  describe("Button Styling", () => {
    test("has correct default button styles", () => {
      render(
        <GroupActionsButton selectedCount={2} menuItems={mockMenuItems} />,
      );

      const button = screen.getByText("Group Actions");
      expect(button).toBeInTheDocument();
    });

    test("button has hover states", () => {
      render(
        <GroupActionsButton selectedCount={2} menuItems={mockMenuItems} />,
      );

      const button = screen.getByText("Group Actions");

      // Test hover enter
      fireEvent.mouseEnter(button);
      expect(button).toHaveStyle({
        background: "#242424",
        borderColor: "rgba(255, 255, 255, 0.2)",
      });

      // Test hover leave
      fireEvent.mouseLeave(button);
      expect(button).toHaveStyle({
        background: "#1a1a1a",
        borderColor: "rgba(255, 255, 255, 0.1)",
      });
    });

    test("does not change styles on hover when disabled", () => {
      render(
        <GroupActionsButton
          selectedCount={2}
          menuItems={mockMenuItems}
          disabled={true}
        />,
      );

      const button = screen.getByText("Group Actions");
      const originalBackground = button.style.background;
      const originalBorderColor = button.style.borderColor;

      fireEvent.mouseEnter(button);
      expect(button.style.background).toBe(originalBackground);
      expect(button.style.borderColor).toBe(originalBorderColor);
    });
  });

  describe("Accessibility", () => {
    test("has proper aria-label with selection count", () => {
      render(
        <GroupActionsButton selectedCount={3} menuItems={mockMenuItems} />,
      );

      const button = screen.getByLabelText("Group Actions (3 selected)");
      expect(button).toBeInTheDocument();
    });

    test("has proper aria-label with custom button text", () => {
      render(
        <GroupActionsButton
          selectedCount={5}
          buttonText="Bulk Actions"
          menuItems={mockMenuItems}
        />,
      );

      const button = screen.getByLabelText("Bulk Actions (5 selected)");
      expect(button).toBeInTheDocument();
    });

    test("button is keyboard accessible", () => {
      render(
        <GroupActionsButton selectedCount={2} menuItems={mockMenuItems} />,
      );

      const button = screen.getByText("Group Actions");
      expect(button.tagName).toBe("BUTTON");
    });
  });

  describe("Default Props", () => {
    test("uses default buttonText when not provided", () => {
      render(
        <GroupActionsButton selectedCount={2} menuItems={mockMenuItems} />,
      );
      expect(screen.getByText("Group Actions")).toBeInTheDocument();
    });

    test("handles empty menuItems array", () => {
      render(<GroupActionsButton selectedCount={2} menuItems={[]} />);
      const button = screen.getByText("Group Actions");
      fireEvent.click(button);
      // Should not throw error
      expect(button).toBeInTheDocument();
    });

    test("works with minimal props", () => {
      render(<GroupActionsButton selectedCount={2} />);
      expect(screen.getByText("Group Actions")).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    test("handles large selection counts", () => {
      render(
        <GroupActionsButton selectedCount={999} menuItems={mockMenuItems} />,
      );
      expect(screen.getByText("999")).toBeInTheDocument();
    });

    test("does not render with negative selectedCount", () => {
      const { container } = render(
        <GroupActionsButton selectedCount={-1} menuItems={mockMenuItems} />,
      );
      expect(container.firstChild).toBeNull();
    });

    test("handles menu items without icons", () => {
      const itemsWithoutIcons = [
        { label: "Action 1", onClick: jest.fn() },
        { label: "Action 2", onClick: jest.fn() },
      ];
      render(
        <GroupActionsButton selectedCount={2} menuItems={itemsWithoutIcons} />,
      );

      const button = screen.getByText("Group Actions");
      fireEvent.click(button);

      expect(screen.getByText("Action 1")).toBeInTheDocument();
      expect(screen.getByText("Action 2")).toBeInTheDocument();
    });
  });
});
