import React, { useEffect, useMemo, useRef, useState } from "react";
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
  const [isHovered, setIsHovered] = useState(false);
  const [hoveredOption, setHoveredOption] = useState(null);
  const buttonRef = useRef(null);
  const [popoverPosition, setPopoverPosition] = useState({});

  const updatePosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
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
  const buttonStyle = useMemo(() => {
    const hoverStyles = isHovered
      ? { background: "#242424", borderColor: "rgba(255, 255, 255, 0.2)" }
      : { background: "#0A0A0A", borderColor: "rgba(255, 255, 255, 0.1)" };

    return {
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
      ...hoverStyles,
      ...style,
    };
  }, [isHovered, style]);

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
  const getOptionStyle = (isActive, isHovering) => ({
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "20px 16px",
    borderRadius: "12px",
    border: isActive || isHovering ? "1px solid rgba(255,255,255,0.2)" : "none",
    backgroundColor:
      isActive || isHovering ? "rgba(255,255,255,0.1)" : "transparent",
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

  return (
    <>
      <button
        ref={buttonRef}
        style={buttonStyle}
        onClick={handleOpen}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        type="button"
        aria-label="Display"
      >
        <DisplayIcon width={16} height={16} color="#fff" />
        Display
      </button>

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
          <div style={{ ...popoverStyle, ...popoverPosition }} role="presentation">
            <div style={{ display: "flex", alignItems: "center", marginBottom: "12px" }}>
              <div
                style={{
                  fontSize: "14px",
                  fontWeight: 600,
                  opacity: 0.9,
                }}
              >
                Layout
              </div>
            </div>
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
                style={getOptionStyle(
                  layout === "cards",
                  hoveredOption === "cards"
                )}
                onMouseEnter={() => setHoveredOption("cards")}
                onMouseLeave={() => setHoveredOption(null)}
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
                style={getOptionStyle(
                  layout === "list",
                  hoveredOption === "list"
                )}
                onMouseEnter={() => setHoveredOption("list")}
                onMouseLeave={() => setHoveredOption(null)}
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
                style={getOptionStyle(
                  layout === "icons",
                  hoveredOption === "icons"
                )}
                onMouseEnter={() => setHoveredOption("icons")}
                onMouseLeave={() => setHoveredOption(null)}
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
                <div style={getLabelStyle(layout === "icons")}>Icons</div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
