import React, { useState, useEffect, useMemo } from "react";

import GroupsList from "../components/groups/GroupsList.jsx";
import GroupsModal from "../components/groups/GroupsModal.jsx";
import { createFilterChangeHandler } from "../utils/filterHelpers.js";
import Checkbox from "../components/common/Checkbox/Checkbox.jsx";

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

  const [selectedIds, setSelectedIds] = useState(new Set());

  const [sortField, setSortField] = useState("name");
  const [sortDir, setSortDir] = useState("asc");

  const [toast, setToast] = useState({ open: false, msg: "", type: "success" });

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);

  const openToast = (msg, type = "success") => {
    setToast({ open: true, msg, type });
    setTimeout(() => setToast((p) => ({ ...p, open: false })), 2500);
  };

  const safeSplitName = (fullName) => {
    const raw = (fullName || "").trim();
    if (!raw) return { firstName: "Unknown", lastName: "" };
    const parts = raw.split(/\s+/);
    if (parts.length === 1) return { firstName: parts[0], lastName: "" };
    return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
  };

  const mapApiGroupToUi = (g) => {
    const membersInfo = Array.isArray(g.members_info) ? g.members_info : [];
    const users = membersInfo.map((u) => {
      const { firstName, lastName } = safeSplitName(
        u.full_name || u.name || "",
      );
      return {
        id: u._id,
        _id: u._id,
        email: u.email,
        firstName,
        lastName,
        title: u.role || "",
        role: u.role,
        org_id: u.org_id,
        status: u.status,
        created_at: u.created_at,
        updated_at: u.updated_at,
      };
    });

    const wsIds = Array.isArray(g.workstations) ? g.workstations : [];
    const wsObjects = wsIds.map((x) => ({
      id: x,
      name: x,
      online: false,
      ipAddress: "",
    }));

    const shareIds = Array.isArray(g.file_shares) ? g.file_shares : [];

    return {
      id: g.id,
      name: g.group_name || "",
      groupName: g.group_name || "",
      description: g.description || "",
      image: g.group_image || null,

      users,
      memberCount: Array.isArray(g.members) ? g.members.length : users.length,

      workstations: wsObjects,
      workstationIds: wsIds,

      files: shareIds.length,
      fileShareIds: shareIds,

      type: "Custom",
      createdDate: g.created_at,
      updatedDate: g.updated_at,
      members_missing: g.members_missing || [],
    };
  };

  const fetchGroups = async () => {
    try {
      const res = await fetch("http://127.0.0.1:5050/api/access-groups", {
        method: "GET",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to fetch groups");
      }

      const data = await res.json();
      const apiGroups = Array.isArray(data.access_groups)
        ? data.access_groups
        : [];
      const uiGroups = apiGroups.map(mapApiGroupToUi);

      setGroups(uiGroups);
    } catch (e) {
      console.error(e);
      openToast(e.message || "Failed to fetch groups", "error");
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const filtered = useMemo(() => {
    let out = [...groups];
    const q = search.trim().toLowerCase();

    if (q) {
      out = out.filter((g) =>
        [g.name, g.description].some((v) =>
          (v || "").toLowerCase().includes(q),
        ),
      );
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

  const allVisibleSelected = useMemo(() => {
    return filtered.length > 0 && filtered.every((g) => selectedIds.has(g._id));
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
    setSelectedIds((prev) => {
      if (allVisibleSelected) {
        const next = new Set(prev);
        filtered.forEach((g) => next.delete(g._id));
        return next;
      } else {
        const next = new Set(prev);
        filtered.forEach((g) => next.add(g._id));
        return next;
      }
    });
  };

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

  const handleFilterChange = createFilterChangeHandler(setActiveFilters);

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

  const normalizeMembersFromUsers = (users) => {
    const list = Array.isArray(users) ? users : [];
    const out = [];
    const seen = new Set();

    for (const u of list) {
      const id = u && (u._id || u.id) ? String(u._id || u.id) : "";
      if (id && !seen.has(id)) {
        seen.add(id);
        out.push(id);
      }
    }
    return out;
  };

  const normalizeIdsFromObjects = (items) => {
    const list = Array.isArray(items) ? items : [];
    const out = [];
    const seen = new Set();

    for (const it of list) {
      const id = it && (it.id || it._id) ? String(it.id || it._id) : "";
      if (id && !seen.has(id)) {
        seen.add(id);
        out.push(id);
      }
    }
    return out;
  };

  const handleSubmitGroup = async (groupData) => {
    try {
      const members = normalizeMembersFromUsers(groupData.users);
      const workstations = normalizeIdsFromObjects(groupData.workstations);
      const file_shares = normalizeIdsFromObjects(groupData.files);

      if (editingGroup) {
        // Update (PATCH)
        const payload = {
          group_name: groupData.name,
          description: groupData.description,
          group_image: groupData.image || null,
          members,
          workstations,
          file_shares,
        };

        const res = await fetch(
          `http://127.0.0.1:5050/api/access-groups/${editingGroup.id}`,
          {
            method: "PATCH",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          },
        );

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err?.error || "Failed to update group");
        }

        openToast("Group updated successfully");
        await fetchGroups();
      } else {
        // Create (POST)
        const payload = {
          group_name: groupData.name,
          description: groupData.description,
          group_image: groupData.image || null,
          members,
          workstations,
          file_shares,
        };

        const res = await fetch("http://127.0.0.1:5050/api/access-groups", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err?.error || "Failed to create group");
        }

        openToast("Group created successfully");
        await fetchGroups();
      }
    } catch (e) {
      console.error(e);
      openToast(e.message || "Group action failed", "error");
    }
  };

  const handleDeleteGroup = async (groupId) => {
    try {
      const res = await fetch(
        `http://127.0.0.1:5050/api/access-groups/${groupId}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to delete group");
      }

      openToast("Group deleted");
      await fetchGroups();
    } catch (e) {
      console.error(e);
      openToast(e.message || "Delete failed", "error");
    }
  };

  return (
    <div className="container">
      {/* Toolbar */}
      <div className="toolbar">
        {/* Left side: Search and buttons */}
        <div className="leftActions">
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
              columns: [
                { key: "showUsers", label: "Users", checked: showUsers },
                {
                  key: "showWorkstations",
                  label: "Workstations",
                  checked: showWorkstations,
                },
                { key: "showFiles", label: "Shares", checked: showFiles },
              ],
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
          <RefreshButton onClick={fetchGroups} />

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
        selectedIds={selectedIds}
        allVisibleSelected={allVisibleSelected}
        onToggleSelect={toggleSelect}
        onToggleSelectAll={toggleSelectAllVisible}
        onEdit={handleOpenEditModal}
        onDelete={handleDeleteGroup}
      />

      <GroupsModal
        open={modalOpen}
        onClose={handleCloseModal}
        groupData={editingGroup}
        onSubmit={handleSubmitGroup}
        onRefresh={fetchGroups}
      />
    </div>
  );
}
