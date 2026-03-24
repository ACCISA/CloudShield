/**
 * PopoverMenuButton.test.jsx
 *
 * Test suite for PopoverMenuButton component
 * Tests keyboard navigation, menu interactions, positioning, and accessibility
 */
import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PopoverMenuButton from "../PopoverMenuButton";

const renderButton = (props = {}) => {
  const defaultProps = {
    children: <button>Menu Button</button>,
    menuItems: [],
    ...props,
  };
  return render(<PopoverMenuButton {...defaultProps} />);
};

const getPopover = () =>
  Array.from(document.querySelectorAll("div")).find(
    (element) =>
      element.style.position === "fixed" && element.style.zIndex === "1000",
  );

const getSeparators = () =>
  Array.from(document.querySelectorAll("div")).filter(
    (element) => element.style.height === "1px",
  );

describe("PopoverMenuButton Component", () => {
  beforeEach(() => {
    // Mock getBoundingClientRect
    Element.prototype.getBoundingClientRect = jest.fn(() => ({
      top: 100,
      left: 50,
      right: 200,
      bottom: 150,
      width: 150,
      height: 50,
      x: 50,
      y: 100,
    }));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering & Initialization", () => {
    it("renders children correctly", () => {
      renderButton();
      expect(screen.getByText("Menu Button")).toBeInTheDocument();
    });

    it("renders with function children and passes isOpen and disabled", () => {
      const childrenFn = jest.fn(({ isOpen, disabled }) => (
        <button>{isOpen ? "Open" : "Closed"}</button>
      ));

      render(
        <PopoverMenuButton children={childrenFn}>
          {childrenFn}
        </PopoverMenuButton>
      );

      expect(childrenFn).toHaveBeenCalledWith({ isOpen: false, disabled: false });
    });

    it("initializes menu as closed", () => {
      renderButton({ menuItems: [{ label: "Item 1", onClick: jest.fn() }] });
      expect(screen.queryByText("Item 1")).not.toBeInTheDocument();
    });

    it("initializes with correct accessibility attributes", () => {
      renderButton();
      const buttonDiv = screen.getByText("Menu Button").parentElement;
      expect(buttonDiv).toHaveAttribute("role", "button");
      expect(buttonDiv).toHaveAttribute("aria-expanded", "false");
      expect(buttonDiv).toHaveAttribute("aria-haspopup", "true");
    });
  });

  describe("Button Click Handler", () => {
    it("opens menu when button is clicked", async () => {
      renderButton({
        menuItems: [{ label: "Item 1", onClick: jest.fn() }],
      });

      const button = screen.getByText("Menu Button");
      await userEvent.click(button);

      expect(screen.getByText("Item 1")).toBeInTheDocument();
    });

    it("closes menu when button is clicked again", async () => {
      renderButton({
        menuItems: [{ label: "Item 1", onClick: jest.fn() }],
      });

      const button = screen.getByText("Menu Button");
      await userEvent.click(button);
      expect(screen.getByText("Item 1")).toBeInTheDocument();

      await userEvent.click(button);
      expect(screen.queryByText("Item 1")).not.toBeInTheDocument();
    });

    it("stops propagation on button click", async () => {
      const onClickParent = jest.fn();

      render(
        <div onClick={onClickParent}>
          <PopoverMenuButton>
            <button>Menu Button</button>
          </PopoverMenuButton>
        </div>
      );

      const button = screen.getByText("Menu Button");
      fireEvent.click(button);

      expect(onClickParent).not.toHaveBeenCalled();
    });

    it("does not open menu when disabled and clicked", async () => {
      renderButton({
        disabled: true,
        menuItems: [{ label: "Item 1", onClick: jest.fn() }],
      });

      const button = screen.getByText("Menu Button");
      await userEvent.click(button);

      expect(screen.queryByText("Item 1")).not.toBeInTheDocument();
    });

    it("updates aria-expanded when menu opens/closes", async () => {
      renderButton({
        menuItems: [{ label: "Item 1", onClick: jest.fn() }],
      });

      const buttonDiv = screen.getByText("Menu Button").parentElement;
      expect(buttonDiv).toHaveAttribute("aria-expanded", "false");

      await userEvent.click(screen.getByText("Menu Button"));
      expect(buttonDiv).toHaveAttribute("aria-expanded", "true");

      await userEvent.click(screen.getByText("Menu Button"));
      expect(buttonDiv).toHaveAttribute("aria-expanded", "false");
    });
  });

  describe("Button Keyboard Navigation", () => {
    it("opens menu on Enter key press", async () => {
      renderButton({
        menuItems: [{ label: "Item 1", onClick: jest.fn() }],
      });

      const buttonDiv = screen.getByText("Menu Button").parentElement;
      fireEvent.keyDown(buttonDiv, { key: "Enter" });

      expect(screen.getByText("Item 1")).toBeInTheDocument();
    });

    it("prevents default behavior on Enter key", async () => {
      renderButton({
        menuItems: [{ label: "Item 1", onClick: jest.fn() }],
      });

      const buttonDiv = screen.getByText("Menu Button").parentElement;
      const event = new KeyboardEvent("keydown", { key: "Enter", bubbles: true });
      const preventDefaultSpy = jest.spyOn(event, "preventDefault");

      fireEvent.keyDown(buttonDiv, { key: "Enter" });
      expect(screen.getByText("Item 1")).toBeInTheDocument();
    });

    it("opens menu on Space key press", async () => {
      renderButton({
        menuItems: [{ label: "Item 1", onClick: jest.fn() }],
      });

      const buttonDiv = screen.getByText("Menu Button").parentElement;
      fireEvent.keyDown(buttonDiv, { key: " " });

      expect(screen.getByText("Item 1")).toBeInTheDocument();
    });

    it("prevents default behavior on Space key", async () => {
      renderButton({
        menuItems: [{ label: "Item 1", onClick: jest.fn() }],
      });

      const buttonDiv = screen.getByText("Menu Button").parentElement;
      const event = new KeyboardEvent("keydown", { key: " ", bubbles: true });
      const preventDefaultSpy = jest.spyOn(event, "preventDefault");

      fireEvent.keyDown(buttonDiv, { key: " " });
      expect(screen.getByText("Item 1")).toBeInTheDocument();
    });

    it("stops propagation on Enter/Space key", async () => {
      const onKeyDownParent = jest.fn();

      render(
        <div onKeyDown={onKeyDownParent}>
          <PopoverMenuButton menuItems={[{ label: "Item 1" }]}>
            <button>Menu Button</button>
          </PopoverMenuButton>
        </div>
      );

      const buttonDiv = screen.getByText("Menu Button").parentElement;
      fireEvent.keyDown(buttonDiv, { key: "Enter", bubbles: true });

      // stopPropagation should prevent reaching parent
      expect(screen.getByText("Item 1")).toBeInTheDocument();
    });

    it("ignores other key presses", async () => {
      renderButton({
        menuItems: [{ label: "Item 1", onClick: jest.fn() }],
      });

      const buttonDiv = screen.getByText("Menu Button").parentElement;
      fireEvent.keyDown(buttonDiv, { key: "ArrowDown" });

      expect(screen.queryByText("Item 1")).not.toBeInTheDocument();
    });

    it("sets tabIndex=-1 when disabled", () => {
      renderButton({ disabled: true });
      const buttonDiv = screen.getByText("Menu Button").parentElement;
      expect(buttonDiv).toHaveAttribute("tabIndex", "-1");
    });

    it("sets tabIndex=0 when not disabled", () => {
      renderButton({ disabled: false });
      const buttonDiv = screen.getByText("Menu Button").parentElement;
      expect(buttonDiv).toHaveAttribute("tabIndex", "0");
    });
  });

  describe("Backdrop Click Handler", () => {
    it("closes menu when backdrop is clicked", async () => {
      renderButton({
        menuItems: [{ label: "Item 1", onClick: jest.fn() }],
      });

      await userEvent.click(screen.getByText("Menu Button"));
      expect(screen.getByText("Item 1")).toBeInTheDocument();

      const backdrop = document.querySelector('[style*="position: fixed"][style*="top: 0"]');
      fireEvent.click(backdrop);

      expect(screen.queryByText("Item 1")).not.toBeInTheDocument();
    });

    it("stops propagation on backdrop click", async () => {
      const onClickParent = jest.fn();

      render(
        <div onClick={onClickParent}>
          <PopoverMenuButton menuItems={[{ label: "Item 1" }]}>
            <button>Menu Button</button>
          </PopoverMenuButton>
        </div>
      );

      await userEvent.click(screen.getByText("Menu Button"));

      const backdrop = document.querySelector('[style*="position: fixed"][style*="top: 0"]');
      fireEvent.click(backdrop);

      expect(onClickParent).not.toHaveBeenCalled();
    });

    it("closes menu on Escape key in backdrop", async () => {
      renderButton({
        menuItems: [{ label: "Item 1", onClick: jest.fn() }],
      });

      await userEvent.click(screen.getByText("Menu Button"));
      expect(screen.getByText("Item 1")).toBeInTheDocument();

      const backdrop = document.querySelector('[style*="position: fixed"][style*="top: 0"]');
      fireEvent.keyDown(backdrop, { key: "Escape" });

      expect(screen.queryByText("Item 1")).not.toBeInTheDocument();
    });

    it("only responds to Escape key on backdrop", async () => {
      renderButton({
        menuItems: [{ label: "Item 1", onClick: jest.fn() }],
      });

      await userEvent.click(screen.getByText("Menu Button"));

      const backdrop = document.querySelector('[style*="position: fixed"][style*="top: 0"]');
      fireEvent.keyDown(backdrop, { key: "Enter" });

      expect(screen.getByText("Item 1")).toBeInTheDocument();
    });

    it("has correct aria-label on backdrop", async () => {
      renderButton({
        ariaLabel: "Custom close label",
        menuItems: [{ label: "Item 1" }],
      });

      await userEvent.click(screen.getByText("Menu Button"));

      const backdrop = document.querySelector('[style*="position: fixed"][style*="top: 0"]');
      expect(backdrop).toHaveAttribute("aria-label", "Custom close label");
    });

    it("uses default aria-label when not provided", async () => {
      renderButton({
        menuItems: [{ label: "Item 1" }],
      });

      await userEvent.click(screen.getByText("Menu Button"));

      const backdrop = document.querySelector('[style*="position: fixed"][style*="top: 0"]');
      expect(backdrop).toHaveAttribute("aria-label", "Close menu");
    });
  });

  describe("Menu Item Click Handler", () => {
    it("calls item onClick when menu item is clicked", async () => {
      const onClickItem = jest.fn();
      renderButton({
        menuItems: [{ label: "Item 1", onClick: onClickItem }],
      });

      await userEvent.click(screen.getByText("Menu Button"));
      await userEvent.click(screen.getByText("Item 1"));

      expect(onClickItem).toHaveBeenCalled();
    });

    it("closes menu after item click", async () => {
      renderButton({
        menuItems: [{ label: "Item 1", onClick: jest.fn() }],
      });

      await userEvent.click(screen.getByText("Menu Button"));
      expect(screen.getByText("Item 1")).toBeInTheDocument();

      await userEvent.click(screen.getByText("Item 1"));
      expect(screen.queryByText("Item 1")).not.toBeInTheDocument();
    });

    it("stops propagation on menu item click", async () => {
      const onClickParent = jest.fn();

      render(
        <div onClick={onClickParent}>
          <PopoverMenuButton menuItems={[{ label: "Item 1", onClick: jest.fn() }]}>
            <button>Menu Button</button>
          </PopoverMenuButton>
        </div>
      );

      await userEvent.click(screen.getByText("Menu Button"));
      await userEvent.click(screen.getByText("Item 1"));

      expect(onClickParent).not.toHaveBeenCalled();
    });

    it("handles item without onClick callback", async () => {
      renderButton({
        menuItems: [{ label: "Item 1" }],
      });

      await userEvent.click(screen.getByText("Menu Button"));
      await userEvent.click(screen.getByText("Item 1"));

      expect(screen.queryByText("Item 1")).not.toBeInTheDocument();
    });

    it("handles multiple menu items with different onClick handlers", async () => {
      const onClick1 = jest.fn();
      const onClick2 = jest.fn();

      renderButton({
        menuItems: [
          { label: "Item 1", onClick: onClick1 },
          { label: "Item 2", onClick: onClick2 },
        ],
      });

      await userEvent.click(screen.getByText("Menu Button"));
      await userEvent.click(screen.getByText("Item 1"));

      expect(onClick1).toHaveBeenCalled();
      expect(onClick2).not.toHaveBeenCalled();
    });
  });

  describe("Menu Item Keyboard Navigation", () => {
    it("calls item onClick on Enter key", async () => {
      const onClickItem = jest.fn();
      renderButton({
        menuItems: [{ label: "Item 1", onClick: onClickItem }],
      });

      await userEvent.click(screen.getByText("Menu Button"));
      const item = screen.getByText("Item 1").closest('[role="button"]');
      fireEvent.keyDown(item, { key: "Enter" });

      expect(onClickItem).toHaveBeenCalled();
    });

    it("prevents default on Enter key in menu item", async () => {
      renderButton({
        menuItems: [{ label: "Item 1", onClick: jest.fn() }],
      });

      await userEvent.click(screen.getByText("Menu Button"));
      const item = screen.getByText("Item 1").closest('[role="button"]');
      const event = new KeyboardEvent("keydown", { key: "Enter", bubbles: true });
      const preventDefaultSpy = jest.spyOn(event, "preventDefault");

      fireEvent.keyDown(item, { key: "Enter" });
      expect(screen.queryByText("Item 1")).not.toBeInTheDocument();
    });

    it("calls item onClick on Space key", async () => {
      const onClickItem = jest.fn();
      renderButton({
        menuItems: [{ label: "Item 1", onClick: onClickItem }],
      });

      await userEvent.click(screen.getByText("Menu Button"));
      const item = screen.getByText("Item 1").closest('[role="button"]');
      fireEvent.keyDown(item, { key: " " });

      expect(onClickItem).toHaveBeenCalled();
    });

    it("prevents default on Space key in menu item", async () => {
      renderButton({
        menuItems: [{ label: "Item 1", onClick: jest.fn() }],
      });

      await userEvent.click(screen.getByText("Menu Button"));
      const item = screen.getByText("Item 1").closest('[role="button"]');
      fireEvent.keyDown(item, { key: " " });

      expect(screen.queryByText("Item 1")).not.toBeInTheDocument();
    });

    it("closes menu after Enter key in item", async () => {
      renderButton({
        menuItems: [{ label: "Item 1", onClick: jest.fn() }],
      });

      await userEvent.click(screen.getByText("Menu Button"));
      const item = screen.getByText("Item 1").closest('[role="button"]');
      fireEvent.keyDown(item, { key: "Enter" });

      expect(screen.queryByText("Item 1")).not.toBeInTheDocument();
    });

    it("closes menu after Space key in item", async () => {
      renderButton({
        menuItems: [{ label: "Item 1", onClick: jest.fn() }],
      });

      await userEvent.click(screen.getByText("Menu Button"));
      const item = screen.getByText("Item 1").closest('[role="button"]');
      fireEvent.keyDown(item, { key: " " });

      expect(screen.queryByText("Item 1")).not.toBeInTheDocument();
    });

    it("ignores other keys in menu item", async () => {
      const onClickItem = jest.fn();
      renderButton({
        menuItems: [{ label: "Item 1", onClick: onClickItem }],
      });

      await userEvent.click(screen.getByText("Menu Button"));
      const item = screen.getByText("Item 1").closest('[role="button"]');
      fireEvent.keyDown(item, { key: "ArrowDown" });

      expect(onClickItem).not.toHaveBeenCalled();
      expect(screen.getByText("Item 1")).toBeInTheDocument();
    });

    it("menu items have correct accessibility attributes", async () => {
      renderButton({
        menuItems: [{ label: "Item 1", onClick: jest.fn() }],
      });

      await userEvent.click(screen.getByText("Menu Button"));
      const item = screen.getByText("Item 1").closest('[role="button"]');

      expect(item).toHaveAttribute("role", "button");
      expect(item).toHaveAttribute("tabIndex", "0");
      expect(item).toHaveAttribute("aria-label", "Item 1");
    });
  });

  describe("Menu Item Hover States", () => {
    it("changes background color on mouse enter", async () => {
      renderButton({
        menuItems: [{ label: "Item 1", onClick: jest.fn() }],
      });

      await userEvent.click(screen.getByText("Menu Button"));
      const item = screen.getByText("Item 1").closest('[role="button"]');

      fireEvent.mouseEnter(item);
      expect(item).toBeInTheDocument();
    });

    it("resets background color on mouse leave", async () => {
      renderButton({
        menuItems: [{ label: "Item 1", onClick: jest.fn() }],
      });

      await userEvent.click(screen.getByText("Menu Button"));
      const item = screen.getByText("Item 1").closest('[role="button"]');

      fireEvent.mouseEnter(item);
      fireEvent.mouseLeave(item);
      expect(item).toBeInTheDocument();
    });

    it("maintains transparent background initially", async () => {
      renderButton({
        menuItems: [{ label: "Item 1", onClick: jest.fn() }],
      });

      await userEvent.click(screen.getByText("Menu Button"));
      const item = screen.getByText("Item 1").closest('[role="button"]');

      expect(item.style.backgroundColor).toBe("");
    });
  });

  describe("Position Calculation & Updates", () => {
    it("calculates position based on button position", async () => {
      renderButton({
        menuItems: [{ label: "Item 1" }],
      });

      await userEvent.click(screen.getByText("Menu Button"));

      const popover = getPopover();
      expect(popover).toHaveStyle({
        top: "158px", // bottom (150) + gap (8)
        left: "0px", // right (200) - minWidth (200)
      });
    });

    it("recalculates position on window resize", async () => {
      renderButton({
        menuItems: [{ label: "Item 1" }],
      });

      await userEvent.click(screen.getByText("Menu Button"));

      // Mock new position
      Element.prototype.getBoundingClientRect = jest.fn(() => ({
        top: 200,
        left: 100,
        right: 300,
        bottom: 250,
        width: 150,
        height: 50,
        x: 100,
        y: 200,
      }));

      fireEvent.resize(window);

      await waitFor(() => {
        const popover = getPopover();
        expect(popover).toHaveStyle({
          top: "258px",
          left: "100px",
        });
      });
    });

    it("does not recalculate when menu is closed", () => {
      const getBoundingClientRectSpy = jest.spyOn(
        Element.prototype,
        "getBoundingClientRect"
      );
      getBoundingClientRectSpy.mockClear();

      renderButton({
        menuItems: [{ label: "Item 1" }],
      });

      fireEvent.resize(window);

      expect(getBoundingClientRectSpy).not.toHaveBeenCalled();
    });

    it("popover has correct styling", async () => {
      renderButton({
        menuItems: [{ label: "Item 1" }],
      });

      await userEvent.click(screen.getByText("Menu Button"));

      const popover = getPopover();
      expect(popover).toHaveStyle({
        position: "fixed",
        backgroundColor: "var(--bg-secondary)",
        border: "1px solid var(--border)",
        borderRadius: "16px",
        padding: "8px",
        zIndex: "1000",
        minWidth: "200px",
      });
    });
  });

  describe("Menu Separators", () => {
    it("renders separators between menu items", async () => {
      renderButton({
        menuItems: [
          { label: "Item 1", onClick: jest.fn() },
          { label: "Item 2", onClick: jest.fn() },
        ],
      });

      await userEvent.click(screen.getByText("Menu Button"));

      const separators = getSeparators();
      expect(separators.length).toBeGreaterThan(0);
    });

    it("does not render separator after last item", async () => {
      renderButton({
        menuItems: [
          { label: "Item 1", onClick: jest.fn() },
          { label: "Item 2", onClick: jest.fn() },
          { label: "Item 3", onClick: jest.fn() },
        ],
      });

      await userEvent.click(screen.getByText("Menu Button"));

      const separators = getSeparators();
      // Should be 2 separators for 3 items
      expect(separators.length).toBe(2);
    });
  });

  describe("Menu Item Icon & Color", () => {
    it("renders item icon when provided", async () => {
      const icon = <span>🔥</span>;
      renderButton({
        menuItems: [{ label: "Item 1", icon, onClick: jest.fn() }],
      });

      await userEvent.click(screen.getByText("Menu Button"));
      expect(screen.getByText("🔥")).toBeInTheDocument();
    });

    it("applies custom color to item text", async () => {
      renderButton({
        menuItems: [{ label: "Item 1", color: "#FF0000", onClick: jest.fn() }],
      });

      await userEvent.click(screen.getByText("Menu Button"));
      const itemLabel = screen.getByText("Item 1");

      expect(itemLabel).toHaveStyle({
        color: "#FF0000",
      });
    });

    it("uses fallback color when not provided", async () => {
      renderButton({
        menuItems: [{ label: "Item 1", onClick: jest.fn() }],
      });

      await userEvent.click(screen.getByText("Menu Button"));
      const itemLabel = screen.getByText("Item 1");

      expect(itemLabel).toHaveStyle({
        color: "var(--text-primary)",
      });
    });
  });

  describe("Popover Content Interaction", () => {
    it("stops propagation when clicking inside popover", async () => {
      const onClickParent = jest.fn();

      render(
        <div onClick={onClickParent}>
          <PopoverMenuButton menuItems={[{ label: "Item 1", onClick: jest.fn() }]}>
            <button>Menu Button</button>
          </PopoverMenuButton>
        </div>
      );

      await userEvent.click(screen.getByText("Menu Button"));

      const popover = getPopover();
      fireEvent.click(popover);

      expect(onClickParent).not.toHaveBeenCalled();
    });
  });

  describe("Edge Cases & Integration", () => {
    it("handles empty menu items array", () => {
      const { container } = renderButton({
        menuItems: [],
      });

      const button = screen.getByText("Menu Button");
      fireEvent.click(button);

      expect(getPopover()).toBeInTheDocument();
    });

    it("opens and closes menu multiple times", async () => {
      renderButton({
        menuItems: [{ label: "Item 1", onClick: jest.fn() }],
      });

      const button = screen.getByText("Menu Button");

      for (let i = 0; i < 3; i++) {
        await userEvent.click(button);
        expect(screen.getByText("Item 1")).toBeInTheDocument();
        await userEvent.click(button);
        expect(screen.queryByText("Item 1")).not.toBeInTheDocument();
      }
    });

    it("handles quickly clicking multiple items sequentially", async () => {
      const onClick1 = jest.fn();
      const onClick2 = jest.fn();

      renderButton({
        menuItems: [
          { label: "Item 1", onClick: onClick1 },
          { label: "Item 2", onClick: onClick2 },
        ],
      });

      await userEvent.click(screen.getByText("Menu Button"));
      await userEvent.click(screen.getByText("Item 1"));
      expect(onClick1).toHaveBeenCalledTimes(1);

      // Menu should be closed, need to reopen
      await userEvent.click(screen.getByText("Menu Button"));
      await userEvent.click(screen.getByText("Item 2"));
      expect(onClick2).toHaveBeenCalledTimes(1);
    });

    it("handles dynamic menu items updates", async () => {
      const { rerender } = render(
        <PopoverMenuButton
          menuItems={[{ label: "Item 1", onClick: jest.fn() }]}
        >
          <button>Menu Button</button>
        </PopoverMenuButton>
      );

      await userEvent.click(screen.getByText("Menu Button"));
      expect(screen.getByText("Item 1")).toBeInTheDocument();

      rerender(
        <PopoverMenuButton
          menuItems={[
            { label: "Item 1", onClick: jest.fn() },
            { label: "Item 2", onClick: jest.fn() },
          ]}
        >
          <button>Menu Button</button>
        </PopoverMenuButton>
      );

      expect(screen.getByText("Item 1")).toBeInTheDocument();
      expect(screen.getByText("Item 2")).toBeInTheDocument();
    });

    it("cleans up resize listener on unmount", () => {
      const removeEventListenerSpy = jest.spyOn(window, "removeEventListener");

      const { unmount } = renderButton({
        menuItems: [{ label: "Item 1" }],
      });

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith("resize", expect.any(Function));
    });
  });
});
