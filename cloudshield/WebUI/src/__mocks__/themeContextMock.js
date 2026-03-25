import React, { createContext, useContext, useMemo, useState } from "react";

const darkTheme = {
  palette: {
    mode: "dark",
    background: { default: "#0A0A0A", paper: "#111111" },
    text: { primary: "#FFFFFF", secondary: "#9E9E9E" },
    primary: { main: "#4F8CFF" },
    secondary: { main: "#8884d8" },
    success: { main: "#4CAF50" },
    warning: { main: "#FF9800" },
    error: { main: "#F44336" },
    divider: "#2A2A2A",
  },
};

const lightTheme = {
  palette: {
    mode: "light",
    background: { default: "#F7F7F7", paper: "#FFFFFF" },
    text: { primary: "#1B1B1B", secondary: "#616161" },
    primary: { main: "#2563EB" },
    secondary: { main: "#6B7280" },
    success: { main: "#16A34A" },
    warning: { main: "#D97706" },
    error: { main: "#DC2626" },
    divider: "#E5E7EB",
  },
};

const fallbackValue = {
  themeMode: "dark",
  previewMode: null,
  effectiveTheme: darkTheme,
  updateTheme: () => {},
  previewTheme: () => {},
  clearPreview: () => {},
};

export const ThemeContext = createContext(fallbackValue);

function BaseThemeProvider({ children }) {
  const [themeMode, setThemeMode] = useState("dark");
  const [previewMode, setPreviewMode] = useState(null);

  const effectiveTheme = useMemo(() => {
    const active = previewMode || themeMode;
    return active === "light" ? lightTheme : darkTheme;
  }, [themeMode, previewMode]);

  const value = useMemo(
    () => ({
      themeMode,
      previewMode,
      effectiveTheme,
      updateTheme: (next) => setThemeMode(next || "dark"),
      previewTheme: (next) => setPreviewMode(next || null),
      clearPreview: () => setPreviewMode(null),
    }),
    [themeMode, previewMode, effectiveTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const ThemeProvider = BaseThemeProvider;
export const ThemeProvider_Custom = BaseThemeProvider;

export function useAppTheme() {
  return useContext(ThemeContext) || fallbackValue;
}

