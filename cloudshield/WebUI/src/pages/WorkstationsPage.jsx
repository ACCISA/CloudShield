import React, { useMemo, useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import WorkstationList from "../components/workstations/WorkstationList.jsx";
import WorkstationModal from "../components/workstations/WorkstationModal.jsx";
import { MOCK_WORKSTATIONS_FULL } from "../data/mockData.js";
import Checkbox from "../components/common/Checkbox/Checkbox.jsx";
import CreateButton from "../components/common/CreateButton/CreateButton.jsx";
import SearchField from "../components/common/SearchField/SearchField.jsx";
import DisplayButton from "../components/common/DisplayButton/DisplayButton.jsx";
import FilterButton from "../components/common/FilterButton/FilterButton.jsx";
import RefreshButton from "../components/common/RefreshButton/RefreshButton.jsx";
import CreateWorkstationIcon from "../assets/CreateWorkstationIcon.jsx";
import { WORKSTATION_FILTERS } from "../config/filterConfigs.js";
import { useClickLogger } from "../hooks/useClickLogger";
import { trackButton } from "../lib/analytics";

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    overflow: "hidden",
  },
  toolbar: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    flexWrap: "wrap",
    flexShrink: 0,
  },
  leftActions: {
    display: "flex",
    gap: "10px",
    flex: "1 1 auto",
    flexWrap: "wrap",
    minWidth: "0",
  },
  rightActions: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
  },
  listWrapper: {
    flex: 1,
    overflow: "auto",
    minHeight: 0,
    overscrollBehavior: "contain",
  },
};
/* ----------------------------------- seed ---------------------------------- */

const seed = MOCK_WORKSTATIONS_FULL;

/* ---------------------------------- page ----------------------------------- */

export default function WorkstationsPage() {
  const location = useLocation();
  const withClickLog = useClickLogger({ page: "workstations" });
  const [rows, setRows] = useState(seed);
  const [search, setSearch] = useState("");

  // Layout state
  const [layout, setLayout] = useState("list"); // 'cards', 'list', or 'icons'
  const [showUsersCol, setShowUsersCol] = useState(true);
  const [showCurrentCol, setShowCurrentCol] = useState(true);
  const [showLastUsedCol, setShowLastUsedCol] = useState(true);

  const [selectedIds, setSelectedIds] = useState(new Set());

  // Filter state
  const [activeFilters, setActiveFilters] = useState({
    status: new Set(),
    hasUsers: new Set(),
  });

  // dialogs
  const [openModal, setOpenModal] = useState(false);
  const [editRow, setEditRow] = useState(null);

  // Open modal if navigated from dashboard
  useEffect(() => {
    if (location.state?.openModal) {
      setOpenModal(true);
      setEditRow(null);
      // Clear the state to prevent reopening on subsequent renders
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    let data = rows;

    // text search
    if (q) {
      data = data.filter((r) => {
        const currentUserName = r.currentUser
          ? `${r.currentUser.firstName || ""} ${r.currentUser.lastName || ""}`.trim()
          : "";
        return [r.name, r.code, currentUserName].some((v) =>
          (v || "").toLowerCase().includes(q),
        );
      });
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

  const { allVisibleSelected, isIndeterminate } = useMemo(() => {
    const hasSelected = filtered.some((w) => selectedIds.has(w.id));
    const allAreSelected =
      filtered.length > 0 && filtered.every((w) => selectedIds.has(w.id));
    return {
      allVisibleSelected: allAreSelected,
      isIndeterminate: hasSelected && !allAreSelected,
    };
  }, [filtered, selectedIds]);

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllVisible = () => {
    const hasSelected = filtered.some((w) => selectedIds.has(w.id));
    const allAreSelected =
      filtered.length > 0 && filtered.every((w) => selectedIds.has(w.id));

    setSelectedIds((prev) => {
      if (hasSelected && !allAreSelected) {
        // Indeterminate state - deselect all
        const next = new Set(prev);
        filtered.forEach((w) => next.delete(w.id));
        return next;
      } else if (!hasSelected) {
        // Nothing selected - select all
        const next = new Set(prev);
        filtered.forEach((w) => next.add(w.id));
        return next;
      } else {
        // All selected - deselect all
        const next = new Set(prev);
        filtered.forEach((w) => next.delete(w.id));
        return next;
      }
    });
  };

  const handleFilterChange = (groupId, value, isActive) => {
    trackButton("workstations/filter/change", {
      page: "workstations",
      groupId,
      value,
      active: isActive,
      control: "filter_button",
    });
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
    trackButton("workstations/create/save", {
      page: "workstations",
      control: "create_dialog",
    });
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
    trackButton("workstations/edit/save", {
      page: "workstations",
      id,
      control: "edit_dialog",
    });
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

  const handleDelete = (id) => {
    trackButton("workstations/edit/delete", {
      page: "workstations",
      id,
      control: "edit_dialog",
    });
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handleToggleStatus = (id) => {
    trackButton("workstations/row/toggle-status", {
      page: "workstations",
      id,
      control: "row_toggle",
    });
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
    trackButton("workstations/display/toggle", {
      page: "workstations",
      layout: newLayout,
      control: "display_button",
    });
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
            showIcon={true}
            style={{
              flex: "1 1 200px",
              minWidth: "200px",
              maxWidth: "680px",
              width: "100%",
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
          <RefreshButton
            onClick={withClickLog({
              name: "workstations/toolbar/refresh",
              control: "refresh_button",
            })(() => console.log("refresh"))}
          />

          <CreateButton
            icon={<CreateWorkstationIcon />}
            buttonText="Create"
            onClick={withClickLog({
              name: "workstations/toolbar/open-create",
              control: "create_button",
            })(() => {
              setEditRow(null);
              setOpenModal(true);
            })}
          />
        </div>
      </div>

      {/* Workstation List with Headers */}
      <div style={styles.listWrapper}>
        <WorkstationList
          rows={filtered}
          onEdit={(row) => {
            setEditRow(row);
            setOpenModal(true);
          }}
          onDelete={handleDelete}
          onToggleStatus={handleToggleStatus}
          selectedIds={selectedIds}
          allVisibleSelected={allVisibleSelected}
          isIndeterminate={isIndeterminate}
          onToggleSelect={toggleSelect}
          onToggleSelectAll={toggleSelectAllVisible}
          showUsers={showUsersCol}
          showCurrent={showCurrentCol}
          showLastUsed={showLastUsedCol}
        />
      </div>

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
