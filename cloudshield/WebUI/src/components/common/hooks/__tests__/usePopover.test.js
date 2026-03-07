import { renderHook, act } from "@testing-library/react";
import { usePopover } from "../usePopover.js";

describe("usePopover", () => {
  beforeEach(() => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 1024,
    });
    Object.defineProperty(window, "innerHeight", {
      writable: true,
      configurable: true,
      value: 768,
    });
  });

  test("returns closed default state", () => {
    const { result } = renderHook(() => usePopover());

    expect(result.current.isOpen).toBe(false);
    expect(result.current.popoverPosition).toEqual({});
    expect(typeof result.current.handleOpen).toBe("function");
    expect(typeof result.current.handleClose).toBe("function");
    expect(typeof result.current.handleKeyDown).toBe("function");
  });

  test("opens and clamps position inside viewport with numeric dimensions", () => {
    const onOpen = jest.fn();
    const { result } = renderHook(() =>
      usePopover({
        onOpen,
        popoverWidth: 400,
        popoverHeight: 300,
      }),
    );

    const buttonRef = {
      getBoundingClientRect: () => ({
        left: 1000,
        bottom: 760,
      }),
    };

    act(() => {
      result.current.setButtonRef(buttonRef);
    });
    act(() => {
      result.current.handleOpen();
    });

    expect(result.current.isOpen).toBe(true);
    expect(result.current.popoverPosition).toEqual({
      left: "612px",
      top: "456px",
    });
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  test("parses string width and falls back on invalid height", () => {
    const { result } = renderHook(() =>
      usePopover({
        popoverWidth: "250.4",
        popoverHeight: "invalid",
      }),
    );

    const buttonRef = {
      getBoundingClientRect: () => ({
        left: 2,
        bottom: 4,
      }),
    };

    act(() => {
      result.current.setButtonRef(buttonRef);
    });

    act(() => {
      result.current.handleOpen();
    });

    expect(result.current.popoverPosition).toEqual({
      left: "12px",
      top: "12px",
    });
  });

  test("handleKeyDown opens on Enter and Space only", () => {
    const { result } = renderHook(() => usePopover());

    const preventDefaultEnter = jest.fn();
    act(() => {
      result.current.handleKeyDown({ key: "Enter", preventDefault: preventDefaultEnter });
    });
    expect(preventDefaultEnter).toHaveBeenCalled();
    expect(result.current.isOpen).toBe(true);

    act(() => {
      result.current.handleClose();
    });
    expect(result.current.isOpen).toBe(false);

    const preventDefaultSpace = jest.fn();
    act(() => {
      result.current.handleKeyDown({ key: " ", preventDefault: preventDefaultSpace });
    });
    expect(preventDefaultSpace).toHaveBeenCalled();
    expect(result.current.isOpen).toBe(true);

    act(() => {
      result.current.handleClose();
      result.current.handleKeyDown({ key: "Escape", preventDefault: jest.fn() });
    });
    expect(result.current.isOpen).toBe(false);
  });

  test("handleClose closes and calls onClose callback", () => {
    const onClose = jest.fn();
    const { result } = renderHook(() => usePopover({ onClose }));

    act(() => {
      result.current.handleOpen();
    });
    expect(result.current.isOpen).toBe(true);

    act(() => {
      result.current.handleClose();
    });
    expect(result.current.isOpen).toBe(false);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("adds and removes resize listener while popover is open", () => {
    const addSpy = jest.spyOn(window, "addEventListener");
    const removeSpy = jest.spyOn(window, "removeEventListener");

    const { result, unmount } = renderHook(() => usePopover());

    expect(addSpy).not.toHaveBeenCalledWith("resize", expect.any(Function));

    act(() => {
      result.current.handleOpen();
    });
    expect(addSpy).toHaveBeenCalledWith("resize", expect.any(Function));

    unmount();
    expect(removeSpy).toHaveBeenCalledWith("resize", expect.any(Function));

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });
});
