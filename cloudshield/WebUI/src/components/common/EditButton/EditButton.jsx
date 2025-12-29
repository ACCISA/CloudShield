import { useState, useEffect, useRef } from "react";
import EditIcon from "../../../assets/EditIcon";

export default function EditButton({ menuItems = [], disabled = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef(null);

  const calculatePosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      // Position popover to the left of the button
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
    setIsOpen(!isOpen);
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

  return (
    <>
      <button
        ref={buttonRef}
        onClick={handleButtonClick}
        disabled={disabled}
        style={{
          padding: "0",
          backgroundColor: "transparent",
          color: "#fff",
          border: "none",
          cursor: disabled ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <EditIcon width={15} height={16} color="#BCBCBC" />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            onClick={handleBackdropClick}
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
                    if (e.key === 'Enter' || e.key === ' ') {
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
}
