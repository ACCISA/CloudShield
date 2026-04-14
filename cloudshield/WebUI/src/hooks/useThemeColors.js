import { useAppTheme } from "../context/ThemeContext";

/**
 * Provides theme-aware color utilities for dynamic styling
 */
export const useThemeColors = () => {
  const { effectiveTheme } = useAppTheme();

  return {
    isDark: effectiveTheme === "dark",
    isLight: effectiveTheme === "light",

    // Light overlay colors (for hover, active states)
    lightOverlay:
      effectiveTheme === "dark"
        ? "rgba(255, 255, 255, 0.08)"
        : "rgba(0, 0, 0, 0.08)",
    lightOverlaySubtle:
      effectiveTheme === "dark"
        ? "rgba(255, 255, 255, 0.03)"
        : "rgba(0, 0, 0, 0.03)",
    lightOverlayMedium:
      effectiveTheme === "dark"
        ? "rgba(255, 255, 255, 0.12)"
        : "rgba(0, 0, 0, 0.12)",

    // Frequently used colors
    border:
      effectiveTheme === "dark"
        ? "rgba(255, 255, 255, 0.16)"
        : "rgba(0, 0, 0, 0.16)",
    borderStrong:
      effectiveTheme === "dark"
        ? "rgba(255, 255, 255, 0.2)"
        : "rgba(0, 0, 0, 0.2)",
    borderLight:
      effectiveTheme === "dark"
        ? "rgba(255, 255, 255, 0.08)"
        : "rgba(0, 0, 0, 0.10)",

    // Text colors
    text: effectiveTheme === "dark" ? "#FFFFFF" : "#111827",
    textPrimary: effectiveTheme === "dark" ? "#FFFFFF" : "#111827",
    textSecondary: effectiveTheme === "dark" ? "#9E9E9E" : "#6B7280",
    textTertiary:
      effectiveTheme === "dark"
        ? "rgba(255,255,255,0.5)"
        : "rgba(17,24,39,0.5)",
    textDisabled:
      effectiveTheme === "dark"
        ? "rgba(255,255,255,0.3)"
        : "rgba(17,24,39,0.3)",

    // Background colors
    surface: effectiveTheme === "dark" ? "#111111" : "#FFFFFF",
    bgPrimary: effectiveTheme === "dark" ? "#0A0A0A" : "#FFFFFF",
    bgSidebar: effectiveTheme === "dark" ? "#0A0A0A" : "#F0F1F4",
    bgSecondary: effectiveTheme === "dark" ? "#111111" : "#FFFFFF",
    bgTertiary: effectiveTheme === "dark" ? "#161616" : "#F9FAFB",
    bgHover: effectiveTheme === "dark" ? "#242424" : "#F3F4F6",
    bgActive: effectiveTheme === "dark" ? "#2A2A2A" : "#E5EAEF",

    // Input colors
    inputBg: effectiveTheme === "dark" ? "#0A0A0A" : "#F5F5F5",
    inputBgHover: effectiveTheme === "dark" ? "#161616" : "#F0F0F0",
    inputBgFocus: effectiveTheme === "dark" ? "#1A1A1A" : "#FFFFFF",
    inputText: effectiveTheme === "dark" ? "#FFFFFF" : "#000000",
    inputPlaceholder:
      effectiveTheme === "dark" ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)",

    // Primary button colors
    primary: effectiveTheme === "dark" ? "#FFFFFF" : "#000000",
    primaryText: effectiveTheme === "dark" ? "#000000" : "#FFFFFF",
    primaryHover: effectiveTheme === "dark" ? "#E0E0E0" : "#333333",
    primaryActive: effectiveTheme === "dark" ? "#BDBDBD" : "#1A1A1A",

    // Secondary button colors
    secondary: effectiveTheme === "dark" ? "#1a1a1a" : "#F5F5F5",
    secondaryText: effectiveTheme === "dark" ? "#FFFFFF" : "#000000",
    secondaryHover: effectiveTheme === "dark" ? "#242424" : "#EBEBEB",
    secondaryBorder:
      effectiveTheme === "dark"
        ? "rgba(255, 255, 255, 0.1)"
        : "rgba(0, 0, 0, 0.1)",

    // Sidebar interaction colors
    sidebarItemActiveBg:
      effectiveTheme === "dark"
        ? "rgba(255, 255, 255, 0.08)"
        : "rgba(59, 130, 246, 0.12)",
    sidebarItemHoverBg:
      effectiveTheme === "dark"
        ? "rgba(255, 255, 255, 0.06)"
        : "rgba(59, 130, 246, 0.07)",

    // Success/Error colors (for status badges, alerts)
    success: "#4CAF50",
    error: "#F44336",
    warning: "#FF9800",
    info: "#2196F3",
  };
};
