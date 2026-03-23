import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useLocation } from "react-router-dom";

import GroupsList from "../components/groups/GroupsList.jsx";
import GroupsModal from "../components/groups/GroupsModal.jsx";
import { createFilterChangeHandler } from "../utils/filterHelpers.js";
import { useThemeColors } from "../hooks/useThemeColors.js";
import Checkbox from "../components/common/Checkbox/Checkbox.jsx";
import EmptyState from "../components/common/EmptyState/EmptyState.jsx"; // Imported EmptyState

// Import dynamic components
import SearchField from "../components/common/SearchField/SearchField.jsx";
import CreateButton from "../components/common/CreateButton/CreateButton.jsx";
import RefreshButton from "../components/common/RefreshButton/RefreshButton.jsx";
import DisplayButton from "../components/common/DisplayButton/DisplayButton.jsx";
import FilterButton from "../components/common/FilterButton/FilterButton.jsx";
import CreateGroupIcon from "../assets/CreateGroupIcon.jsx";
import { apiDelete, apiGet, apiPatch, apiPost } from "../api/client.js";
import DisplayIcon from "../components/common/DisplayIcon/DisplayIcon.jsx";
import IconSelectionBar from "../components/common/IconSelectionBar.jsx";
import EditButton from "../components/common/EditButton/EditButton.jsx";
import EditIcon from "../assets/EditIcon.jsx";
import TrashIcon from "../assets/TrashIcon.jsx";
import { getSharedIconViewStyles } from "../components/common/styles/iconViewStyles.js";
import { managementToolbarStyles } from "../components/common/styles/managementToolbarStyles.js";

import PageShell from "../components/layout/PageShell.jsx";
import TableSurface from "../components/table/TableSurface.jsx";
import TableSkeleton from "../components/table/TableSkeleton.jsx";
import { safeAsync } from "../lib/safeAsync.js";
import { formatShares } from "../lib/format.js";

const baseStyles = {
  ...managementToolbarStyles,
};

export default function GroupsPage() {
  const location = useLocation();
  const themeColors = useThemeColors();
  
  // Generate dynamic icon view styles based on theme
  const iconViewStyles = getSharedIconViewStyles(themeColors);
  const styles = { ...baseStyles, ...iconViewStyles };
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
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

  // Open modal if navigated from dashboard
  useEffect(() => {
    if (location.state?.openModal) {
      setModalOpen(true);
      setEditingGroup(null);
      // Clear the state to prevent reopening on subsequent renders
      window.history.replaceState({}, document.title);
    }
  }, [location]);

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
        profile_image: u.profile_image || null,
        profileImage: u.profile_image || null,
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
    const filesCount = shareIds.length;

    return {
      id: g._id || g.id,
      _id: g._id || g.id,
      name: g.group_name || "",
      groupName: g.group_name || "",
      description: g.description || "",
      image: g.group_image || null,

      users,
      memberCount: Array.isArray(g.members) ? g.members.length : users.length,

      workstations: wsObjects,
      workstationIds: wsIds,

      files: filesCount,
      filesDisplay: formatShares(filesCount),
      fileShareIds: shareIds,

      type: "Custom",
      createdDate: g.created_at,
      updatedDate: g.updated_at,
      members_missing: g.members_missing || [],
    };
  };

  const fetchGroups = async () => {
    setLoading(true);

    try {
      await safeAsync(
        async () => {
          const data = await apiGet("/access-groups");
          const apiGroups = Array.isArray(data.access_groups)
            ? data.access_groups
            : [];
          const uiGroups = apiGroups.map(mapApiGroupToUi);
          setGroups(uiGroups);
        },
        {
          toast: {
            error: (msg) => openToast(msg, "error"),
          },
        },
      );
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
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

  const { allVisibleSelected, isIndeterminate } = useMemo(() => {
    const hasSelected = filtered.some((g) => selectedIds.has(g._id));
    const allAreSelected =
      filtered.length > 0 && filtered.every((g) => selectedIds.has(g._id));
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
    const hasSelected = filtered.some((g) => selectedIds.has(g._id));
    const allAreSelected =
      filtered.length > 0 && filtered.every((g) => selectedIds.has(g._id));

    setSelectedIds((prev) => {
      if (hasSelected && !allAreSelected) {
        // Indeterminate state - deselect all
        const next = new Set(prev);
        filtered.forEach((g) => next.delete(g._id));
        return next;
      } else if (!hasSelected) {
        // Nothing selected - select all
        const next = new Set(prev);
        filtered.forEach((g) => next.add(g._id));
        return next;
      } else {
        // All selected - deselect all
        const next = new Set(prev);
        filtered.forEach((g) => next.delete(g._id));
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
    const members = normalizeMembersFromUsers(groupData.users);
    const workstations = normalizeIdsFromObjects(groupData.workstations);
    const file_shares = normalizeIdsFromObjects(groupData.files);

    const payload = {
      group_name: groupData.name,
      description: groupData.description,
      group_image: groupData.image || null,
      members,
      workstations,
      file_shares,
    };

    try {
      await safeAsync(
        async () => {
          if (editingGroup) {
            await apiPatch(`/access-groups/${editingGroup.id}`, payload);
          } else {
            await apiPost("/access-groups", payload);
          }
        },
        {
          toast: {
            error: (msg) => openToast(msg, "error"),
          },
        },
      );

      openToast(
        editingGroup
          ? "Group updated successfully"
          : "Group created successfully",
      );

      await fetchGroups();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteGroup = async (groupId) => {
    const confirmed =
      typeof window.confirm === "function"
        ? window.confirm(
            "Are you sure you want to delete this group? This action cannot be undone.",
          )
        : true;

    if (!confirmed) return;

    try {
      await safeAsync(
        async () => {
          await apiDelete(`/access-groups/${groupId}`);
        },
        {
          toast: {
            error: (msg) => openToast(msg, "error"),
          },
        },
      );

      openToast("Group deleted");
      await fetchGroups();
    } catch (e) {
      console.error(e);
    }
  };

  const selectedCount = useMemo(
    () => filtered.filter((g) => selectedIds.has(g._id)).length,
    [filtered, selectedIds],
  );

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const getGroupMenuItems = (group) => [
    {
      icon: <EditIcon width={15} height={16} color={themeColors.text} />,
      label: "edit group",
      color: themeColors.text,
      onClick: () => handleOpenEditModal(group),
    },
    {
      icon: <TrashIcon width={12} height={14} color="#D51616" />,
      label: "delete group",
      color: "#D51616",
      onClick: () => handleDeleteGroup(group.id),
    },
  ];

  const pageContentStyle = {
    height: "100%",
    display: "flex",
    flexDirection: "column",
    gap: 24,
    minHeight: 0,
  };

  const loadingOverlayStyle = {
    position: "absolute",
    inset: 0,
    padding: 16,
    background: "rgba(13, 13, 13, 0.55)",
    backdropFilter: "blur(2px)",
    zIndex: 2,
    pointerEvents: "none",
  };
  
  return (
    <PageShell>
      <div style={pageContentStyle}>
        {/* Toolbar */}
        <div style={styles.toolbar}>
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

          <div style={styles.rightActions}>
            {layout === "list" && selectedCount > 0 && (
              <div style={styles.selectionSummary}>
                <span style={styles.selectionSummaryCount}>
                  {selectedCount} selected
                </span>
                <button
                  type="button"
                  style={styles.clearSelectionButton}
                  onClick={clearSelection}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background =
                      themeColors.lightOverlay;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background =
                      themeColors.lightOverlaySubtle;
                  }}
                >
                  Clear selection
                </button>
              </div>
            )}

            <RefreshButton onClick={fetchGroups} />

            <CreateButton
              icon={<CreateGroupIcon width={24} height={24} color={themeColors.text} />}
              buttonText="Create"
              onClick={handleOpenCreateModal}
            />
          </div>
        </div>

        <TableSurface>
          <div style={{ position: "relative", height: "100%", minHeight: 0 }}>
            {layout === "list" ? (
              <GroupsList
                rows={filtered}
                showUsers={showUsers}
                showWorkstations={showWorkstations}
                showFiles={showFiles}
                selectedIds={selectedIds}
                allVisibleSelected={allVisibleSelected}
                isIndeterminate={isIndeterminate}
                onToggleSelect={toggleSelect}
                onToggleSelectAll={toggleSelectAllVisible}
                onEdit={handleOpenEditModal}
                onDelete={handleDeleteGroup}
              />
            ) : (
              <div style={{ height: "100%", minHeight: 0 }}>
                <div style={styles.iconsWrapper}>
                  <IconSelectionBar
                    styles={styles}
                    allVisibleSelected={allVisibleSelected}
                    isIndeterminate={isIndeterminate}
                    onToggleSelectAll={toggleSelectAllVisible}
                    selectedCount={selectedCount}
                  />

                  <div style={styles.iconsGrid}>
                    {filtered.length === 0 && !loading ? (
                      <div style={{ gridColumn: "1 / -1", margin: "32px 0" }}>
                        <EmptyState 
                          message="No groups found" 
                          description="Try adjusting your search or filters, or create a new group." 
                        />
                      </div>
                    ) : (
                      filtered.map((group) => {
                        const selected = selectedIds.has(group._id);
                        const usersCount =
                          group.memberCount ?? group.users?.length ?? 0;
                        const workstationsCount =
                          group.workstations?.length ?? 0;
                        const filesCount = group.files ?? 0;

                        return (
                          <div
                            key={group.id}
                            style={{
                              ...styles.iconCard,
                              ...(selected ? styles.iconCardSelected : {}),
                            }}
                          >
                            <div style={styles.iconCardHeader}>
                              <Checkbox
                                checked={selected}
                                onChange={() => toggleSelect(group._id)}
                              />
                              <EditButton menuItems={getGroupMenuItems(group)} />
                            </div>

                            <div style={styles.iconTitle}>
                              <DisplayIcon
                                type="group"
                                data={group}
                                size="small"
                              />
                              <div style={styles.iconTitleText}>
                                <span style={styles.iconName}>{group.name}</span>
                                <span style={styles.iconSub}>
                                  ↳ {group.description || "—"}
                                </span>
                              </div>
                            </div>

                            {showUsers && (
                              <div style={styles.iconMetaRow}>
                                <span style={styles.iconMetaLabel}>Users</span>
                                <span style={styles.iconMetaValue}>
                                  {usersCount}
                                </span>
                              </div>
                            )}

                            {showWorkstations && (
                              <div style={styles.iconMetaRow}>
                                <span style={styles.iconMetaLabel}>
                                  Workstations
                                </span>
                                <span style={styles.iconMetaValue}>
                                  {workstationsCount}
                                </span>
                              </div>
                            )}

                            {showFiles && (
                              <div style={styles.iconMetaRow}>
                                <span style={styles.iconMetaLabel}>Shares</span>
                                <span style={styles.iconMetaValue}>
                                  {filesCount}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}

            {loading && (
              <div style={loadingOverlayStyle}>
                <TableSkeleton rows={8} cols={5} />
              </div>
            )}
          </div>
        </TableSurface>
      </div>

      <GroupsModal
        open={modalOpen}
        onClose={handleCloseModal}
        groupData={editingGroup}
        onSubmit={handleSubmitGroup}
        onDelete={handleDeleteGroup}
        onRefresh={fetchGroups}
      />
    </PageShell>
  );
}