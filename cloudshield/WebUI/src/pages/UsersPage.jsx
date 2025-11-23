import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  OutlinedInput,
  IconButton,
  Button,
  Popover,
  Typography,
  Snackbar,
  Alert,
} from "@mui/material";

import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import TuneOutlinedIcon from "@mui/icons-material/TuneOutlined";
import FilterListOutlinedIcon from "@mui/icons-material/FilterListOutlined";
import RefreshOutlinedIcon from "@mui/icons-material/RefreshOutlined";
import AddOutlinedIcon from "@mui/icons-material/AddOutlined";

import UsersTable from "../components/users/UsersTable.jsx";
import UserEditModal from "../components/users/UserEditModal.jsx";
import UserCreateModal from "../components/users/UserCreateModal.jsx";

export default function UsersPage() {
  const [anchorDisplay, setAnchorDisplay] = useState(null);
  const [anchorFilter, setAnchorFilter] = useState(null);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const [editTarget, setEditTarget] = useState(null);

  const [users, setUsers] = useState([]);

  const [search, setSearch] = useState("");
  const [filterOnline, setFilterOnline] = useState(false);
  const [filterOffline, setFilterOffline] = useState(false);

  const [showTitle, setShowTitle] = useState(true);
  const [showWorkstations, setShowWorkstations] = useState(true);
  const [showGroups, setShowGroups] = useState(true);
  const [showFiles, setShowFiles] = useState(true);

  const [sortField, setSortField] = useState("name");
  const [sortDir, setSortDir] = useState("asc");

  const [toast, setToast] = useState({ open: false, msg: "", type: "success" });

  const openToast = (msg, type = "success") =>
    setToast({ open: true, msg, type });

  const mockFetchUsers = async () => {
    const mock = [
      {
        id: "1",
        name: "aniss tralala",
        email: "aniss@tralala.com",
        title: "Regional Manager",
        workstations: 3,
        groups: 3,
        files: 3,
        status: "online",
      },
      {
        id: "2",
        name: "john tralala",
        email: "john@cloudshield.com",
        title: "Cuisinier",
        workstations: 2,
        groups: 2,
        files: 1,
        status: "offline",
      },
    ];
    setUsers(mock);
  };

  useEffect(() => {
    mockFetchUsers();
  }, []);

  const filtered = useMemo(() => {
    let out = [...users];
    const q = search.trim().toLowerCase();

    if (q) {
      out = out.filter((u) =>
        [u.name, u.email, u.title].some((v) => v.toLowerCase().includes(q))
      );
    }

    if (filterOnline && !filterOffline) {
      out = out.filter((u) => u.status === "online");
    } else if (filterOffline && !filterOnline) {
      out = out.filter((u) => u.status === "offline");
    }

    out.sort((a, b) => {
      const va = a[sortField] ?? "";
      const vb = b[sortField] ?? "";

      if (typeof va === "string") {
        return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      return sortDir === "asc" ? va - vb : vb - va;
    });

    return out;
  }, [users, search, filterOnline, filterOffline, sortField, sortDir]);

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const pillStyle = {
    color: "#fff",
    borderColor: "rgba(255,255,255,0.18)",
    borderRadius: "12px",
    textTransform: "none",
    px: 1.2,
    height: 36,
    "&:hover": {
      borderColor: "rgba(255,255,255,0.32)",
      background: "rgba(255,255,255,0.07)",
    },
  };

  const handleMockCreate = (payload) => {
    const newUser = {
      id: String(Date.now()),
      name: `${payload.firstName} ${payload.lastName}`,
      email: payload.email,
      title: payload.jobTitle,
      workstations: 1,
      groups: 1,
      files: 1,
      status: "offline",
    };
    setUsers((p) => [...p, newUser]);
    openToast("User created successfully");
  };

  const handleMockUpdate = (id, payload) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === id
          ? {
              ...u,
              name: `${payload.firstName} ${payload.lastName}`,
              email: payload.email,
              title: payload.jobTitle,
            }
          : u
      )
    );
    openToast("User updated successfully");
  };

  const handleMockDelete = (id) => {
    setUsers((p) => p.filter((u) => u.id !== id));
    openToast("User deleted");
  };

  return (
    <Box sx={{ width: "100%", color: "#fff", mt: 5 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          mb: 3,
          flexWrap: "wrap",
          gap: 2,
        }}
      >
        <Box sx={{ display: "flex", gap: 1.5 }}>
          <OutlinedInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users"
            startAdornment={
              <SearchOutlinedIcon
                sx={{ color: "rgba(255,255,255,0.7)", fontSize: "1rem", mr: 1 }}
              />
            }
            sx={{
              width: 220,
              backgroundColor: "#161616",
              borderRadius: "12px",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.18)",
              "& .MuiOutlinedInput-notchedOutline": { border: "none" },
            }}
          />

          <Button
            variant="outlined"
            sx={pillStyle}
            startIcon={<TuneOutlinedIcon />}
            onClick={(e) => setAnchorDisplay(e.currentTarget)}
          >
            Display
          </Button>

          <Button
            variant="outlined"
            sx={pillStyle}
            startIcon={<FilterListOutlinedIcon />}
            onClick={(e) => setAnchorFilter(e.currentTarget)}
          >
            Filter
          </Button>
        </Box>

        <Box sx={{ display: "flex", gap: 1 }}>
          <IconButton
            onClick={mockFetchUsers}
            sx={{
              color: "#fff",
              backgroundColor: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.16)",
              width: 38,
              height: 38,
              borderRadius: "10px",
            }}
          >
            <RefreshOutlinedIcon />
          </IconButton>

          <Button
            startIcon={<AddOutlinedIcon />}
            onClick={() => setCreateModalOpen(true)}
            sx={{
              color: "#fff",
              backgroundColor: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: "12px",
              px: 2,
              height: 38,
            }}
          >
            Create
          </Button>
        </Box>
      </Box>

      <UsersTable
        users={filtered}
        showTitle={showTitle}
        showWorkstations={showWorkstations}
        showGroups={showGroups}
        showFiles={showFiles}
        onSort={toggleSort}
        sortField={sortField}
        sortDir={sortDir}
        onEdit={(u) => {
          setEditTarget(u);
          setEditModalOpen(true);
        }}
      />

      <UserEditModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        data={editTarget}
        onSubmit={(payload) => handleMockUpdate(editTarget.id, payload)}
        onDelete={() => handleMockDelete(editTarget.id)}
      />

      <UserCreateModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSubmit={handleMockCreate}
      />

      <Snackbar
        open={toast.open}
        autoHideDuration={2800}
        onClose={() => setToast({ ...toast, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          variant="filled"
          severity={toast.type}
          sx={{
            borderRadius: "12px",
            fontSize: "1rem",
            boxShadow: "0 8px 20px rgba(0,0,0,0.35)",
          }}
        >
          {toast.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
