import { useState, useEffect } from "react";
import { Box, Typography, Button, MenuItem, Select, Divider } from "@mui/material";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import SettingsBrightnessOutlinedIcon from "@mui/icons-material/SettingsBrightnessOutlined";
import { useAppTheme } from "../../context/ThemeContext.jsx";

const THEMES = [
  { value: "light", label: "Light", subtitle: "Always use light appearance", Icon: LightModeOutlinedIcon },
  { value: "dark", label: "Dark", subtitle: "Always use dark appearance", Icon: DarkModeOutlinedIcon },
  { value: "system", label: "System Default", subtitle: "Match your system settings", Icon: SettingsBrightnessOutlinedIcon },
];

const LANGUAGES = [
  { value: "en-CA", label: "🇨🇦  English (Canada)" },
  { value: "en-US", label: "🇺🇸  English (United States)" },
  { value: "fr-CA", label: "🇨🇦  Français (Canada)" },
  { value: "fr-FR", label: "🇫🇷  Français (France)" },
  { value: "es-ES", label: "🇪🇸  Español" },
  { value: "de-DE", label: "🇩🇪  Deutsch" },
];

// Mini preview thumbnail for theme card
const ThemePreview = ({ theme, isPreviewing }) => {
  const isDark = theme === "dark";
  const isLight = theme === "light";
  
  return (
    <Box
      sx={{
        width: "100%",
        height: 80,
        bgcolor: isLight ? "#FAFAFA" : "#161616",
        borderRadius: "6px",
        overflow: "hidden",
        padding: "8px",
        display: "flex",
        flexDirection: "column",
        gap: "4px",
        border: isPreviewing ? "2px solid var(--accent-color)" : "none",
        transition: "all 0.3s ease",
      }}
    >
      {/* Fake top bar */}
      <Box sx={{ display: "flex", gap: "4px" }}>
        <Box sx={{ width: 40, height: 6, borderRadius: 1, bgcolor: "#7c4dff", opacity: 0.8 }} />
        <Box sx={{ width: 28, height: 6, borderRadius: 1, bgcolor: "#ff5252", opacity: 0.7 }} />
        <Box sx={{ width: 32, height: 6, borderRadius: 1, bgcolor: "#ffab40", opacity: 0.7 }} />
      </Box>
      {/* Fake rows */}
      {[1, 2, 3].map((r) => (
        <Box
          key={r}
          sx={{
            height: 6,
            borderRadius: 1,
            bgcolor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)",
            width: r === 3 ? "65%" : "90%",
          }}
        />
      ))}
    </Box>
  );
};

export default function AppearanceTab() {
  const { themeMode, updateTheme, previewTheme, clearPreview, previewMode } = useAppTheme();
  const [selectedTheme, setSelectedTheme] = useState(themeMode);
  const [language, setLanguage] = useState(
    () => localStorage.getItem("cs_language") || "en-CA"
  );
  const [saved, setSaved] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Apply preview when selectedTheme changes
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

  return (
    <Box>
      <Typography sx={{ color: "text.primary", fontWeight: 700, fontSize: "1.1rem", mb: 0.5 }}>
        Appearance
      </Typography>
      <Typography sx={{ color: "text.secondary", fontSize: "0.85rem", mb: 3 }}>
        Change how the dashboard looks and feels
      </Typography>

      <Divider sx={{ borderColor: "divider", mb: 3 }} />

      {/* Dashboard Colour */}
      <Box sx={{ display: "flex", alignItems: "flex-start", gap: 4, mb: 4 }}>
        <Box sx={{ width: 200, flexShrink: 0 }}>
          <Typography sx={{ color: "text.primary", fontWeight: 600, fontSize: "0.95rem" }}>
            Dashboard colour
          </Typography>
          <Typography sx={{ color: "text.secondary", fontSize: "0.8rem", mt: 0.5 }}>
            Change the colour of the dashboard
          </Typography>
          {previewMode && previewMode !== themeMode && (
            <Typography sx={{ color: "#ff9800", fontSize: "0.75rem", mt: 1, fontWeight: 500 }}>
              Preview active
            </Typography>
          )}
        </Box>

        <Box sx={{ display: "flex", gap: 2, flex: 1 }}>
          {THEMES.map(({ value, label, subtitle, Icon }) => {
            const isSelected = selectedTheme === value;
            const isActive = themeMode === value;
            const isPreviewing = previewMode === value;
            
            return (
              <Box
                key={value}
                onClick={() => setSelectedTheme(value)}
                sx={{
                  flex: 1,
                  border: "2px solid",
                  borderColor: isSelected ? "var(--accent-color)" : isPreviewing ? "rgba(255, 152, 0, 0.5)" : "divider",
                  borderRadius: "12px",
                  padding: "12px",
                  cursor: "pointer",
                  bgcolor: isSelected ? "action.hover" : "background.paper",
                  transition: "all 0.2s ease",
                  "&:hover": { borderColor: "var(--accent-color)" },
                  position: "relative",
                }}
              >
                {isActive && !isSelected && (
                  <Box
                    sx={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                      bgcolor: "text.secondary",
                      color: "background.paper",
                      fontSize: "0.65rem",
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: "4px",
                      opacity: 0.6,
                    }}
                  >
                    Current
                  </Box>
                )}
                {isSelected && (
                  <Box
                    sx={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                      bgcolor: "text.primary",
                      color: "background.paper",
                      fontSize: "0.65rem",
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: "4px",
                    }}
                  >
                    {isPreviewing ? "Previewing" : "Selected"}
                  </Box>
                )}

                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                  <Icon sx={{ fontSize: "1rem", color: "text.secondary" }} />
                  <Typography sx={{ color: "text.secondary", fontSize: "0.8rem" }}>{label}</Typography>
                </Box>

                <ThemePreview theme={value} isPreviewing={isPreviewing} />

                <Typography sx={{ color: "text.primary", fontWeight: 600, fontSize: "0.85rem", mt: 1 }}>
                  {label}
                </Typography>
                <Typography sx={{ color: "text.secondary", fontSize: "0.75rem" }}>{subtitle}</Typography>
              </Box>
            );
          })}
        </Box>
      </Box>

      <Divider sx={{ borderColor: "divider", mb: 3 }} />

      {/* Language */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 4, mb: 4 }}>
        <Box sx={{ width: 200, flexShrink: 0 }}>
          <Typography sx={{ color: "text.primary", fontWeight: 600, fontSize: "0.95rem" }}>
            Language
          </Typography>
          <Typography sx={{ color: "text.secondary", fontSize: "0.8rem", mt: 0.5 }}>
            Default language for the dashboard
          </Typography>
        </Box>

        <Select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          sx={{
            width: 300,
            bgcolor: "background.paper",
            color: "text.primary",
            borderRadius: "8px",
            "& .MuiOutlinedInput-notchedOutline": { borderColor: "divider" },
            "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "text.secondary" },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "text.primary" },
            "& .MuiSvgIcon-root": { color: "text.secondary" },
          }}
          MenuProps={{
            PaperProps: {
              sx: {
                bgcolor: "background.paper",
                border: "1px solid",
                borderColor: "divider",
                borderRadius: "10px",
                "& .MuiMenuItem-root": {
                  color: "text.primary",
                  fontSize: "0.88rem",
                  "&:hover": { bgcolor: "action.hover" },
                  "&.Mui-selected": { bgcolor: "action.selected" },
                },
              },
            },
          }}
        >
          {LANGUAGES.map((lang) => (
            <MenuItem key={lang.value} value={lang.value}>
              {lang.label}
            </MenuItem>
          ))}
        </Select>
      </Box>

      <Divider sx={{ borderColor: "divider", mb: 3 }} />

      {/* Action buttons */}
      <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={!hasChanges && selectedTheme === themeMode}
          sx={{
            bgcolor: "text.primary",
            color: "background.paper",
            fontWeight: 600,
            borderRadius: "10px",
            textTransform: "none",
            padding: "10px 28px",
            "&:hover": { 
              bgcolor: "text.secondary",
            },
            "&:disabled": {
              bgcolor: "text.secondary",
              opacity: 0.5,
              cursor: "not-allowed",
            },
          }}
        >
          {saved ? "Saved!" : (hasChanges ? "Save changes" : "Save changes")}
        </Button>
        
        {hasChanges && (
          <Button
            onClick={handleCancel}
            variant="outlined"
            sx={{
              borderColor: "divider",
              color: "text.primary",
              fontWeight: 600,
              borderRadius: "10px",
              textTransform: "none",
              padding: "10px 28px",
              "&:hover": { 
                borderColor: "text.primary",
                bgcolor: "action.hover",
              },
            }}
          >
            Cancel
          </Button>
        )}
      </Box>
    </Box>
  );
}
