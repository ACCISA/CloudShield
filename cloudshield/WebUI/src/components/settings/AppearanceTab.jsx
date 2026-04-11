import { useState, useEffect } from "react";
import { useAppTheme } from "../../context/ThemeContext.jsx";
import { useThemeColors } from "../../hooks/useThemeColors.js";
import SaveButton from "../common/SaveButton/SaveButton.jsx";

const THEMES = [
  {
    value: "light",
    label: "Light",
    subtitle: "Always use light appearance",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.39.39-1.03 0-1.41l-1.06-1.06zm1.06-12.37l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06c.39-.39.39-1.03 0-1.41s-1.03-.39-1.41 0zM7.05 18.36l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06c.39-.39.39-1.03 0-1.41s-1.03-.39-1.41 0z" />
      </svg>
    ),
  },
  {
    value: "dark",
    label: "Dark",
    subtitle: "Always use dark appearance",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z" />
      </svg>
    ),
  },
  {
    value: "system",
    label: "System Default",
    subtitle: "Match your system settings",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M20 3H4v10c0 1.1.9 2 2 2h3v2H7v2h10v-2h-2v-2h3c1.1 0 2-.9 2-2V3zm-2 10H6V5h12v8z" />
      </svg>
    ),
  },
];

const LANGUAGES = [
  { value: "en-CA", label: "🇨🇦  English (Canada)" },
  { value: "en-US", label: "🇺🇸  English (United States)" },
  { value: "fr-CA", label: "🇨🇦  Français (Canada)" },
  { value: "fr-FR", label: "🇫🇷  Français (France)" },
  { value: "es-ES", label: "🇪🇸  Español" },
  { value: "de-DE", label: "🇩🇪  Deutsch" },
];

const ThemePreview = ({ theme, isPreviewing }) => {
  const isDark = theme === "dark";
  const isLight = theme === "light";

  return (
    <div
      style={{
        width: "100%",
        height: 80,
        backgroundColor: isLight ? "#FAFAFA" : "#161616",
        borderRadius: "6px",
        overflow: "hidden",
        padding: "8px",
        display: "flex",
        flexDirection: "column",
        gap: "4px",
        border: isPreviewing ? "2px solid var(--accent-color)" : "none",
        transition: "all 0.3s ease",
        boxSizing: "border-box",
      }}
    >
      <div style={{ display: "flex", gap: "4px" }}>
        <div
          style={{
            width: 40,
            height: 6,
            borderRadius: 2,
            backgroundColor: "#7c4dff",
            opacity: 0.8,
          }}
        />
        <div
          style={{
            width: 28,
            height: 6,
            borderRadius: 2,
            backgroundColor: "#ff5252",
            opacity: 0.7,
          }}
        />
        <div
          style={{
            width: 32,
            height: 6,
            borderRadius: 2,
            backgroundColor: "#ffab40",
            opacity: 0.7,
          }}
        />
      </div>
      {[1, 2, 3].map((r) => (
        <div
          key={r}
          style={{
            height: 6,
            borderRadius: 2,
            backgroundColor: isDark
              ? "rgba(255,255,255,0.08)"
              : "rgba(0,0,0,0.1)",
            width: r === 3 ? "65%" : "90%",
          }}
        />
      ))}
    </div>
  );
};

export default function AppearanceTab() {
  const { themeMode, updateTheme, previewTheme, clearPreview, previewMode } =
    useAppTheme();
  const themeColors = useThemeColors();
  const [selectedTheme, setSelectedTheme] = useState(themeMode);
  const [language, setLanguage] = useState(
    () => localStorage.getItem("cs_language") || "en-CA",
  );
  const [saved, setSaved] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (selectedTheme !== themeMode) {
      previewTheme(selectedTheme);
      setHasChanges(true);
    } else {
      clearPreview();
      setHasChanges(false);
    }
  }, [selectedTheme, themeMode, previewTheme, clearPreview]);

  const handleSave = () => {
    updateTheme(selectedTheme);
    localStorage.setItem("cs_language", language);
    setSaved(true);
    setHasChanges(false);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleCancel = () => {
    setSelectedTheme(themeMode);
    clearPreview();
    setHasChanges(false);
  };

  const isSaveDisabled = !hasChanges && selectedTheme === themeMode;

  return (
    <div>
      <p
        style={{
          color: themeColors.textPrimary,
          fontWeight: 700,
          fontSize: "1.1rem",
          margin: "0 0 4px 0",
        }}
      >
        Appearance
      </p>
      <p
        style={{
          color: themeColors.textSecondary,
          fontSize: "0.85rem",
          margin: "0 0 24px 0",
        }}
      >
        Change how the dashboard looks and feels
      </p>

      <hr
        style={{
          borderColor: themeColors.borderLight,
          borderStyle: "solid",
          borderWidth: "0 0 1px 0",
          margin: "0 0 24px 0",
        }}
      />

      {/* Dashboard Colour */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 32,
          marginBottom: 32,
        }}
      >
        <div style={{ width: 200, flexShrink: 0 }}>
          <p
            style={{
              color: themeColors.textPrimary,
              fontWeight: 600,
              fontSize: "0.95rem",
              margin: 0,
            }}
          >
            Dashboard colour
          </p>
          <p
            style={{
              color: themeColors.textSecondary,
              fontSize: "0.8rem",
              margin: "4px 0 0 0",
            }}
          >
            Change the colour of the dashboard
          </p>
          {previewMode && previewMode !== themeMode && (
            <p
              style={{
                color: "#ff9800",
                fontSize: "0.75rem",
                margin: "8px 0 0 0",
                fontWeight: 500,
              }}
            >
              Preview active
            </p>
          )}
        </div>

        <div style={{ display: "flex", gap: 16, flex: 1 }}>
          {THEMES.map(({ value, label, subtitle, icon }) => {
            const isSelected = selectedTheme === value;
            const isActive = themeMode === value;
            const isPreviewing = previewMode === value;

            return (
              <div
                key={value}
                onClick={() => setSelectedTheme(value)}
                style={{
                  flex: 1,
                  border: `2px solid ${isSelected ? "var(--accent-color)" : isPreviewing ? "rgba(255,152,0,0.5)" : themeColors.borderLight}`,
                  borderRadius: "12px",
                  padding: "12px",
                  cursor: "pointer",
                  backgroundColor: isSelected
                    ? themeColors.lightOverlay
                    : themeColors.surface,
                  transition: "all 0.2s ease",
                  position: "relative",
                }}
              >
                {isActive && !isSelected && (
                  <span
                    style={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                      backgroundColor: themeColors.textSecondary,
                      color: themeColors.bgPrimary,
                      fontSize: "0.65rem",
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: "4px",
                      opacity: 0.6,
                    }}
                  >
                    Current
                  </span>
                )}
                {isSelected && (
                  <span
                    style={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                      backgroundColor: themeColors.textPrimary,
                      color: themeColors.bgPrimary,
                      fontSize: "0.65rem",
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: "4px",
                    }}
                  >
                    {isPreviewing ? "Previewing" : "Selected"}
                  </span>
                )}

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 8,
                    color: themeColors.textSecondary,
                  }}
                >
                  {icon}
                  <span
                    style={{
                      color: themeColors.textSecondary,
                      fontSize: "0.8rem",
                    }}
                  >
                    {label}
                  </span>
                </div>

                <ThemePreview theme={value} isPreviewing={isPreviewing} />

                <p
                  style={{
                    color: themeColors.textPrimary,
                    fontWeight: 600,
                    fontSize: "0.85rem",
                    margin: "8px 0 0 0",
                  }}
                >
                  {label}
                </p>
                <p
                  style={{
                    color: themeColors.textSecondary,
                    fontSize: "0.75rem",
                    margin: "2px 0 0 0",
                  }}
                >
                  {subtitle}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <hr
        style={{
          borderColor: themeColors.borderLight,
          borderStyle: "solid",
          borderWidth: "0 0 1px 0",
          margin: "0 0 24px 0",
        }}
      />

      {/* Language */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 32,
          marginBottom: 32,
        }}
      >
        <div style={{ width: 200, flexShrink: 0 }}>
          <p
            style={{
              color: themeColors.textPrimary,
              fontWeight: 600,
              fontSize: "0.95rem",
              margin: 0,
            }}
          >
            Language
          </p>
          <p
            style={{
              color: themeColors.textSecondary,
              fontSize: "0.8rem",
              margin: "4px 0 0 0",
            }}
          >
            Default language for the dashboard
          </p>
        </div>

        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          style={{
            width: 300,
            backgroundColor: themeColors.surface,
            color: themeColors.textPrimary,
            borderRadius: "8px",
            border: `1px solid ${themeColors.borderLight}`,
            padding: "10px 12px",
            fontSize: "0.88rem",
            cursor: "pointer",
            outline: "none",
          }}
        >
          {LANGUAGES.map((lang) => (
            <option key={lang.value} value={lang.value}>
              {lang.label}
            </option>
          ))}
        </select>
      </div>

      <hr
        style={{
          borderColor: themeColors.borderLight,
          borderStyle: "solid",
          borderWidth: "0 0 1px 0",
          margin: "0 0 24px 0",
        }}
      />

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
        <SaveButton
          onClick={handleSave}
          disabled={isSaveDisabled}
          saved={saved}
        />

        {hasChanges && (
          <button
            onClick={handleCancel}
            style={{
              borderColor: themeColors.borderLight,
              color: themeColors.textPrimary,
              fontWeight: 600,
              borderRadius: "10px",
              border: `1px solid ${themeColors.borderLight}`,
              padding: "10px 28px",
              cursor: "pointer",
              background: "none",
              fontSize: "1rem",
            }}
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
