import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
} from "react";
import { createTheme, ThemeProvider } from "@mui/material/styles";

// Theme palette definitions
const LIGHT_PALETTE = {
  mode: "light",
  background: {
    default: "#FFFFFF",
    paper: "#FFFFFF",
  },
  text: {
    primary: "#111827",
    secondary: "#6B7280",
  },
  divider: "rgba(0, 0, 0, 0.08)",
  action: {
    hover: "rgba(0, 0, 0, 0.06)",
    selected: "rgba(0, 0, 0, 0.08)",
  },
  primary: {
    main: "#111827",
  },
  success: {
    main: "#2e7d32",
  },
  error: {
    main: "#d32f2f",
  },
};

const DARK_PALETTE = {
  mode: "dark",
  background: {
    default: "#0A0A0A",
    paper: "#111111",
  },
  text: {
    primary: "#FFFFFF",
    secondary: "#9E9E9E",
  },
  divider: "rgba(255, 255, 255, 0.12)",
  action: {
    hover: "rgba(255, 255, 255, 0.08)",
    selected: "rgba(255, 255, 255, 0.12)",
  },
  primary: {
    main: "#000000",
  },
  success: {
    main: "#2e7d32",
  },
  error: {
    main: "#d32f2f",
  },
};

// Create theme with component overrides
const createAppTheme = (palette) => {
  const inputBg = palette.mode === "dark" ? "#161616" : "#FAFAFA";
  const inputBorder =
    palette.mode === "dark" ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.18)";

  return createTheme({
    palette,
    shape: {
      borderRadius: 12,
    },
    typography: {
      fontFamily: `'Inter', system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif`,
      body1: {
        fontSize: "0.95rem",
        lineHeight: 1.4,
      },
    },
    components: {
      MuiPaper: {
        styleOverrides: {
          rounded: {
            borderRadius: "20px",
            backgroundColor: palette.background.paper,
            border: `1px solid ${palette.mode === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            backgroundColor: inputBg,
            borderRadius: "8px",
            border: `1px solid ${inputBorder}`,
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            backgroundColor: inputBg,
            borderRadius: "8px",
            color: palette.text.primary,
          },
          notchedOutline: {
            borderColor: inputBorder,
          },
          input: {
            fontSize: "0.95rem",
            paddingTop: "12px",
            paddingBottom: "12px",
          },
        },
      },
      MuiInputLabel: {
        styleOverrides: {
          root: {
            color: palette.text.primary,
            fontSize: "0.9rem",
            lineHeight: 1.2,
            marginBottom: "6px",
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: "none",
            fontSize: "1rem",
            fontWeight: 500,
            borderRadius: "14px",
            lineHeight: 1.3,
            paddingTop: "14px",
            paddingBottom: "14px",
            ...(palette.mode === "light"
              ? {
                  backgroundColor: "#FFFFFF",
                  color: "#111827",
                  border: "1px solid rgba(0, 0, 0, 0.14)",
                  boxShadow: "none",
                  "&:hover": {
                    backgroundColor: "#F3F4F6",
                    boxShadow: "none",
                  },
                }
              : {}),
          },
        },
      },
      MuiTabs: {
        styleOverrides: {
          root: {
            "& .MuiTab-root": {
              color: palette.text.secondary,
            },
            "& .Mui-selected": {
              color: palette.text.primary,
            },
          },
        },
      },
    },
  });
};

const getPalette = (theme) =>
  theme === "dark" ? DARK_PALETTE : LIGHT_PALETTE;

const ThemeContext = createContext();

export const ThemeProvider_Custom = ({ children }) => {
  const [themeMode, setThemeMode] = useState(() => {
    // Load from localStorage or default to 'dark'
    const saved = localStorage.getItem("cs_theme_mode");
    return saved || "dark";
  });

  const [previewMode, setPreviewMode] = useState(null); // null means no preview, otherwise shows the preview mode

  // Detect system theme preference
  const [systemTheme, setSystemTheme] = useState(() => {
    if (typeof window !== "undefined" && window.matchMedia) {
      return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }
    return "dark";
  });

  // Listen to system theme changes
  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia) {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleChange = (e) => {
        setSystemTheme(e.matches ? "dark" : "light");
      };

      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
  }, []);

  // Determine effective theme (considering preview)
  const effectiveTheme = useMemo(() => {
    if (previewMode) {
      return previewMode;
    }
    if (themeMode === "system") {
      return systemTheme;
    }
    return themeMode;
  }, [themeMode, previewMode, systemTheme]);

  // Create MUI theme
  const muiTheme = useMemo(() => {
    return createAppTheme(getPalette(effectiveTheme));
  }, [effectiveTheme]);

  // Update CSS variables for non-MUI components
  useEffect(() => {
    const palette = getPalette(effectiveTheme);
    const root = document.documentElement;

    // Primary colors
    root.style.setProperty("--bg-primary", palette.background.default);
    root.style.setProperty("--bg-secondary", palette.background.paper);
    root.style.setProperty("--text-primary", palette.text.primary);
    root.style.setProperty("--text-secondary", palette.text.secondary);
    root.style.setProperty("--divider", palette.divider);

    // Action colors
    root.style.setProperty("--action-hover", palette.action.hover);
    root.style.setProperty("--action-selected", palette.action.selected);

    // Additional colors for components
    root.style.setProperty("--accent-color", palette.text.primary);
    root.style.setProperty(
      "--input-bg",
      effectiveTheme === "dark" ? "#161616" : "#F9FAFB",
    );
    root.style.setProperty(
      "--input-border",
      effectiveTheme === "dark" ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.14)",
    );
    root.style.setProperty(
      "--card-border",
      effectiveTheme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
    );

    // Border and overlay colors
    root.style.setProperty(
      "--border",
      effectiveTheme === "dark" ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.14)",
    );
    root.style.setProperty(
      "--border-light",
      effectiveTheme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.10)",
    );
    root.style.setProperty(
      "--lightOverlay",
      effectiveTheme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
    );
    root.style.setProperty(
      "--lightOverlaySubtle",
      effectiveTheme === "dark" ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)",
    );
    root.style.setProperty(
      "--bg-sidebar",
      effectiveTheme === "dark" ? "#0A0A0A" : "#F0F1F4",
    );
    root.style.setProperty(
      "--sidebar-icon-active",
      effectiveTheme === "dark" ? "#FFFFFF" : "#3B82F6",
    );
    root.style.setProperty(
      "--checkbox-checked-bg",
      effectiveTheme === "dark" ? "#FFFFFF" : "#1F2937",
    );
    root.style.setProperty(
      "--checkbox-checkmark-color",
      effectiveTheme === "dark" ? "#000000" : "#F9FAFB",
    );

    // Update body background for scrollbar and general styling
    document.body.style.backgroundColor = palette.background.default;
    document.body.style.color = palette.text.primary;
  }, [effectiveTheme]);

  const updateTheme = (mode) => {
    setThemeMode(mode);
    localStorage.setItem("cs_theme_mode", mode);
    setPreviewMode(null); // Clear preview when saving
  };

  const previewTheme = (mode) => {
    setPreviewMode(mode);
  };

  const clearPreview = () => {
    setPreviewMode(null);
  };

  const value = {
    themeMode,
    effectiveTheme,
    updateTheme,
    previewTheme,
    clearPreview,
    previewMode,
    muiTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      <ThemeProvider theme={muiTheme}>{children}</ThemeProvider>
    </ThemeContext.Provider>
  );
};

export const useAppTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useAppTheme must be used within ThemeProvider_Custom");
  }
  return context;
};
