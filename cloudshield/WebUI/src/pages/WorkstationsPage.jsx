import React, { useMemo, useState } from "react";
import WorkstationList from "../components/workstations/WorkstationList.jsx";
import WorkstationCreateDialog from "../components/workstations/WorkstationCreateDialog.jsx";
import WorkstationEditDialog from "../components/workstations/WorkstationEditDialog.jsx";
import { MOCK_WORKSTATIONS_FULL } from "../data/mockData.js";
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

const seed = MOCK_WORKSTATIONS_FULL;

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
          (v || "").toLowerCase().includes(q),
        ),
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
      prev.map((r) => (r.id === id ? { ...r, ...changes } : r)),
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
      }),
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
