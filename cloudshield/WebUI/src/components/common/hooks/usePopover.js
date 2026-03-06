import { useState, useEffect } from "react";

/**
 * Custom hook for managing popover positioning and state
 * @param {Object} options - Configuration options
 * @param {Function} options.onOpen - Optional callback when popover opens
 * @param {Function} options.onClose - Optional callback when popover closes
 * @returns {Object} Popover state and handlers
 */
export function usePopover({ onOpen, onClose } = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const [buttonRef, setButtonRef] = useState(null);
  const [popoverPosition, setPopoverPosition] = useState({});

  const updatePosition = () => {
    if (buttonRef) {
      const rect = buttonRef.getBoundingClientRect();
      const popoverWidth = 320; // Default popover width
      const viewportWidth = window.innerWidth;
      const margin = 16; // Minimum margin from viewport edge

      // Calculate left position
      let left = rect.left;

      // Check if popover would go off-screen to the right
      if (left + popoverWidth > viewportWidth - margin) {
        // Align right edge of popover with right edge of button
        left = rect.right - popoverWidth;
      }

      // Ensure popover doesn't go off-screen to the left
      if (left < margin) {
        left = margin;
      }

      setPopoverPosition({
        left: `${left}px`,
        top: `${rect.bottom}px`,
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
  }, [isOpen, buttonRef]);

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
