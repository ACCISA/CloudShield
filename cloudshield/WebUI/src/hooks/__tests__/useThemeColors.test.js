import { renderHook } from "@testing-library/react";
import { useThemeColors } from "../useThemeColors";
import { ThemeProvider, useAppTheme } from "../../context/ThemeContext";
import "@testing-library/jest-dom";

// Wrapper component for renderHook
function Wrapper({ children }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

describe("useThemeColors Hook", () => {
  it("returns an object with theme colors", () => {
    const { result } = renderHook(() => useThemeColors(), { wrapper: Wrapper });

    expect(result.current).toBeDefined();
    expect(typeof result.current).toBe("object");
  });

  it("returns isDark and isLight boolean properties", () => {
    const { result } = renderHook(() => useThemeColors(), { wrapper: Wrapper });

    expect(result.current.isDark).toBeDefined();
    expect(result.current.isLight).toBeDefined();
    expect(typeof result.current.isDark).toBe("boolean");
    expect(typeof result.current.isLight).toBe("boolean");
  });

  it("returns all overlay color variations", () => {
    const { result } = renderHook(() => useThemeColors(), { wrapper: Wrapper });

    expect(result.current.lightOverlay).toBeDefined();
    expect(result.current.lightOverlaySubtle).toBeDefined();
    expect(result.current.lightOverlayMedium).toBeDefined();

    // Check they are valid color strings
    expect(typeof result.current.lightOverlay).toBe("string");
    expect(typeof result.current.lightOverlaySubtle).toBe("string");
    expect(typeof result.current.lightOverlayMedium).toBe("string");
  });

  it("returns all border color variations", () => {
    const { result } = renderHook(() => useThemeColors(), { wrapper: Wrapper });

    expect(result.current.border).toBeDefined();
    expect(result.current.borderStrong).toBeDefined();
    expect(result.current.borderLight).toBeDefined();

    expect(typeof result.current.border).toBe("string");
    expect(typeof result.current.borderStrong).toBe("string");
    expect(typeof result.current.borderLight).toBe("string");
  });

  it("returns all text color variations", () => {
    const { result } = renderHook(() => useThemeColors(), { wrapper: Wrapper });

    expect(result.current.text).toBeDefined();
    expect(result.current.textPrimary).toBeDefined();
    expect(result.current.textSecondary).toBeDefined();
    expect(result.current.textTertiary).toBeDefined();
    expect(result.current.textDisabled).toBeDefined();

    expect(typeof result.current.text).toBe("string");
    expect(typeof result.current.textPrimary).toBe("string");
    expect(typeof result.current.textSecondary).toBe("string");
    expect(typeof result.current.textTertiary).toBe("string");
    expect(typeof result.current.textDisabled).toBe("string");
  });

  it("returns all background color variations", () => {
    const { result } = renderHook(() => useThemeColors(), { wrapper: Wrapper });

    expect(result.current.surface).toBeDefined();
    expect(result.current.bgPrimary).toBeDefined();
    expect(result.current.bgSecondary).toBeDefined();
    expect(result.current.bgTertiary).toBeDefined();
    expect(result.current.bgHover).toBeDefined();
    expect(result.current.bgActive).toBeDefined();

    expect(typeof result.current.bgPrimary).toBe("string");
    expect(typeof result.current.bgSecondary).toBe("string");
    expect(typeof result.current.bgTertiary).toBe("string");
  });

  it("returns all input color variations", () => {
    const { result } = renderHook(() => useThemeColors(), { wrapper: Wrapper });

    expect(result.current.inputBg).toBeDefined();
    expect(result.current.inputBgHover).toBeDefined();
    expect(result.current.inputBgFocus).toBeDefined();
    expect(result.current.inputText).toBeDefined();
    expect(result.current.inputPlaceholder).toBeDefined();

    expect(typeof result.current.inputBg).toBe("string");
    expect(typeof result.current.inputBgHover).toBe("string");
    expect(typeof result.current.inputBgFocus).toBe("string");
    expect(typeof result.current.inputText).toBe("string");
    expect(typeof result.current.inputPlaceholder).toBe("string");
  });

  it("returns all button color variations", () => {
    const { result } = renderHook(() => useThemeColors(), { wrapper: Wrapper });

    expect(result.current.primary).toBeDefined();
    expect(result.current.primaryText).toBeDefined();
    expect(result.current.primaryHover).toBeDefined();
    expect(result.current.primaryActive).toBeDefined();

    expect(result.current.secondary).toBeDefined();
    expect(result.current.secondaryText).toBeDefined();
    expect(result.current.secondaryHover).toBeDefined();
    expect(result.current.secondaryBorder).toBeDefined();

    expect(typeof result.current.primary).toBe("string");
    expect(typeof result.current.primaryText).toBe("string");
    expect(typeof result.current.secondary).toBe("string");
    expect(typeof result.current.secondaryText).toBe("string");
  });

  it("returns semantic status colors", () => {
    const { result } = renderHook(() => useThemeColors(), { wrapper: Wrapper });

    expect(result.current.success).toBeDefined();
    expect(result.current.error).toBeDefined();
    expect(result.current.warning).toBeDefined();
    expect(result.current.info).toBeDefined();

    // Status colors are typically consistent across themes
    expect(result.current.success).toBe("#4CAF50");
    expect(result.current.error).toBe("#F44336");
    expect(result.current.warning).toBe("#FF9800");
    expect(result.current.info).toBe("#2196F3");
  });

  it("returns rgba colors in dark mode", () => {
    const { result } = renderHook(() => useThemeColors(), { wrapper: Wrapper });

    // These should have rgba format for transparency
    expect(result.current.lightOverlay).toContain("rgba");
    expect(result.current.border).toContain("rgba");
    expect(result.current.inputPlaceholder).toContain("rgba");
  });

  it("provides contrasting colors for text", () => {
    const { result } = renderHook(() => useThemeColors(), { wrapper: Wrapper });

    // In dark mode, text should be light
    if (result.current.isDark) {
      expect(result.current.textPrimary).toBe("#FFFFFF");
    }
    // In light mode, text should be dark
    if (result.current.isLight) {
      expect(result.current.textPrimary).toBe("#000000");
    }
  });

  it("provides consistent primary and button colors", () => {
    const { result } = renderHook(() => useThemeColors(), { wrapper: Wrapper });

    expect(result.current.primary).toBeDefined();
    expect(result.current.primaryText).toBeDefined();
    expect(result.current.primaryHover).toBeDefined();
    expect(result.current.primaryActive).toBeDefined();

    // Verify these form a coherent color scheme for buttons
    expect(typeof result.current.primary).toBe("string");
    expect(typeof result.current.primaryText).toBe("string");
    expect(result.current.primary.length > 0).toBe(true);
    expect(result.current.primaryText.length > 0).toBe(true);
  });

  it("provides surface and background hierarchy", () => {
    const { result } = renderHook(() => useThemeColors(), { wrapper: Wrapper });

    // Should have multiple background levels for visual hierarchy
    expect(result.current.surface).toBeDefined();
    expect(result.current.bgPrimary).toBeDefined();
    expect(result.current.bgSecondary).toBeDefined();
    expect(result.current.bgTertiary).toBeDefined();

    // These should all be different to create hierarchy
    const backgrounds = [
      result.current.bgPrimary,
      result.current.bgSecondary,
      result.current.bgTertiary,
    ];
    expect(new Set(backgrounds).size).toBeGreaterThan(1);
  });

  it("provides hover and active state colors for inputs", () => {
    const { result } = renderHook(() => useThemeColors(), { wrapper: Wrapper });

    // Should have different colors for different input states
    expect(result.current.inputBg).toBeDefined();
    expect(result.current.inputBgHover).toBeDefined();
    expect(result.current.inputBgFocus).toBeDefined();

    // Hover and focus should be different to indicate interactivity
    expect(result.current.inputBgHover).not.toBe(result.current.inputBg);
    expect(result.current.inputBgFocus).not.toBe(result.current.inputBg);
  });
});
