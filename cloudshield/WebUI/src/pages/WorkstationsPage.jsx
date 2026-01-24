import React, { useMemo, useState } from "react";
import WorkstationList from "../components/workstations/WorkstationList.jsx";
import WorkstationModal from "../components/workstations/WorkstationModal.jsx";
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
  const [openModal, setOpenModal] = useState(false);
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
      strength: payload.strength || "basic",
      code: payload.code || "WS-NEW",
      usersCount: payload.users?.length || 0,
      users: payload.users || [],
      currentUser: payload.users?.[0] || null,
      lastUsed: "—",
      status: "disconnected",
      image: payload.image,
      desktopBackground: payload.desktopBackground,
      wallpaper: payload.wallpaper,
      groups: payload.groups || [],
      software: payload.software || [],
      allUsers: payload.allUsers || false,
      allGroups: payload.allGroups || false,
      allSoftware: payload.allSoftware || false,
    };
    setRows((prev) => [newRow, ...prev]);
  };

  const handleEditSave = (id, changes) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const updated = { ...r, ...changes };
        // Recalculate usersCount if users array changed
        if (changes.users) {
          updated.usersCount = changes.users.length;
          updated.currentUser = changes.users[0] || null;
        }
        return updated;
      }),
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
          <DisplayButton
            layout={layout}
            onLayoutChange={handleLayoutChange}
            columnToggles={{
              columns: [
                { key: "showUsers", label: "Users", checked: showUsersCol },
                {
                  key: "showCurrent",
                  label: "Current",
                  checked: showCurrentCol,
                },
                {
                  key: "showLastUsed",
                  label: "Last Used",
                  checked: showLastUsedCol,
                },
              ],
              onToggle: (column) => {
                if (column === "showUsers") setShowUsersCol((prev) => !prev);
                if (column === "showCurrent")
                  setShowCurrentCol((prev) => !prev);
                if (column === "showLastUsed")
                  setShowLastUsedCol((prev) => !prev);
              },
            }}
          />

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
            onClick={() => {
              setEditRow(null);
              setOpenModal(true);
            }}
          />
        </div>
      </div>

      {/* Workstation List with Headers */}
      <WorkstationList
        rows={filtered}
        onEdit={(row) => {
          setEditRow(row);
          setOpenModal(true);
        }}
        onDelete={handleDelete}
        onToggleStatus={handleToggleStatus}
        showUsers={showUsersCol}
        showCurrent={showCurrentCol}
        showLastUsed={showLastUsedCol}
      />

      {/* Workstation Modal */}
      {openModal && (
        <WorkstationModal
          open={openModal}
          onClose={() => {
            setOpenModal(false);
            setEditRow(null);
          }}
          workstationData={editRow}
          onSubmit={(payload) => {
            if (editRow) {
              handleEditSave(editRow.id, payload);
            } else {
              handleCreate(payload);
            }
            setOpenModal(false);
            setEditRow(null);
          }}
          onDelete={
            editRow
              ? () => {
                  handleDelete(editRow.id);
                  setOpenModal(false);
                  setEditRow(null);
                }
              : undefined
          }
        />
      )}
    </div>
  );
}
