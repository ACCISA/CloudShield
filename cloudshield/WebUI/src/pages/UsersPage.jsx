import React, { useState, useEffect, useMemo } from "react";
import { Box, Snackbar, Alert } from "@mui/material";
import { useClickLogger } from "../hooks/useClickLogger";
import { trackButton } from "../lib/analytics";

import UsersTable from "../components/users/UsersTable.jsx";
import UserEditModal from "../components/users/UserEditModal.jsx";
import UserCreateModal from "../components/users/UserCreateModal.jsx";

// Import dynamic components
import SearchField from "../components/common/SearchField/SearchField.jsx";
import CreateButton from "../components/common/CreateButton/CreateButton.jsx";
import RefreshButton from "../components/common/RefreshButton/RefreshButton.jsx";
import DisplayButton from "../components/common/DisplayButton/DisplayButton.jsx";
import FilterButton from "../components/common/FilterButton/FilterButton.jsx";
import CreateUserIcon from "../assets/CreateUserIcon.jsx";

export default function UsersPage() {
  const withClickLog = useClickLogger({ page: "users" });
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const [editTarget, setEditTarget] = useState(null);

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
    const nextDir = sortField === field ? (sortDir === "asc" ? "desc" : "asc") : "asc";
    setSortField(field);
    setSortDir(nextDir);
    trackButton("users/table/sort", {
      page: "users",
      field,
      direction: nextDir,
      control: "table_header",
    });
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
    trackButton("users/filter/change", {
      page: "users",
      groupId,
      value,
      active: isActive,
      control: "filter_button",
    });
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

  const handleLayoutChange = (value) => {
    trackButton("users/display/toggle", { page: "users", layout: value, control: "display_button" });
    setLayout(value);
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

          <DisplayButton layout={layout} onLayoutChange={handleLayoutChange} />

          <FilterButton
            filterGroups={filterGroups}
            activeFilters={activeFilters}
            onFilterChange={handleFilterChange}
          />
        </div>

        {/* Right side: Refresh and Create buttons */}
        <div style={styles.rightActions}>
          <RefreshButton
            onClick={withClickLog({ name: "users/toolbar/refresh", control: "refresh_button" })(mockFetchUsers)}
          />

          <CreateButton
            icon={<CreateUserIcon width={16} height={16} color="#fff" />}
            buttonText="Create"
            onClick={withClickLog({
              name: "users/toolbar/open-create",
              control: "create_button",
            })(() => setCreateModalOpen(true))}
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
        onEdit={(u) => {
          setEditTarget(u);
          setEditModalOpen(true);
        }}
        onDelete={(u) => handleMockDelete(u.id)}
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
    </div>
  );
}
