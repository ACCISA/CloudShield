import React, { useMemo, useState } from "react";
import WorkstationList from "../components/workstations/WorkstationList.jsx";
import WorkstationCreateDialog from "../components/workstations/WorkstationCreateDialog.jsx";
import WorkstationEditDialog from "../components/workstations/WorkstationEditDialog.jsx";
import CreateButton from "../components/common/CreateButton/CreateButton.jsx";
import SearchField from "../components/common/SearchField/SearchField.jsx";
import DisplayButton from "../components/common/DisplayButton/DisplayButton.jsx";
import FilterButton from "../components/common/FilterButton/FilterButton.jsx";
import RefreshButton from "../components/common/RefreshButton/RefreshButton.jsx";
import CreateWorkstationIcon from "../assets/CreateWorkstationIcon.jsx";
import { WORKSTATION_FILTERS } from "../config/filterConfigs.js";

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
/* ----------------------------------- seed ---------------------------------- */

const seed = [
  {
    id: "ws-1",
    name: "Development-WS-001",
    hostname: "DEV-WS-001",
    code: "WS-001",
    usersCount: 3,
    users: [
      {
        firstName: "Jim",
        lastName: "Halpert",
        active: true,
        title: "Sales Representative",
        email: "jim@dundermifflin.com",
      },
      {
        firstName: "Pam",
        lastName: "Beasly",
        active: true,
        title: "Receptionist",
        email: "pam@dundermifflin.com",
      },
      {
        firstName: "Dwight",
        lastName: "Schrute",
        active: true,
        title: "Assistant Regional Manager",
        email: "dwight@dundermifflin.com",
      },
    ],
    currentUser: {
      firstName: "Jim",
      lastName: "Halpert",
      active: true,
      title: "Sales Representative",
      email: "jim@dundermifflin.com",
    },
    lastUsed: "03/11/2025",
    status: "connected",
    online: true,
    ipAddress: "192.168.1.101",
    operatingSystem: "Windows 11 Pro",
    assignedUser: "Jim Halpert",
    lastSeen: "2026-01-15T10:30:00Z",
  },
  {
    id: "ws-2",
    name: "Marketing-WS-002",
    hostname: "MKT-WS-002",
    code: "WS-002",
    usersCount: 2,
    users: [
      {
        firstName: "Pam",
        lastName: "Beasly",
        active: true,
        title: "Receptionist",
        email: "pam@dundermifflin.com",
      },
      {
        firstName: "Michael",
        lastName: "Scott",
        active: true,
        title: "Regional Manager",
        email: "michael@dundermifflin.com",
      },
    ],
    currentUser: {
      firstName: "Pam",
      lastName: "Beasly",
      active: true,
      title: "Receptionist",
      email: "pam@dundermifflin.com",
    },
    lastUsed: "—",
    status: "busy",
    online: true,
    ipAddress: "192.168.1.102",
    operatingSystem: "Windows 10 Pro",
    assignedUser: "Pam Beasly",
    lastSeen: "2026-01-15T09:15:00Z",
  },
  {
    id: "ws-3",
    name: "Sales-WS-003",
    hostname: "SALES-WS-003",
    code: "WS-003",
    usersCount: 3,
    users: [
      {
        firstName: "Jim",
        lastName: "Halpert",
        active: true,
        title: "Sales Representative",
        email: "jim@dundermifflin.com",
      },
      {
        firstName: "Dwight",
        lastName: "Schrute",
        active: true,
        title: "Assistant Regional Manager",
        email: "dwight@dundermifflin.com",
      },
      {
        firstName: "Michael",
        lastName: "Scott",
        active: true,
        title: "Regional Manager",
        email: "michael@dundermifflin.com",
      },
    ],
    currentUser: {
      firstName: "Jim",
      lastName: "Halpert",
      active: true,
      title: "Sales Representative",
      email: "jim@dundermifflin.com",
    },
    lastUsed: "03/11/2025",
    status: "connected",
    online: true,
    ipAddress: "192.168.1.103",
    operatingSystem: "Windows 11 Pro",
    assignedUser: "Jim Halpert",
    lastSeen: "2026-01-15T10:45:00Z",
  },
  {
    id: "ws-4",
    name: "Accounting-WS-004",
    hostname: "ACCT-WS-004",
    code: "WS-004",
    usersCount: 2,
    users: [
      {
        firstName: "Angela",
        lastName: "Martin",
        active: true,
        title: "Senior Accountant",
        email: "angela@dundermifflin.com",
        profileImage: "https://i.pravatar.cc/150?img=5",
      },
      {
        firstName: "Kevin",
        lastName: "Malone",
        active: false,
        title: "Accountant",
        email: "kevin@dundermifflin.com",
      },
    ],
    currentUser: {
      firstName: "Angela",
      lastName: "Martin",
      active: true,
      title: "Senior Accountant",
      email: "angela@dundermifflin.com",
      profileImage: "https://i.pravatar.cc/150?img=5",
    },
    lastUsed: "03/10/2025",
    status: "disconnected",
    online: false,
    ipAddress: "192.168.1.104",
    operatingSystem: "macOS Sonoma",
    assignedUser: "Angela Martin",
    lastSeen: "2026-01-14T17:30:00Z",
  },
];

/* ---------------------------------- page ----------------------------------- */

export default function WorkstationsPage() {
  const [rows, setRows] = useState(seed);
  const [search, setSearch] = useState("");

  // Layout state
  const [layout, setLayout] = useState("list"); // 'cards', 'list', or 'icons'
  const [showUsersCol, setShowUsersCol] = useState(true);
  const [showCurrentCol, setShowCurrentCol] = useState(true);
  const [showLastUsedCol, setShowLastUsedCol] = useState(true);

  // Filter state
  const [activeFilters, setActiveFilters] = useState({
    status: new Set(),
    hasUsers: new Set(),
  });

  // dialogs
  const [openCreate, setOpenCreate] = useState(false);
  const [editRow, setEditRow] = useState(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    let data = rows;

    // text search
    if (q) {
      data = data.filter((r) =>
        [r.name, r.code, r.currentUser].some((v) =>
          (v || "").toLowerCase().includes(q)
        )
      );
    }

    // status filter
    const statusFilters = activeFilters.status || new Set();
    if (statusFilters.size > 0) {
      data = data.filter((r) => statusFilters.has(r.status));
    }

    // active users filter
    const hasUsersFilters = activeFilters.hasUsers || new Set();
    if (hasUsersFilters.has("activeUsers")) {
      data = data.filter((r) => (r.usersCount ?? 0) > 0);
    }

    return data;
  }, [rows, search, activeFilters]);

  const handleFilterChange = (groupId, value, isActive) => {
    setActiveFilters((prev) => {
      const newFilters = { ...prev };
      const groupFilters = new Set(prev[groupId] || new Set());

      if (isActive) {
        groupFilters.add(value);
      } else {
        groupFilters.delete(value);
      }

      newFilters[groupId] = groupFilters;
      return newFilters;
    });
  };

  const handleCreate = (payload) => {
    const newRow = {
      id: `ws-${Date.now()}`,
      name: payload.name,
      code: payload.code || "WS-NEW",
      usersCount: payload.users?.length || 0,
      users: payload.users || [],
      currentUser: payload.users?.[0] || "—",
      lastUsed: "—",
      status: "disconnected",
    };
    setRows((prev) => [newRow, ...prev]);
  };

  const handleEditSave = (id, changes) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...changes } : r))
    );
  };

  const handleDelete = (id) =>
    setRows((prev) => prev.filter((r) => r.id !== id));

  const handleToggleStatus = (id) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        if (r.status === "connected") return { ...r, status: "disconnected" };
        if (r.status === "disconnected") return { ...r, status: "connected" };
        return r; // busy unchanged
      })
    );
  };

  const handleLayoutChange = (newLayout) => {
    console.log(`Layout changed to: ${newLayout}`);
    setLayout(newLayout);
  };
  

  return (
    <div style={styles.container}>
      {/* Toolbar */}
      <div style={styles.toolbar}>
        {/* Left side: Search and buttons */}
        <div style={styles.leftActions}>
          <SearchField
            value={search}
            onChange={(value) => setSearch(value)}
            placeholder="Search workstations"
            width="420px"
            showIcon={true}
            style={{
              flex: "1 1 260px",
              minWidth: "260px",
              maxWidth: "680px",
            }}
          />

          {/* Display */}
          <DisplayButton layout={layout} onLayoutChange={handleLayoutChange} />

          {/* Filter */}
          <FilterButton
            filterGroups={WORKSTATION_FILTERS}
            activeFilters={activeFilters}
            onFilterChange={handleFilterChange}
          />
        </div>

        {/* Right side: Refresh and Create buttons */}
        <div style={styles.rightActions}>
          <RefreshButton onClick={() => console.log("refresh")} />

          <CreateButton
            icon={<CreateWorkstationIcon />}
            buttonText="Create"
            onClick={() => setOpenCreate(true)}
          />
        </div>
      </div>

      {/* Workstation List with Headers */}
      <WorkstationList
        rows={filtered}
        onEdit={(row) => setEditRow(row)}
        onDelete={handleDelete}
        onToggleStatus={handleToggleStatus}
        showUsers={showUsersCol}
        showCurrent={showCurrentCol}
        showLastUsed={showLastUsedCol}
      />

      {/* Create dialog */}
      <WorkstationCreateDialog
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        onCreate={(payload) => {
          handleCreate(payload);
          setOpenCreate(false);
        }}
      />

      {/* Edit dialog */}
      {!!editRow && (
        <WorkstationEditDialog
          open
          row={editRow}
          onClose={() => setEditRow(null)}
          onSave={(changes) => {
            handleEditSave(editRow.id, changes);
            setEditRow(null);
          }}
          onDelete={() => {
            handleDelete(editRow.id);
            setEditRow(null);
          }}
        />
      )}
    </div>
  );
}
