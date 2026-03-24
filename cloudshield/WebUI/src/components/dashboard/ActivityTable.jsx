import React, { useMemo, useState } from "react";
import {
  Box,
  Paper,
  TablePagination,
  Typography,
  Avatar,
  InputBase,
  IconButton,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";
import ArrowDropUpIcon from "@mui/icons-material/ArrowDropUp";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import { format } from "date-fns";
import { useThemeColors } from "../../hooks/useThemeColors.js";

export default function ActivityTable({
  activities,
  loading,
  page,
  rowsPerPage,
  totalCount,
  onPageChange,
  onRowsPerPageChange,
  onRefresh,
}) {
  const themeColors = useThemeColors();
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("created_at");
  const [sortDir, setSortDir] = useState("desc");

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const filteredAndSorted = useMemo(() => {
    let data = [...activities];

    if (search) {
      data = data.filter((a) =>
        `${a.actor} ${a.description}`
          .toLowerCase()
          .includes(search.toLowerCase())
      );
    }

    data.sort((a, b) => {
      let aVal = a[sortKey];
      let bVal = b[sortKey];

      if (sortKey === "created_at") {
        aVal = new Date(aVal);
        bVal = new Date(bVal);
      }

      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return data;
  }, [activities, search, sortKey, sortDir]);

  const SortLabel = ({ label, field }) => (
    <Box
      onClick={() => handleSort(field)}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.5,
        cursor: "pointer",
        userSelect: "none",
        color: themeColors.textSecondary,
        "&:hover": { color: themeColors.text },
      }}
    >
      <Typography fontSize={13}>{label}</Typography>
      {sortKey === field &&
        (sortDir === "asc" ? (
          <ArrowDropUpIcon fontSize="small" />
        ) : (
          <ArrowDropDownIcon fontSize="small" />
        ))}
    </Box>
  );

  return (
    <Paper sx={{ bgcolor: themeColors.bgSecondary, borderRadius: 3 }}>
      <Box
        sx={{
          px: 3,
          py: 2,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: `1px solid ${themeColors.borderLight}`,
        }}
      >
        <Typography fontWeight={600}>Recent activity</Typography>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <IconButton
            size="small"
            onClick={onRefresh}
            disabled={loading}
          >
            <RefreshIcon
              sx={{
                color: loading ? themeColors.textDisabled : themeColors.textSecondary,
                animation: loading ? "spin 1s linear infinite" : "none",
              }}
            />
          </IconButton>

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              px: 1.5,
              py: 0.5,
              borderRadius: 2,
              border: `1px solid ${themeColors.border}`,
              "&:focus-within": {
                borderColor: themeColors.text,
              },
            }}
          >
            <SearchIcon sx={{ fontSize: 18, color: themeColors.textSecondary }} />
            <InputBase
              placeholder="Search activities"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ ml: 1, fontSize: 14, color: themeColors.text, width: 220 }}
            />
          </Box>
        </Box>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "220px 200px 1fr",
          px: 3,
          py: 1.5,
          color: themeColors.textSecondary,
        }}
      >
        <SortLabel label="Actor" field="actor" />
        <SortLabel label="Date" field="created_at" />
        <SortLabel label="Activity" field="description" />
      </Box>

      <Box sx={{ px: 2, pb: 2, display: "flex", flexDirection: "column", gap: 1 }}>
        {loading && (
          <Typography sx={{ textAlign: "center", color: themeColors.textSecondary, py: 4 }}>
            Loading activity…
          </Typography>
        )}

        {!loading && filteredAndSorted.length === 0 && (
          <Typography sx={{ textAlign: "center", color: themeColors.textSecondary, py: 4 }}>
            No activity found
          </Typography>
        )}

        {filteredAndSorted.map((row) => (
          <Box
            key={row.id}
            sx={{
              display: "grid",
              gridTemplateColumns: "220px 200px 1fr",
              alignItems: "center",
              px: 2,
              py: 1.5,
              borderRadius: 1.5,
              bgcolor: themeColors.bgTertiary,
              "&:hover": { bgcolor: themeColors.bgHover },
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Avatar sx={{ width: 32, height: 32 }}>
                {row.actor?.[0]?.toUpperCase() || "?"}
              </Avatar>
              <Typography fontSize={14}>{row.actor}</Typography>
            </Box>

            <Typography fontSize={13} sx={{ color: themeColors.textSecondary }}>
              {row.created_at
                ? format(new Date(row.created_at), "dd/MM/yyyy hh:mm a")
                : "-"}
            </Typography>

            <Typography fontSize={14} sx={{ color: themeColors.text }}>
              {row.description}
            </Typography>
          </Box>
        ))}
      </Box>

      <TablePagination
        component="div"
        count={totalCount}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={onPageChange}
        onRowsPerPageChange={onRowsPerPageChange}
        rowsPerPageOptions={[20, 50, 100]}
        sx={{
          color: themeColors.text,
          borderTop: `1px solid ${themeColors.borderLight}`,
          ".MuiTablePagination-selectIcon": { color: themeColors.text },
          ".MuiTablePagination-actions": { color: themeColors.text },
        }}
      />
    </Paper>
  );
}