import React from "react";
import { Box, Typography, Button, CircularProgress } from "@mui/material";

export default function SubscriptionPlanCard({ plan, isCurrent, isLoading, onUpgrade }) {
  return (
    <Box
      sx={{
        flex: "1 1 280px",
        maxWidth: 320,
        backgroundColor: "#111111",
        borderRadius: "16px",
        border: isCurrent ? "2px solid #4ade80" : "1px solid rgba(255,255,255,0.12)",
        padding: "24px",
        color: "#ffffff",
        display: "flex",
        flexDirection: "column",
        transition: "0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        boxShadow: isCurrent ? "0 0 24px rgba(74,222,128,0.2)" : "0 14px 32px rgba(0,0,0,0.6)",
        "&:hover": { transform: isCurrent ? "none" : "translateY(-4px)", backgroundColor: "#151515" }
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}>
        <Typography sx={{ fontSize: "1.6rem", fontWeight: 700 }}>${plan.price}</Typography>
        {isCurrent && (
          <Box sx={{ backgroundColor: "rgba(74, 222, 128, 0.1)", color: "#4ade80", border: "1px solid #4ade80", px: 1.5, py: 0.5, borderRadius: "999px", fontSize: "0.65rem", fontWeight: 800 }}>
            ACTIVE
          </Box>
        )}
      </Box>

      <Typography sx={{ opacity: 0.6, mb: 1.5, fontSize: "0.9rem" }}>/ Per Month</Typography>
      <Typography sx={{ fontSize: "1.1rem", fontWeight: 700, mb: 1 }}>{plan.name}</Typography>
      <Typography sx={{ opacity: 0.7, fontSize: "0.85rem", lineHeight: 1.5, mb: 2, minHeight: "45px" }}>{plan.description}</Typography>

      <Box sx={{ borderBottom: "1px solid rgba(255,255,255,0.08)", mb: 2 }} />

      <Box sx={{ flexGrow: 1, mb: 4 }}>
        {plan.features.map((f) => (
          <Typography key={f} sx={{ fontSize: "0.8rem", opacity: 0.85, mb: 0.8, display: "flex", alignItems: "center" }}>
            <Box component="span" sx={{ color: "#4ade80", mr: 1 }}>✓</Box> {f}
          </Typography>
        ))}
      </Box>

      <Button
        variant="contained" fullWidth disabled={isCurrent || isLoading} onClick={() => onUpgrade(plan)}
        sx={{
          py: 1.4, borderRadius: "10px", fontWeight: 800, textTransform: "none",
          bgcolor: isCurrent ? "rgba(255,255,255,0.03)" : "#4ade80",
          color: isCurrent ? "rgba(255,255,255,0.2)" : "#000",
          "&:hover": { bgcolor: isCurrent ? "rgba(255,255,255,0.03)" : "#3fb36a" }
        }}
      >
        {isLoading ? <CircularProgress size={22} sx={{ color: "#000" }} /> : isCurrent ? "Current Plan" : `Upgrade to ${plan.name}`}
      </Button>
    </Box>
  );
}