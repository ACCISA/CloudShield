import { useState } from "react";
import {
  Box, Typography, TextField, Button, Checkbox, Chip,
  InputAdornment, Divider, IconButton,
} from "@mui/material";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import FilterListOutlinedIcon from "@mui/icons-material/FilterListOutlined";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import AccessTimeOutlinedIcon from "@mui/icons-material/AccessTimeOutlined";

const MOCK_INVOICES = Array.from({ length: 7 }, (_, i) => ({
  id: `inv-${i + 1}`,
  plan: "Pro",
  amount: "$100 CAD",
  date: "10/11/2025 11:36 pm",
  status: "Paid",
}));

export default function BillingTab() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState([]);

  const filtered = MOCK_INVOICES.filter((inv) =>
    inv.plan.toLowerCase().includes(search.toLowerCase())
  );

  const allSelected = selected.length === filtered.length && filtered.length > 0;

  const toggleAll = () => {
    setSelected(allSelected ? [] : filtered.map((i) => i.id));
  };

  const toggleOne = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  return (
    <Box>
      <Typography sx={{ color: "#fff", fontWeight: 700, fontSize: "1.1rem", mb: 0.5 }}>
        Billing Centre
      </Typography>
      <Typography sx={{ color: "#9E9E9E", fontSize: "0.85rem", mb: 3 }}>
        Manage your plan and billing details
      </Typography>

      <Divider sx={{ borderColor: "rgba(255,255,255,0.06)", mb: 3 }} />

      <Box
        sx={{
          backgroundColor: "#111",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: "14px",
          overflow: "hidden",
        }}
      >
        {/* Toolbar */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            padding: "16px 20px",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: "#9E9E9E" }}>
            <AccessTimeOutlinedIcon sx={{ fontSize: "1.1rem" }} />
            <Typography sx={{ color: "#fff", fontWeight: 600, fontSize: "0.95rem" }}>
              Billing History
            </Typography>
          </Box>

          <TextField
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Invoices"
            size="small"
            sx={{
              ml: "auto",
              width: 260,
              "& .MuiOutlinedInput-root": {
                backgroundColor: "#1a1a1a",
                borderRadius: "8px",
                color: "#fff",
                fontSize: "0.85rem",
                "& fieldset": { borderColor: "rgba(255,255,255,0.1)" },
                "&:hover fieldset": { borderColor: "rgba(255,255,255,0.2)" },
                "&.Mui-focused fieldset": { borderColor: "rgba(255,255,255,0.3)" },
              },
              "& input::placeholder": { color: "#666" },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchOutlinedIcon sx={{ color: "#666", fontSize: "1rem" }} />
                </InputAdornment>
              ),
            }}
          />

          <Button
            startIcon={<FilterListOutlinedIcon />}
            sx={{
              color: "#9E9E9E",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "8px",
              textTransform: "none",
              fontSize: "0.85rem",
              padding: "6px 14px",
              "&:hover": { backgroundColor: "rgba(255,255,255,0.05)" },
            }}
          >
            Filter
          </Button>

          <Button
            startIcon={<FileDownloadOutlinedIcon />}
            sx={{
              color: "#9E9E9E",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "8px",
              textTransform: "none",
              fontSize: "0.85rem",
              padding: "6px 14px",
              "&:hover": { backgroundColor: "rgba(255,255,255,0.05)" },
            }}
          >
            Download All
          </Button>
        </Box>

        {/* Table Header */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "40px 1fr 160px 220px 160px 48px",
            padding: "10px 20px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <Checkbox
            checked={allSelected}
            onChange={toggleAll}
            size="small"
            sx={{ color: "#555", "&.Mui-checked": { color: "#fff" }, padding: 0 }}
          />
          {["Invoice", "Amount", "Date", "Status", ""].map((h) => (
            <Typography key={h} sx={{ color: "#9E9E9E", fontSize: "0.8rem", fontWeight: 500 }}>
              {h}
            </Typography>
          ))}
        </Box>

        {/* Rows */}
        {filtered.map((inv, idx) => (
          <Box
            key={inv.id}
            sx={{
              display: "grid",
              gridTemplateColumns: "40px 1fr 160px 220px 160px 48px",
              padding: "14px 20px",
              alignItems: "center",
              backgroundColor: idx % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent",
              borderBottom: "1px solid rgba(255,255,255,0.04)",
              "&:hover": { backgroundColor: "rgba(255,255,255,0.04)" },
            }}
          >
            <Checkbox
              checked={selected.includes(inv.id)}
              onChange={() => toggleOne(inv.id)}
              size="small"
              sx={{ color: "#555", "&.Mui-checked": { color: "#fff" }, padding: 0 }}
            />
            <Typography sx={{ color: "#fff", fontSize: "0.9rem" }}>{inv.plan}</Typography>
            <Typography sx={{ color: "#fff", fontSize: "0.9rem" }}>{inv.amount}</Typography>
            <Typography sx={{ color: "#9E9E9E", fontSize: "0.85rem" }}>{inv.date}</Typography>
            <Chip
              label={`✓ ${inv.status}`}
              size="small"
              sx={{
                backgroundColor: "rgba(46,125,50,0.2)",
                color: "#66bb6a",
                border: "1px solid rgba(102,187,106,0.3)",
                borderRadius: "6px",
                fontSize: "0.78rem",
                fontWeight: 600,
                width: "fit-content",
              }}
            />
            <IconButton size="small" sx={{ color: "#9E9E9E", "&:hover": { color: "#fff" } }}>
              <DownloadOutlinedIcon sx={{ fontSize: "1rem" }} />
            </IconButton>
          </Box>
        ))}
      </Box>

      <Button
        variant="contained"
        disabled
        sx={{
          mt: 3,
          backgroundColor: "#fff",
          color: "#000",
          fontWeight: 600,
          borderRadius: "10px",
          textTransform: "none",
          padding: "10px 28px",
          "&:disabled": { backgroundColor: "#222", color: "#555" },
        }}
      >
        Save changes
      </Button>
    </Box>
  );
}