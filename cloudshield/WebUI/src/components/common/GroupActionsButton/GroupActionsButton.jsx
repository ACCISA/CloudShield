import React, { useState, useEffect, useRef } from "react";
import HandshakeIcon from "../../../assets/HandshakeIcon";

const GroupActionsButton = ({
  selectedCount = 0,
  buttonText = "Group Actions",
  menuItems = [],
  disabled = false,
}) => {
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

  const handleButtonClick = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  const handleBackdropClick = () => {
    setIsOpen(false);
  };

  const handleMenuItemClick = (onClick) => {
    if (onClick) {
      onClick();
    }
    setIsOpen(false);
  };

  // Only render when 2 or more items are selected
  if (selectedCount < 2) {
    return null;
  }

  const buttonContainerStyle = {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: "12px 24px",
    gap: "8px",
    minWidth: "120px",
    height: "48px",
    background: "#1a1a1a",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    borderRadius: "8px",
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: "16px",
    fontWeight: "500",
    color: "#ffffff",
    transition: "all 0.2s ease",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
    opacity: disabled ? 0.4 : 1,
  };

  return (
    <>
      <button
        ref={buttonRef}
        style={buttonContainerStyle}
        onClick={handleButtonClick}
        disabled={disabled}
        aria-label={`${buttonText} (${selectedCount} selected)`}
        onMouseEnter={(e) => {
          if (!disabled) {
            e.currentTarget.style.background = "#242424";
            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.2)";
          }
        }}
        onMouseLeave={(e) => {
          if (!disabled) {
            e.currentTarget.style.background = "#1a1a1a";
            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
          }
        }}
      >
        <HandshakeIcon size={20} />
        {buttonText}
        {selectedCount > 0 && (
          <span
            style={{
              backgroundColor: "#fff",
              color: "#000",
              fontSize: "11px",
              fontWeight: "600",
              padding: "2px 6px",
              borderRadius: "12px",
              marginLeft: "4px",
            }}
          >
            {selectedCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            onClick={handleBackdropClick}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                handleBackdropClick();
              }
            }}
            role="button"
            tabIndex={-1}
            aria-label="Close menu"
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
            style={{
              position: "fixed",
              top: `${position.top}px`,
              left: `${position.left}px`,
              backgroundColor: "#ffffff",
              border: "1px solid #e0e0e0",
              borderRadius: "16px",
              padding: "8px",
              zIndex: 1000,
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
              minWidth: "200px",
            }}
          >
            {menuItems.map((item, index) => (
              <div key={index}>
                <div
                  onClick={() => handleMenuItemClick(item.onClick)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleMenuItemClick(item.onClick);
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
                    e.currentTarget.style.backgroundColor = "#f5f5f5";
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
                      fontWeight: "400",
                      color: item.color || "#1a1a1a",
                    }}
                  >
                    {item.label}
                  </span>
                </div>
                {index < menuItems.length - 1 && (
                  <div
                    style={{
                      height: "1px",
                      backgroundColor: "#e0e0e0",
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
};

export default GroupActionsButton;
