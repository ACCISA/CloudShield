import { Paper, Box } from "@mui/material";
import Logo from "../../assets/cloudshield_logo_white.png";

export default function SignupCard({ children }) {
  return (
    <Paper
      sx={{
        width: "100%",
        maxWidth: 420,
        margin: "16px auto",
        backgroundColor: "#111111",
        borderRadius: "20px",
        border: "1px solid rgba(255,255,255,0.1)",
        boxShadow: "0 24px 64px rgba(0,0,0,0.75)",
        padding: { xs: "20px", md: "24px" },
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        color: "#fff",
      }}
    >
      <Box sx={{ mb: 2 }}>
        <Box
          component="img"
          src={Logo}
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