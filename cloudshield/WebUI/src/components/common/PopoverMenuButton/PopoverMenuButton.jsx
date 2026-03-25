import { useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";

/**
 * A reusable popover menu button component that handles the shared logic
 * for displaying a menu in a popover below a button.
 */
function PopoverMenuButton({
  children,
  menuItems = [],
  disabled = false,
  ariaLabel = "Close menu",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef(null);

  const calculatePosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      // Position popover below and aligned to the right of the button
      setPosition({
        top: rect.bottom + 8,
        left: rect.right - 200, // 200px is minWidth of popover
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      calculatePosition();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleResize = () => {
      if (isOpen) {
        calculatePosition();
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isOpen]);

  const handleButtonClick = (e) => {
    // Prevent the click from bubbling up and triggering row selection
    e.stopPropagation();
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  const handleBackdropClick = (e) => {
    e.stopPropagation();
    setIsOpen(false);
  };

  const handleMenuItemClick = (e, onClick) => {
    e.stopPropagation();
    if (onClick) {
      onClick();
    }
    setIsOpen(false);
  };

  return (
    <>
      <div
        ref={buttonRef}
        onClick={handleButtonClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            e.stopPropagation();
            handleButtonClick(e);
          }
        }}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-expanded={isOpen}
        aria-haspopup="true"
        style={{ display: "flex" }}
      >
        {typeof children === "function"
          ? children({ isOpen, disabled })
          : children}
      </div>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            onClick={handleBackdropClick}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                handleBackdropClick(e);
              }
            }}
            role="button"
            tabIndex={-1}
            aria-label={ariaLabel || "Close menu"}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "transparent",
              zIndex: 999,
            }}
          />

          {/* Popover */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "fixed",
              top: `${position.top}px`,
              left: `${position.left}px`,
              backgroundColor: "var(--bg-secondary)", // Fixed background
              border: "1px solid var(--border)", // Fixed border
              borderRadius: "16px",
              padding: "8px",
              zIndex: 1000,
              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.2)", // Slightly enhanced shadow for depth
              minWidth: "200px",
            }}
          >
            {menuItems.map((item, index) => (
              <div key={item.label || index}>
                <div
                  onClick={(e) => handleMenuItemClick(e, item.onClick)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleMenuItemClick(e, item.onClick);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={item.label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "12px 16px",
                    cursor: "pointer",
                    borderRadius: "10px",
                    transition: "background-color 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "var(--action-hover)"; // Fixed hover
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "24px",
                      height: "24px",
                    }}
                  >
                    {item.icon}
                  </div>
                  <span
                    style={{
                      fontSize: "14px",
                      fontWeight: "500",
                      color: item.color || "var(--text-primary)", // Fixed text color fallback
                    }}
                  >
                    {item.label}
                  </span>
                </div>
                {index < menuItems.length - 1 && (
                  <div
                    style={{
                      height: "1px",
                      backgroundColor: "var(--border-light)", // Fixed separator
                      margin: "4px 12px",
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}

PopoverMenuButton.propTypes = {
  children: PropTypes.node.isRequired,
  menuItems: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      icon: PropTypes.node,
      color: PropTypes.string,
      onClick: PropTypes.func,
    }),
  ),
  disabled: PropTypes.bool,
  ariaLabel: PropTypes.string,
};

PopoverMenuButton.defaultProps = {
  menuItems: [],
  disabled: false,
  ariaLabel: "Close menu",
};

export default PopoverMenuButton;