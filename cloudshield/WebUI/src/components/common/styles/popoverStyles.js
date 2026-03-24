/**
 * Shared styles for popover-based components
 * Uses theme colors for light/dark mode support
 */

export const getButtonStyle = (themeColors) => ({
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  padding: "12px 24px",
  gap: "8px",
  minWidth: "120px",
  height: "48px",
  border: `1px solid ${themeColors.borderLight}`,
  borderRadius: "8px",
  cursor: "pointer",
  fontSize: "16px",
  fontWeight: "500",
  color: themeColors.text,
  transition: "all 0.2s ease",
  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
  position: "relative",
  backgroundColor: themeColors.bgSecondary,
});

export const buttonStyle = {
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
};

export const getPopoverStyle = (themeColors, width = "320px") => ({
  position: "fixed",
  backgroundColor: themeColors.bgSecondary,
  color: themeColors.text,
  border: `1px solid ${themeColors.borderLight}`,
  borderRadius: "16px",
  width,
  marginTop: "8px",
  boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
  padding: "16px",
  zIndex: 1300,
});

export const getPopoverStyleLegacy = (width = "320px") => ({
  position: "fixed",
  backgroundColor: "#0A0A0A",
  color: "#fff",
  border: "1px solid rgba(255,255,255,0.2)",
  borderRadius: "16px",
  width,
  marginTop: "8px",
  boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
  padding: "16px",
  zIndex: 1300,
});

export const backdropStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 1299,
};

export const getButtonHoverHandlers = (themeColors) => ({
  onMouseEnter: (e) => {
    e.currentTarget.style.backgroundColor = themeColors.bgHover;
    e.currentTarget.style.borderColor = themeColors.border;
  },
  onMouseLeave: (e) => {
    e.currentTarget.style.backgroundColor = themeColors.bgSecondary;
    e.currentTarget.style.borderColor = themeColors.borderLight;
  },
});

export const buttonHoverHandlers = {
  onMouseEnter: (e) => {
    e.currentTarget.style.background = "#242424";
    e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.2)";
  },
  onMouseLeave: (e) => {
    e.currentTarget.style.background = "#0A0A0A";
    e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
  },
};
