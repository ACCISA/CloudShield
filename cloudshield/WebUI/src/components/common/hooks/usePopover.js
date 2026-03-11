import { useState, useEffect } from "react";

/**
 * Custom hook for managing popover positioning and state
 * @param {Object} options - Configuration options
 * @param {Function} options.onOpen - Optional callback when popover opens
 * @param {Function} options.onClose - Optional callback when popover closes
 * @returns {Object} Popover state and handlers
 */
const VIEWPORT_PADDING = 12;
const TRIGGER_GAP = 8;

function toNumber(value, fallback) {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

export function usePopover({
  onOpen,
  onClose,
  popoverWidth = 320,
  popoverHeight = 320,
} = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const [buttonRef, setButtonRef] = useState(null);
  const [popoverPosition, setPopoverPosition] = useState({});

  const updatePosition = () => {
    if (buttonRef) {
      const rect = buttonRef.getBoundingClientRect();
      const width = toNumber(popoverWidth, 320);
      const height = toNumber(popoverHeight, 320);
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let left = rect.left;
      left = Math.max(
        VIEWPORT_PADDING,
        Math.min(left, viewportWidth - width - VIEWPORT_PADDING),
      );

      let top = rect.bottom + TRIGGER_GAP;
      top = Math.max(
        VIEWPORT_PADDING,
        Math.min(top, viewportHeight - height - VIEWPORT_PADDING),
      );

      setPopoverPosition({
        left: `${Math.round(left)}px`,
        top: `${Math.round(top)}px`,
      });
    }
  };

  const handleOpen = () => {
    updatePosition();
    setIsOpen(true);
    onOpen?.();
  };

  const handleClose = () => {
    setIsOpen(false);
    onClose?.();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleOpen();
    }
  };

  // Update position on window resize when popover is open
  useEffect(() => {
    if (!isOpen) return;

    const handleResize = () => {
      updatePosition();
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isOpen, buttonRef, popoverWidth, popoverHeight]);

  return {
    isOpen,
    buttonRef,
    setButtonRef,
    popoverPosition,
    handleOpen,
    handleClose,
    handleKeyDown,
  };
}
