import React from "react";
import CardsIcon from "../../../assets/DisplayButton/CardsIcon.jsx";
import ListIcon from "../../../assets/DisplayButton/ListIcon.jsx";
import ImageIcon from "../../../assets/DisplayButton/ImageIcon.jsx";
import DisplayIcon from "../../../assets/DisplayButton/DisplayIcon.jsx";
import ColumnToggle from "./ColumnToggle.jsx";
import { usePopover } from "../hooks/usePopover.js";
import {
  buttonStyle as baseButtonStyle,
  getPopoverStyle,
  backdropStyle,
  buttonHoverHandlers,
} from "../styles/popoverStyles.js";

export default function DisplayButton({
  layout = "list",
  onLayoutChange,
  style = {},
  columnToggles = null, // { showUsers, showWorkstations, showFiles, onToggle }
}) {
  const popover = usePopover();

  const handleLayoutChange = (newLayout) => {
    onLayoutChange?.(newLayout);
    // Keep popover open when switching layouts
  };

  const buttonStyle = { ...baseButtonStyle, ...style };
  const popoverStyle = getPopoverStyle(columnToggles ? "400px" : "380px");

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

  return (
    <>
      <div
        ref={popover.setButtonRef}
        style={buttonStyle}
        onClick={popover.handleOpen}
        onKeyDown={popover.handleKeyDown}
        role="button"
        tabIndex={0}
        aria-label="Display options"
        {...buttonHoverHandlers}
      >
        <DisplayIcon width={16} height={16} color="#fff" />
        Display
      </div>

      {popover.isOpen && (
        <>
          {/* Backdrop */}
          <div
            onClick={popover.handleClose}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                popover.handleClose();
              }
            }}
            role="button"
            tabIndex={-1}
            aria-label="Close display options"
            style={backdropStyle}
          />

          {/* Popover */}
          <div style={{ ...popoverStyle, ...popover.popoverPosition }}>
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
                  if (e.key === "Enter" || e.key === " ") {
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
                  if (e.key === "Enter" || e.key === " ") {
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
                  if (e.key === "Enter" || e.key === " ") {
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

            {/* Column Toggles */}
            {columnToggles && (
              <>
                <div
                  style={{
                    borderTop: "1px solid rgba(255,255,255,0.1)",
                    margin: "12px 0",
                  }}
                />
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "13px",
                      fontWeight: 600,
                      color: "#fff",
                      marginBottom: "4px",
                      opacity: 0.9,
                    }}
                  >
                    Show Columns
                  </div>
                  <ColumnToggle
                    label="Users"
                    checked={columnToggles.showUsers}
                    onChange={() => columnToggles.onToggle("showUsers")}
                  />
                  <ColumnToggle
                    label="Workstations"
                    checked={columnToggles.showWorkstations}
                    onChange={() => columnToggles.onToggle("showWorkstations")}
                  />
                  <ColumnToggle
                    label="Files"
                    checked={columnToggles.showFiles}
                    onChange={() => columnToggles.onToggle("showFiles")}
                  />
                </div>
              </>
            )}
          </div>
        </>
      )}
    </>
  );
}
