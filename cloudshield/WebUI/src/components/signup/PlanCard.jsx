import { Box, Typography } from "@mui/material";

export default function PlanCard({ plan, selected, onSelect }) {
  return (
    <Box
      onClick={() => onSelect(plan.id)}
      sx={{
        flex: "1 1 260px",
        maxWidth: 300,
        backgroundColor: "#111111",
        borderRadius: "16px",
        border: selected
          ? "2px solid #4ade80"
          : "1px solid rgba(255,255,255,0.12)",
        padding: "16px 18px",
        color: "#ffffff",
        cursor: "pointer",
        transition: "0.2s ease-out",
        boxShadow: selected
          ? "0 0 18px rgba(74,222,128,0.35)"
          : "0 14px 32px rgba(0,0,0,0.6)",
        "&:hover": {
          backgroundColor: "#151515",
        },
      }}
    >
      <Typography sx={{ fontSize: "1.4rem", fontWeight: 600 }}>
        ${plan.price}
      </Typography>

      <Typography sx={{ opacity: 0.6, mb: 1 }}>/ Per Month</Typography>

      <Typography sx={{ fontSize: "1.05rem", fontWeight: 600 }}>
        {plan.name}
        {plan.tag && (
          <Box
            component="span"
            sx={{
              ml: 1,
              backgroundColor: "#4ade80",
              color: "#000",
              px: 0.75,
              py: 0.25,
              borderRadius: "999px",
              fontSize: "0.7rem",
              fontWeight: 700,
            }}
          >
            {plan.tag}
          </Box>
        )}
      </Typography>

      <Typography
        sx={{
          opacity: 0.7,
          mt: 1,
          mb: 1.5,
          fontSize: "0.9rem",
          lineHeight: 1.4,
        }}
      >
        {plan.description}
      </Typography>

      <Box sx={{ borderBottom: "1px solid rgba(255,255,255,0.12)", mb: 1.5 }} />

      <Typography sx={{ fontWeight: 600, mb: 0.75, fontSize: "0.9rem" }}>
        Features:
      </Typography>

      {plan.features.map((f) => (
        <Typography key={f} sx={{ fontSize: "0.8rem", opacity: 0.85 }}>
          ✓ {f}
        </Typography>
      ))}
    </Box>
  );
}