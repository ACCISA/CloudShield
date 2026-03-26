import React from "react";
import ListIcon from "../../../assets/DisplayButton/ListIcon.jsx";
import ImageIcon from "../../../assets/DisplayButton/ImageIcon.jsx";
import DisplayIcon from "../../../assets/DisplayButton/DisplayIcon.jsx";
import ColumnToggle from "./ColumnToggle.jsx";
import { useThemeColors } from "../../../hooks/useThemeColors.js";
import { usePopover } from "../hooks/usePopover.js";
import {
  buttonStyle as baseButtonStyle,
  getButtonStyle,
  getPopoverStyle,
  getPopoverStyleLegacy,
  backdropStyle,
  buttonHoverHandlers,
  getButtonHoverHandlers,
} from "../styles/popoverStyles.js";

export default function DisplayButton({
  layout = "list",
  onLayoutChange,
  style = {},
  columnToggles = null, // { columns: [{ key, label, checked }], onToggle }
}) {
  const themeColors = useThemeColors();
  const popover = usePopover({
    popoverWidth: columnToggles ? 400 : 280,
    popoverHeight: columnToggles ? 420 : 220,
  });

  const handleLayoutChange = (newLayout) => {
    onLayoutChange?.(newLayout);
    // Keep popover open when switching layouts
  };

  const buttonStyle = getButtonStyle(themeColors);
  const popoverStyle = getPopoverStyle(themeColors, columnToggles ? "400px" : "280px");
  const hoverHandlers = getButtonHoverHandlers(themeColors);

  // Option card styling
  const getOptionStyle = (isActive) => ({
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "20px 16px",
    borderRadius: "12px",
    border: isActive ? `1px solid ${themeColors.border}` : "none",
    backgroundColor: isActive ? themeColors.bgHover : "transparent",
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
    color: themeColors.text,
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
        {...hoverHandlers}
      >
        <DisplayIcon width={16} height={16} color={themeColors.text} />
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
                gridTemplateColumns: "1fr 1fr",
                gap: "12px",
              }}
            >
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
                    color={layout === "list" ? themeColors.text : themeColors.textTertiary}
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
                    e.currentTarget.style.backgroundColor = themeColors.bgHover;
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
                      layout === "icons" ? themeColors.text : themeColors.textTertiary
                    }
                  />
                </div>
                <div style={getLabelStyle(layout === "icons")}>Icons</div>
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
                      color: "var(--text-primary)",
                      marginBottom: "4px",
                      opacity: 0.9,
                    }}
                  >
                    Show Columns
                  </div>
                  {columnToggles.columns?.map((column) => (
                    <ColumnToggle
                      key={column.key}
                      label={column.label}
                      checked={column.checked}
                      onChange={() => columnToggles.onToggle(column.key)}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </>
      )}
    </>
  );
}
