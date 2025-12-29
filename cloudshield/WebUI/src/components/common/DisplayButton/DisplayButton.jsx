import React, { useState, useEffect } from "react";
import CardsIcon from "../../../assets/DisplayButton/CardsIcon.jsx";
import ListIcon from "../../../assets/DisplayButton/ListIcon.jsx";
import ImageIcon from "../../../assets/DisplayButton/ImageIcon.jsx";
import DisplayIcon from "../../../assets/DisplayButton/DisplayIcon.jsx";

export default function DisplayButton({
  layout = "list",
  onLayoutChange,
  style = {},
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [buttonRef, setButtonRef] = useState(null);
  const [popoverPosition, setPopoverPosition] = useState({});

  const updatePosition = () => {
    if (buttonRef) {
      const rect = buttonRef.getBoundingClientRect();
      setPopoverPosition({
        left: `${rect.left}px`,
        top: `${rect.bottom}px`,
      });
    }
  };

  const handleOpen = () => {
    updatePosition();
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleLayoutChange = (newLayout) => {
    onLayoutChange?.(newLayout);
    // Keep popover open when switching layouts
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

  // Button styling matching CreateButton
  const buttonStyle = {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: "12px 24px",
    gap: "8px",
    minWidth: "120px",
    height: "48px",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "16px",
    fontWeight: "500",
    color: "#ffffff",
    transition: "all 0.2s ease",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
    position: "relative",
    ...style,
  };

  // Popover container
  const popoverStyle = {
    position: "fixed",
    backgroundColor: "#0A0A0A",
    color: "#fff",
    border: "1px solid rgba(255,255,255,0.2)",
    borderRadius: "16px",
    width: "380px",
    marginTop: "8px",
    boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
    padding: "16px",
    zIndex: 1300,
  };

  // Option card styling
  const getOptionStyle = (isActive) => ({
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "20px 16px",
    borderRadius: "12px",
    border: isActive ? "1px solid rgba(255,255,255,0.2)" : "none",
    backgroundColor: isActive ? "rgba(255,255,255,0.1)" : "transparent",
    cursor: "pointer",
    transition: "all 0.2s ease",
    height: "100px",
  });

  const getIconContainerStyle = () => ({
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "32px",
    width: "32px",
  });

  const getLabelStyle = (isActive) => ({
    fontSize: "14px",
    fontWeight: isActive ? 600 : 400,
    opacity: isActive ? 1 : 0.7,
    color: "#fff",
  });

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleOpen();
    }
  };

  return (
    <>
      <div
        ref={setButtonRef}
        style={buttonStyle}
        onClick={handleOpen}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        aria-label="Display options"
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "#242424";
          e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.2)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "#0A0A0A";
          e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
        }}
      >
        <DisplayIcon width={16} height={16} color="#fff" />
        Display
      </div>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            onClick={handleClose}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 1299,
            }}
          />

          {/* Popover */}
          <div style={{ ...popoverStyle, ...popoverPosition }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: "12px",
              }}
            >
              {/* Cards Option */}
              <div
                onClick={() => handleLayoutChange("cards")}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleLayoutChange("cards");
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label="Cards layout"
                style={getOptionStyle(layout === "cards")}
                onMouseEnter={(e) => {
                  if (layout !== "cards") {
                    e.currentTarget.style.backgroundColor =
                      "rgba(255,255,255,0.08)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (layout !== "cards") {
                    e.currentTarget.style.backgroundColor = "transparent";
                    e.currentTarget.style.border = "none";
                  }
                }}
              >
                <div style={getIconContainerStyle()}>
                  <CardsIcon
                    width={28}
                    height={17}
                    color={
                      layout === "cards" ? "#fff" : "rgba(255,255,255,0.6)"
                    }
                  />
                </div>
                <div style={getLabelStyle(layout === "cards")}>Cards</div>
              </div>

              {/* List Option */}
              <div
                onClick={() => handleLayoutChange("list")}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleLayoutChange("list");
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label="List layout"
                style={getOptionStyle(layout === "list")}
                onMouseEnter={(e) => {
                  if (layout !== "list") {
                    e.currentTarget.style.backgroundColor =
                      "rgba(255,255,255,0.08)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (layout !== "list") {
                    e.currentTarget.style.backgroundColor = "transparent";
                    e.currentTarget.style.border = "none";
                  }
                }}
              >
                <div style={getIconContainerStyle()}>
                  <ListIcon
                    width={28}
                    height={21}
                    color={layout === "list" ? "#fff" : "rgba(255,255,255,0.6)"}
                  />
                </div>
                <div style={getLabelStyle(layout === "list")}>List</div>
              </div>

              {/* Icons Option */}
              <div
                onClick={() => handleLayoutChange("icons")}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleLayoutChange("icons");
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label="Icons layout"
                style={getOptionStyle(layout === "icons")}
                onMouseEnter={(e) => {
                  if (layout !== "icons") {
                    e.currentTarget.style.backgroundColor =
                      "rgba(255,255,255,0.08)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (layout !== "icons") {
                    e.currentTarget.style.backgroundColor = "transparent";
                    e.currentTarget.style.border = "none";
                  }
                }}
              >
                <div style={getIconContainerStyle()}>
                  <ImageIcon
                    width={32}
                    height={32}
                    color={
                      layout === "icons" ? "#fff" : "rgba(255,255,255,0.6)"
                    }
                  />
                </div>
                <div style={getLabelStyle(layout === "icons")}>icons</div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
