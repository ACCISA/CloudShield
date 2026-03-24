// A reusable layout component that provides a consistent page structure with an optional header section for title, subtitle, and actions, and a main content area that fills the remaining space.
// This component is used across various pages in the app to ensure a consistent look and feel while also handling layout concerns such as spacing and scroll behavior for the main content area.
import { Box, Typography } from "@mui/material";

export default function PageShell({ title, subtitle, actions, children, noPadding = false }) {
  return (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 3,          // consistent spacing
        p: noPadding ? 0 : 3,            // consistent page padding (disabled if noPadding is true)
        minHeight: 0,    // important for nested scroll areas
      }}
    >
      {(title || subtitle || actions) && (
        <Box
          sx={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 2,
          }}
        >
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, minWidth: 0 }}>
            {title ? (
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                {title}
              </Typography>
            ) : null}
            {subtitle ? (
              <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.65)" }}>
                {subtitle}
              </Typography>
            ) : null}
          </Box>

          {actions ? <Box sx={{ display: "flex", gap: 1 }}>{actions}</Box> : null}
        </Box>
      )}

      <Box sx={{ flex: 1, minHeight: 0 }}>
        {children}
      </Box>
    </Box>
  );
}