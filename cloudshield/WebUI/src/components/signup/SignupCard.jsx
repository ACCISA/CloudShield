import { Paper, Box } from "@mui/material";
import { useThemeColors } from "../../hooks/useThemeColors.js";

export default function SignupCard({ children }) {
  const themeColors = useThemeColors();
  return (
    <Paper
      sx={{
        width: "100%",
        maxWidth: 420,
        margin: "16px auto",
        backgroundColor: themeColors.bgSecondary,
        borderRadius: "20px",
        border: `1px solid ${themeColors.borderLight}`,
        boxShadow: "0 24px 64px rgba(0,0,0,0.75)",
        padding: { xs: "20px", md: "24px" },
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        color: themeColors.text,
      }}
    >
      <Box sx={{ mb: 2 }}>
        <Box
          component="img"
          src={themeColors.isDark ? "/cloudshield_logo_white.png" : "/cloudshield_logo_black.png"}
          alt="Company Logo"
          sx={{
            width: 60,
            height: 60,
            borderRadius: "12px",
            objectFit: "contain",
          }}
        />
      </Box>

      <Box sx={{ width: "100%" }}>{children}</Box>
    </Paper>
  );
}