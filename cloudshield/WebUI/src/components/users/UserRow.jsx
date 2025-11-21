import React from "react";
import { Box, Checkbox, Typography, IconButton } from "@mui/material";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";

export default function UserRow({
  data,
  showTitle,
  showWorkstations,
  showGroups,
  showFiles,
  onEdit,
}) {
  const statusColor = data.status === "online" ? "#4ade80" : "red";

  const renderBubbles = (count) => (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.6 }}>
      <Box sx={{ position: "relative", width: 42, height: 20 }}>
        {[0, 10, 20].map((left, i) => (
          <Box
            key={i}
            sx={{
              width: 18,
              height: 18,
              borderRadius: "50%",
              backgroundColor: "#eee",
              position: "absolute",
              left,
              top: "50%",
              transform: "translateY(-50%)",
            }}
          />
        ))}
      </Box>
      <Typography sx={{ opacity: 0.9, fontSize: "0.85rem" }}>+ {count}</Typography>
    </Box>
  );

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "40px 1.6fr 1fr 1fr 1fr 1fr 60px",
        alignItems: "center",
        py: 2,
        px: 1,
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        "&:hover": { backgroundColor: "rgba(255,255,255,0.03)" },
      }}
    >
      <Checkbox sx={{ color: "#fff" }} />

      <Box>
        <Typography sx={{ fontWeight: 600 }}>{data.name}</Typography>
        <Typography sx={{ opacity: 0.65, fontSize: "0.75rem" }}>↳ {data.email}</Typography>
      </Box>

      {showTitle && <Typography>{data.title}</Typography>}
      {showWorkstations && renderBubbles(data.workstations)}
      {showGroups && renderBubbles(data.groups)}
      {showFiles && renderBubbles(data.files)}

      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <FiberManualRecordIcon sx={{ color: statusColor, fontSize: "12px" }} />
        <IconButton
          size="small"
          onClick={onEdit}
          sx={{ color: "#fff", "&:hover": { background: "rgba(255,255,255,0.06)" } }}
        >
          <EditOutlinedIcon fontSize="small" />
        </IconButton>
      </Box>
    </Box>
  );
}