import React, { useState, useEffect, useMemo } from "react";

import GroupsList from "../components/groups/GroupsList.jsx";
import GroupsModal from "../components/groups/GroupsModal.jsx";
import { MOCK_GROUPS_FULL } from "../data/mockData.js";

// Import dynamic components
import SearchField from "../components/common/SearchField/SearchField.jsx";
import CreateButton from "../components/common/CreateButton/CreateButton.jsx";
import RefreshButton from "../components/common/RefreshButton/RefreshButton.jsx";
import DisplayButton from "../components/common/DisplayButton/DisplayButton.jsx";
import FilterButton from "../components/common/FilterButton/FilterButton.jsx";
import CreateGroupIcon from "../assets/CreateGroupIcon.jsx";

export default function GroupsPage() {
  const [groups, setGroups] = useState([]);

  const [search, setSearch] = useState("");
  const [layout, setLayout] = useState("list");

  // Filter state using Sets for FilterButton
  const [activeFilters, setActiveFilters] = useState({
    size: new Set(),
  });

  const [showUsers, setShowUsers] = useState(true);
  const [showWorkstations, setShowWorkstations] = useState(true);
  const [showFiles, setShowFiles] = useState(true);

  const [sortField, setSortField] = useState("name");
  const [sortDir, setSortDir] = useState("asc");

  const [toast, setToast] = useState({ open: false, msg: "", type: "success" });

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);

  const openToast = (msg, type = "success") =>
    setToast({ open: true, msg, type });

  const mockFetchGroups = async () => {
    setGroups(MOCK_GROUPS_FULL);
  };

  useEffect(() => {
    mockFetchGroups();
  }, []);

  const filtered = useMemo(() => {
    let out = [...groups];
    const q = search.trim().toLowerCase();

    if (q) {
      out = out.filter((g) =>
        [g.name, g.description].some((v) => v.toLowerCase().includes(q)),
      );
    }

    // Apply size filters (if needed)
    const sizeFilters = activeFilters.size;
    if (sizeFilters.size > 0) {
      out = out.filter((g) => {
        if (sizeFilters.has("small") && g.users <= 5) return true;
        if (sizeFilters.has("medium") && g.users > 5 && g.users <= 20)
          return true;
        if (sizeFilters.has("large") && g.users > 20) return true;
        return false;
      });
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
  }, [groups, search, activeFilters, sortField, sortDir]);

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
      id: "size",
      label: "Group Size",
      type: "checkbox",
      options: [
        { value: "small", label: "Small (≤5)" },
        { value: "medium", label: "Medium (6-20)" },
        { value: "large", label: "Large (>20)" },
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
    setGroups((p) => p.filter((g) => g.id !== id));
    openToast("Group deleted");
  };

  const handleOpenCreateModal = () => {
    setEditingGroup(null);
    setModalOpen(true);
  };

  const handleOpenEditModal = (group) => {
    setEditingGroup(group);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingGroup(null);
  };

  const handleSubmitGroup = (groupData) => {
    if (editingGroup) {
      // Edit mode - update existing group
      setGroups((prev) =>
        prev.map((g) =>
          g.id === editingGroup.id
            ? {
                ...g,
                name: groupData.name,
                groupName: groupData.name,
                description: groupData.description,
                image: groupData.image,
                users: groupData.users || [],
                memberCount: groupData.users?.length || 0,
                workstations: groupData.workstations || [],
                files: groupData.files?.length || 0,
              }
            : g,
        ),
      );
      openToast("Group updated successfully");
    } else {
      // Create mode - add new group (temporary UI visualization)
      const newGroup = {
        id: String(Date.now()),
        name: groupData.name,
        groupName: groupData.name,
        description: groupData.description,
        image: groupData.image,
        users: groupData.users || [],
        memberCount: groupData.users?.length || 0,
        workstations: groupData.workstations || [],
        files: groupData.files?.length || 0, // Convert array to count
        type: "Custom",
        createdDate: new Date().toISOString(),
      };
      setGroups((prev) => [...prev, newGroup]);
      openToast("Group created successfully");
    }
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
      marginBottom: "8px",
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
            placeholder="Search groups"
            showIcon={true}
            style={{
              flex: "1 1 200px",
              minWidth: "200px",
              maxWidth: "680px",
              width: "100%",
            }}
          />

          <DisplayButton
            layout={layout}
            onLayoutChange={setLayout}
            columnToggles={{
              showUsers,
              showWorkstations,
              showFiles,
              onToggle: (column) => {
                if (column === "showUsers") setShowUsers((prev) => !prev);
                if (column === "showWorkstations")
                  setShowWorkstations((prev) => !prev);
                if (column === "showFiles") setShowFiles((prev) => !prev);
              },
            }}
          />

          <FilterButton
            filterGroups={filterGroups}
            activeFilters={activeFilters}
            onFilterChange={handleFilterChange}
          />
        </div>

        {/* Right side: Refresh and Create buttons */}
        <div style={styles.rightActions}>
          <RefreshButton onClick={mockFetchGroups} />

          <CreateButton
            icon={<CreateGroupIcon width={24} height={24} color="#fff" />}
            buttonText="Create"
            onClick={handleOpenCreateModal}
          />
        </div>
      </div>

      <GroupsList
        rows={filtered}
        showUsers={showUsers}
        showWorkstations={showWorkstations}
        showFiles={showFiles}
        onEdit={handleOpenEditModal}
        onDelete={(g) => handleMockDelete(g.id)}
      />

      <GroupsModal
        open={modalOpen}
        onClose={handleCloseModal}
        groupData={editingGroup}
        onSubmit={handleSubmitGroup}
      />
    </div>
  );
}
