import { useState } from "react";
import { Box, Typography, Button, MenuItem, Select, Divider } from "@mui/material";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import SettingsBrightnessOutlinedIcon from "@mui/icons-material/SettingsBrightnessOutlined";

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
const ThemePreview = ({ theme }) => {
  const isDark = theme === "dark" || theme === "system";
  return (
    <Box
      sx={{
        width: "100%",
        height: 80,
        backgroundColor: isDark ? "#1a1a1a" : "#f5f5f5",
        borderRadius: "6px",
        overflow: "hidden",
        padding: "8px",
        display: "flex",
        flexDirection: "column",
        gap: "4px",
      }}
    >
      {/* Fake top bar */}
      <Box sx={{ display: "flex", gap: "4px" }}>
        <Box sx={{ width: 40, height: 6, borderRadius: 1, backgroundColor: "#7c4dff", opacity: 0.8 }} />
        <Box sx={{ width: 28, height: 6, borderRadius: 1, backgroundColor: "#ff5252", opacity: 0.7 }} />
        <Box sx={{ width: 32, height: 6, borderRadius: 1, backgroundColor: "#ffab40", opacity: 0.7 }} />
      </Box>
      {/* Fake rows */}
      {[1, 2, 3].map((r) => (
        <Box
          key={r}
          sx={{
            height: 6,
            borderRadius: 1,
            backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)",
            width: r === 3 ? "65%" : "90%",
          }}
        />
      ))}
    </Box>
  );
};

export default function AppearanceTab() {
  const [selectedTheme, setSelectedTheme] = useState(
    () => localStorage.getItem("cs_theme") || "dark"
  );
  const [language, setLanguage] = useState(
    () => localStorage.getItem("cs_language") || "en-CA"
  );
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    localStorage.setItem("cs_theme", selectedTheme);
    localStorage.setItem("cs_language", language);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <Box>
      <Typography sx={{ color: "#fff", fontWeight: 700, fontSize: "1.1rem", mb: 0.5 }}>
        Appearance
      </Typography>
      <Typography sx={{ color: "#9E9E9E", fontSize: "0.85rem", mb: 3 }}>
        Change how the dashboard looks and feels
      </Typography>

      <Divider sx={{ borderColor: "rgba(255,255,255,0.06)", mb: 3 }} />

      {/* Dashboard Colour */}
      <Box sx={{ display: "flex", alignItems: "flex-start", gap: 4, mb: 4 }}>
        <Box sx={{ width: 200, flexShrink: 0 }}>
          <Typography sx={{ color: "#fff", fontWeight: 600, fontSize: "0.95rem" }}>
            Dashboard colour
          </Typography>
          <Typography sx={{ color: "#9E9E9E", fontSize: "0.8rem", mt: 0.5 }}>
            Change the colour of the dashboard
          </Typography>
        </Box>

        <Box sx={{ display: "flex", gap: 2, flex: 1 }}>
          {THEMES.map(({ value, label, subtitle, Icon }) => {
            const active = selectedTheme === value;
            return (
              <Box
                key={value}
                onClick={() => setSelectedTheme(value)}
                sx={{
                  flex: 1,
                  border: active
                    ? "2px solid rgba(255,255,255,0.5)"
                    : "2px solid rgba(255,255,255,0.08)",
                  borderRadius: "12px",
                  padding: "12px",
                  cursor: "pointer",
                  backgroundColor: active ? "rgba(255,255,255,0.04)" : "#111",
                  transition: "all 0.2s ease",
                  "&:hover": { borderColor: "rgba(255,255,255,0.25)" },
                  position: "relative",
                }}
              >
                {active && (
                  <Box
                    sx={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                      backgroundColor: "#fff",
                      color: "#000",
                      fontSize: "0.65rem",
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: "4px",
                    }}
                  >
                    Active
                  </Box>
                )}

                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                  <Icon sx={{ fontSize: "1rem", color: "#9E9E9E" }} />
                  <Typography sx={{ color: "#9E9E9E", fontSize: "0.8rem" }}>{label}</Typography>
                </Box>

                <ThemePreview theme={value} />

                <Typography sx={{ color: "#fff", fontWeight: 600, fontSize: "0.85rem", mt: 1 }}>
                  {label}
                </Typography>
                <Typography sx={{ color: "#9E9E9E", fontSize: "0.75rem" }}>{subtitle}</Typography>
              </Box>
            );
          })}
        </Box>
      </Box>

      <Divider sx={{ borderColor: "rgba(255,255,255,0.06)", mb: 3 }} />

      {/* Language */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 4, mb: 4 }}>
        <Box sx={{ width: 200, flexShrink: 0 }}>
          <Typography sx={{ color: "#fff", fontWeight: 600, fontSize: "0.95rem" }}>
            Language
          </Typography>
          <Typography sx={{ color: "#9E9E9E", fontSize: "0.8rem", mt: 0.5 }}>
            Default language for the dashboard
          </Typography>
        </Box>

        <Select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          sx={{
            width: 300,
            backgroundColor: "#161616",
            color: "#fff",
            borderRadius: "8px",
            "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.12)" },
            "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.25)" },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.4)" },
            "& .MuiSvgIcon-root": { color: "#9E9E9E" },
          }}
          MenuProps={{
            PaperProps: {
              sx: {
                backgroundColor: "#1a1a1a",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "10px",
                "& .MuiMenuItem-root": {
                  color: "#fff",
                  fontSize: "0.88rem",
                  "&:hover": { backgroundColor: "rgba(255,255,255,0.06)" },
                  "&.Mui-selected": { backgroundColor: "rgba(255,255,255,0.08)" },
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

      <Divider sx={{ borderColor: "rgba(255,255,255,0.06)", mb: 3 }} />

      <Button
        onClick={handleSave}
        variant="contained"
        sx={{
          backgroundColor: "#fff",
          color: "#000",
          fontWeight: 600,
          borderRadius: "10px",
          textTransform: "none",
          padding: "10px 28px",
          "&:hover": { backgroundColor: "#e0e0e0" },
        }}
      >
        {saved ? "Saved!" : "Save changes"}
      </Button>
    </Box>
  );
}