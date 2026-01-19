import React, { useState, useEffect, useMemo } from "react";
import { Box, Snackbar, Alert } from "@mui/material";

import UsersTable from "../components/users/UsersTable.jsx";

// Import dynamic components
import SearchField from "../components/common/SearchField/SearchField.jsx";
import CreateButton from "../components/common/CreateButton/CreateButton.jsx";
import RefreshButton from "../components/common/RefreshButton/RefreshButton.jsx";
import DisplayButton from "../components/common/DisplayButton/DisplayButton.jsx";
import FilterButton from "../components/common/FilterButton/FilterButton.jsx";
import CreateUserIcon from "../assets/CreateUserIcon.jsx";

export default function UsersPage() {
  const [users, setUsers] = useState([]);

  const [search, setSearch] = useState("");
  const [layout, setLayout] = useState("list");

  // Filter state using Sets for FilterButton
  const [activeFilters, setActiveFilters] = useState({
    status: new Set(),
  });

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

    // Apply status filters
    const statusFilters = activeFilters.status;
    if (statusFilters.size > 0) {
      out = out.filter((u) => statusFilters.has(u.status));
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
  }, [users, search, activeFilters, sortField, sortDir]);

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  // Filter configuration for FilterButton
  const filterGroups = [
    {
      id: "status",
      label: "Status",
      type: "checkbox",
      options: [
        { value: "online", label: "Online" },
        { value: "offline", label: "Offline" },
      ],
    },
  ];

  const handleFilterChange = (groupId, value, isActive) => {
    setActiveFilters((prev) => {
      const newFilters = { ...prev };
      const currentSet = new Set(newFilters[groupId] || []);

      if (isActive) {
        currentSet.add(value);
      } else {
        currentSet.delete(value);
      }

      newFilters[groupId] = currentSet;
      return newFilters;
    });
  };

  const handleMockDelete = (id) => {
    setUsers((p) => p.filter((u) => u.id !== id));
    openToast("User deleted");
  };

  const styles = {
    container: {
      display: "flex",
      flexDirection: "column",
    },
    toolbar: {
      display: "flex",
      justifyContent: "space-between",
      gap: "12px",
      flexWrap: "wrap",
    },
    leftActions: {
      display: "flex",
      gap: "10px",
      flex: "1 1 auto",
      flexWrap: "wrap",
    },
    rightActions: {
      display: "flex",
      gap: "10px",
    },
  };

  return (
    <div style={styles.container}>
      {/* Toolbar */}
      <div style={styles.toolbar}>
        {/* Left side: Search and buttons */}
        <div style={styles.leftActions}>
          <SearchField
            value={search}
            onChange={setSearch}
            placeholder="Search users"
            width="420px"
            showIcon={true}
            style={{
              flex: "1 1 260px",
              minWidth: "260px",
              maxWidth: "680px",
            }}
          />

          <DisplayButton layout={layout} onLayoutChange={setLayout} />

          <FilterButton
            filterGroups={filterGroups}
            activeFilters={activeFilters}
            onFilterChange={handleFilterChange}
          />
        </div>

        {/* Right side: Refresh and Create buttons */}
        <div style={styles.rightActions}>
          <RefreshButton onClick={mockFetchUsers} />

          <CreateButton
            icon={<CreateUserIcon width={16} height={16} color="#fff" />}
            buttonText="Create"
            onClick={() => {}}
          />
        </div>
      </div>

      <UsersTable
        users={filtered}
        showTitle={showTitle}
        showWorkstations={showWorkstations}
        showGroups={showGroups}
        showFiles={showFiles}
        onSort={toggleSort}
        sortField={sortField}
        sortDir={sortDir}
        onEdit={(u) => {}}
        onDelete={(u) => handleMockDelete(u.id)}
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
    </div>
  );
}
