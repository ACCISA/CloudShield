import { Box, Typography } from "@mui/material";
import UserRow from "./UserRow.jsx";

export default function UsersTable({
  users,
  showTitle,
  showWorkstations,
  showGroups,
  showFiles,
  onSort,
  sortField,
  sortDir,
  onEdit,
}) {
  const SortHeader = ({ label, field }) => (
    <Typography
      sx={{
        cursor: "pointer",
        opacity: 0.8,
        "&:hover": { opacity: 1 },
        display: "flex",
        alignItems: "center",
        gap: "6px",
        userSelect: "none",
      }}
      onClick={() => onSort(field)}
    >
      {label}
      {sortField === field && (sortDir === "asc" ? "▲" : "▼")}
    </Typography>
  );

  return (
    <>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "40px 1.6fr 1fr 1fr 1fr 1fr 60px",
          px: 1,
          mb: 1,
          opacity: 0.75,
        }}
      >
        <Box />
        <SortHeader label="Name/Email" field="name" />
        {showTitle && <SortHeader label="Title" field="title" />}
        {showWorkstations && <SortHeader label="Workstations" field="workstations" />}
        {showGroups && <SortHeader label="Groups" field="groups" />}
        {showFiles && <SortHeader label="Files" field="files" />}
        <Box />
      </Box>

      <Box
        sx={{
          borderRadius: "20px",
          border: "1px solid rgba(255,255,255,0.16)",
          backgroundColor: "#0F0F0F",
          p: 1,
        }}
      >
        {users.map((u) => (
          <UserRow
            key={u.id}
            data={u}
            showTitle={showTitle}
            showWorkstations={showWorkstations}
            showGroups={showGroups}
            showFiles={showFiles}
            onEdit={() => onEdit(u)}
          />
        ))}
      </Box>
    </>
  );
}