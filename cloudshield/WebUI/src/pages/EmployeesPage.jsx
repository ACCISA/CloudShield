import React, { useState, useEffect, useMemo, useCallback } from "react";
import PropTypes from "prop-types";
import { useLocation } from "react-router-dom";
import { useClickLogger } from "../hooks/useClickLogger";
import { useThemeColors } from "../hooks/useThemeColors.js";

import UsersTable from "../components/users/UsersTable.jsx";
import Checkbox from "../components/common/Checkbox/Checkbox.jsx";
import EmptyState from "../components/common/EmptyState/EmptyState.jsx";

import SearchField from "../components/common/SearchField/SearchField.jsx";
import CreateButton from "../components/common/CreateButton/CreateButton.jsx";
import RefreshButton from "../components/common/RefreshButton/RefreshButton.jsx";
import DisplayButton from "../components/common/DisplayButton/DisplayButton.jsx";
import FilterButton from "../components/common/FilterButton/FilterButton.jsx";
import EmployeesModal from "../components/users/EmployeesModal.jsx";
import CreateUserIcon from "../assets/CreateUserIcon.jsx";
import { createFilterChangeHandler } from "../utils/filterHelpers.js";
import DisplayIcon from "../components/common/DisplayIcon/DisplayIcon.jsx";
import IconSelectionBar from "../components/common/IconSelectionBar.jsx";
import EditButton from "../components/common/EditButton/EditButton.jsx";
import EditIcon from "../assets/EditIcon.jsx";
import TrashIcon from "../assets/TrashIcon.jsx";
import ActiveIcon from "../assets/ActiveIcon.jsx";
import { getSharedIconViewStyles } from "../components/common/styles/iconViewStyles.js";
import { managementToolbarStyles } from "../components/common/styles/managementToolbarStyles.js";

import PageShell from "../components/layout/PageShell.jsx";
import TableSurface from "../components/table/TableSurface.jsx";
import TableSkeleton from "../components/table/TableSkeleton.jsx";

import { apiGet } from "../api/client.js";
import { buildApiUrl } from "../lib/apiBase.js";
import { getUserErrorMessage } from "../lib/errors.js";
import { formatShares } from "../lib/format.js";
import { safeAsync } from "../lib/safeAsync.js";

import { listUsers, deleteUser, createUser, updateUser } from "../services/usersApi.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useAsyncTask } from "../hooks/useAsyncTask.js";

const CustomToast = ({ msg, type = "success", onClose }) => {
  if (!msg) return null;
  return (
    <button
      type="button"
      aria-live="polite"
      aria-atomic="true"
      style={{
        position: "fixed", bottom: "24px", right: "24px", padding: "12px 24px",
        borderRadius: "12px", backgroundColor: type === "error" ? "#d32f2f" : "#2e7d32",
        color: "#fff", fontSize: "1rem", boxShadow: "0 8px 20px rgba(0,0,0,0.35)",
        zIndex: 9999, display: "flex", alignItems: "center", cursor: "pointer",
        border: "none", outline: "none",
      }}
      onClick={onClose}
    >
      {msg}
    </button>
  );
};

CustomToast.propTypes = {
  msg: PropTypes.string,
  type: PropTypes.string,
  onClose: PropTypes.func.isRequired,
};

function getUserGroups(allGroups, userId) {
  return allGroups.filter((g) => {
    const members = Array.isArray(g.members) ? g.members : [];
    return members.some((m) => String(m) === userId);
  });
}

function buildUserGroups(memberGroups) {
  return memberGroups.map((g) => ({
    id: g.id || g._id,
    name: g.group_name || g.name || "Unknown Group",
    description: g.description || "",
    image: g.group_image || null,
  }));
}

function collectUniqueGroupResources(memberGroups, key) {
  const resourceMap = new Map();

  for (const group of memberGroups) {
    const resources = Array.isArray(group[key]) ? group[key] : [];

    for (const resource of resources) {
      if (!resourceMap.has(resource)) {
        resourceMap.set(resource, resource);
      }
    }
  }

  return Array.from(resourceMap.values()).map((resource) => ({
    id: resource,
    name: resource,
    [key === "workstations" ? "hostname" : "drive"]: resource,
  }));
}

function enrichUser(user, allGroups) {
  const userId = String(user._id);
  const memberGroups = getUserGroups(allGroups, userId);
  const userGroups = buildUserGroups(memberGroups);
  const userWorkstations = collectUniqueGroupResources(memberGroups, "workstations");
  const userFileShares = collectUniqueGroupResources(memberGroups, "file_shares");

  return {
    id: user._id, name: user.full_name || user.email, email: user.email,
    title: user.role || "Employee", workstations: userWorkstations,
    workstationCount: userWorkstations.length, groups: userGroups,
    groupCount: userGroups.length, files: userFileShares,
    fileCount: userFileShares.length, fileCountDisplay: formatShares(userFileShares.length),
    sharesDisplay: formatShares(userFileShares.length), status: user.status || "offline",
    profileImage: user.profile_image || null, _original: user,
  };
}

const styles = { ...managementToolbarStyles, iconFooter: { marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "space-between" } };

function getStoredOrgId() {
  try {
    return globalThis.localStorage.getItem("org_id");
  } catch (error) {
    console.error("Failed to read org_id from localStorage", error);
    return null;
  }
}

export default function EmployeesPage() {
  const location = useLocation();
  const { accessToken, currentUser } = useAuth();
  const withClickLog = useClickLogger({ page: "employees" });
  const themeColors = useThemeColors();
  
  const iconViewStyles = getSharedIconViewStyles(themeColors);
  const dynamicStyles = { ...styles, ...iconViewStyles };
  
  const { status, message, progress, executeTask: startCreation, reset: resetCreation } = useAsyncTask();

  const orgId = useMemo(() => {
    if (currentUser?.org_id && currentUser.org_id !== "default-org") return currentUser.org_id;
    const stored = getStoredOrgId();
    if (stored) return stored;
    return null;
  }, [currentUser]);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalEmployee, setModalEmployee] = useState(null);

  useEffect(() => {
    if (location.state?.openModal) {
      setModalOpen(true);
      setModalEmployee(null);
      globalThis.history.replaceState({}, document.title, globalThis.location.pathname);
    }
  }, [location]);

  const [layout, setLayout] = useState("list");
  const [sortField, setSortField] = useState("name");
  const [sortDir, setSortDir] = useState("asc");
  const [showTitle, setShowTitle] = useState(true);
  const [showWorkstations, setShowWorkstations] = useState(true);
  const [showGroups, setShowGroups] = useState(true);
  const [showFiles, setShowFiles] = useState(true);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true); // START TRUE
  const [search, setSearch] = useState("");

  const [activeFilters, setActiveFilters] = useState({ status: new Set() });
  const [toast, setToast] = useState({ open: false, msg: "", type: "success" });

  const openToast = useCallback((msg, type = "success") => {
    setToast({ open: true, msg, type });
    setTimeout(() => setToast({ open: false, msg: "", type: "success" }), 3000);
  }, []);

  const resolveAuthToken = useCallback(() => {
    try {
      return globalThis.localStorage.getItem("jwt") || accessToken || null;
    } catch {
      return accessToken || null;
    }
  }, [accessToken]);

  const getAuthHeader = useCallback(() => {
    const token = resolveAuthToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, [resolveAuthToken]);

  const fetchAccessGroups = useCallback(async () => {
    const response = await apiGet("/access-groups", {
      credentials: "include",
      headers: getAuthHeader(),
    });
    const data =
      typeof response?.json === "function" ? await response.json() : response;

    return Array.isArray(data?.access_groups) ? data.access_groups : [];
  }, [getAuthHeader]);

  const updateUserGroupMemberships = async (userId, newGroups) => {
    const newGroupIds = newGroups.map((g) => String(g.id || g._id));
    const allGroups = await fetchAccessGroups();

    const currentGroupIds = allGroups.filter((g) => { const members = Array.isArray(g.members) ? g.members : []; return members.some((m) => String(m) === String(userId)); }).map((g) => String(g.id || g._id));
    const toAdd = newGroupIds.filter((id) => !currentGroupIds.includes(id));
    const toRemove = currentGroupIds.filter((id) => !newGroupIds.includes(id));

    for (const groupId of toAdd) {
      const group = allGroups.find((g) => String(g.id || g._id) === groupId);
      if (!group) continue;
      const currentMembers = Array.isArray(group.members) ? group.members : [];
      if (!currentMembers.some((m) => String(m) === String(userId))) {
        await fetch(buildApiUrl(`/access-groups/${groupId}`), { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json", ...getAuthHeader() }, body: JSON.stringify({ members: [...currentMembers, userId] }) });
      }
    }

    for (const groupId of toRemove) {
      const group = allGroups.find((g) => String(g.id || g._id) === groupId);
      if (!group) continue;
      const currentMembers = Array.isArray(group.members) ? group.members : [];
      const updatedMembers = currentMembers.filter((m) => String(m) !== String(userId));
      if (updatedMembers.length !== currentMembers.length) {
        await fetch(buildApiUrl(`/access-groups/${groupId}`), { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json", ...getAuthHeader() }, body: JSON.stringify({ members: updatedMembers }) });
      }
    }
  };

  const fetchUsers = useCallback(async () => {
    const token = resolveAuthToken();
    if (!token) return;
    setLoading(true);
    try {
      const data = await safeAsync(() => listUsers({ token, search, limit: 100, offset: 0 }), { toast: { error: (msg) => openToast(msg, "error") } });
      let allGroups = [];
      try {
        allGroups = await fetchAccessGroups();
      } catch (error) {
        console.error("Failed to load access groups", error);
      }
      setUsers(Array.isArray(data) ? data.map((user) => enrichUser(user, allGroups)) : []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [fetchAccessGroups, openToast, resolveAuthToken, search]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleModalSubmit = async (payload) => {
    const token = resolveAuthToken();
    if (!token) { openToast("You must be logged in to create a user", "error"); return; }
    try {
      if (modalEmployee) {
        const apiPayload = { full_name: `${payload.firstName} ${payload.lastName}`, email: payload.email, role: payload.jobTitle, profile_image: payload.profileImage || null };
        await updateUser(modalEmployee.id, apiPayload, { token });
        if (payload.groups) await updateUserGroupMemberships(modalEmployee.id, payload.groups);
        openToast("User updated successfully");
        setModalOpen(false); setModalEmployee(null); fetchUsers();
      } else {
        const apiPayload = { email: payload.email, full_name: `${payload.firstName} ${payload.lastName}`, password: payload.password || "DefaultPass123!", role: payload.jobTitle?.toLowerCase().includes("admin") ? "admin" : "employee", org_id: orgId || "cedric", profile_image: payload.profileImage || null };
        await startCreation(async () => { const response = await createUser(apiPayload, { token }); return response.job_id; });
      }
    } catch (error) {
      console.error("Failed to save user", getUserErrorMessage(error), error);
      openToast("Failed to save user", "error");
    }
  };
  
  useEffect(() => {
    if (status === "succeeded") { openToast("User created successfully"); resetCreation(); setModalOpen(false); setModalEmployee(null); fetchUsers(); } 
    else if (status === "failed") { openToast(message || "Failed to create user", "error"); }
  }, [fetchUsers, message, openToast, resetCreation, status]);

  const handleDelete = async (user) => {
    const userToDelete = user || modalEmployee;
    const token = resolveAuthToken();
    if (!token || !userToDelete) return;
    if (userToDelete.id === currentUser?.id) { openToast("You cannot delete your own account", "error"); return; }

    try {
      await safeAsync(() => deleteUser(userToDelete.id, { token }), { toast: { error: (msg) => openToast(msg, "error") } });
      setUsers((prev) => prev.filter((u) => u.id !== userToDelete.id));
      openToast("User deleted successfully");
      if (!user && modalEmployee) { setModalOpen(false); setModalEmployee(null); }
    } catch (error) {
      console.error("Failed to delete user", error);
    }
  };

  const filtered = useMemo(() => {
    let out = [...users];
    const q = search.trim().toLowerCase();
    if (q) out = out.filter((u) => [u.name, u.email, u.title].some((v) => v.toLowerCase().includes(q)));
    if (activeFilters.status.size > 0) out = out.filter((u) => activeFilters.status.has(u.status));
    out.sort((a, b) => {
      const va = a[sortField] ?? ""; const vb = b[sortField] ?? "";
      if (typeof va === "string") return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      return sortDir === "asc" ? va - vb : vb - va;
    });
    return out;
  }, [users, search, activeFilters, sortField, sortDir]);

  const { allVisibleSelected, isIndeterminate } = useMemo(() => {
    const hasSelected = filtered.some((u) => selectedIds.has(u.id));
    const allAreSelected = filtered.length > 0 && filtered.every((u) => selectedIds.has(u.id));
    return { allVisibleSelected: allAreSelected, isIndeterminate: hasSelected && !allAreSelected };
  }, [filtered, selectedIds]);

  const toggleSelect = (id) => setSelectedIds((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  const toggleSelectAllVisible = () => {
    const hasVisibleSelection = filtered.some((u) => selectedIds.has(u.id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (hasVisibleSelection) {
        filtered.forEach((u) => next.delete(u.id));
      } else {
        filtered.forEach((u) => next.add(u.id));
      }
      return next;
    });
  };

  const handleFilterChange = createFilterChangeHandler(setActiveFilters);
  const selectedCount = useMemo(() => filtered.filter((u) => selectedIds.has(u.id)).length, [filtered, selectedIds]);
  const handleSort = (field) => {
    let nextSortDir = "asc";

    if (sortField === field) {
      nextSortDir = sortDir === "asc" ? "desc" : "asc";
    }

    setSortDir(nextSortDir);
    setSortField(field);
  };

  let content = (
    <div style={dynamicStyles.iconsWrapper}>
      <IconSelectionBar styles={dynamicStyles} allVisibleSelected={allVisibleSelected} isIndeterminate={isIndeterminate} onToggleSelectAll={toggleSelectAllVisible} selectedCount={selectedCount} />
      <div style={dynamicStyles.iconsGrid}>
        {filtered.length === 0 ? (
          <div style={{ gridColumn: "1 / -1", margin: "32px 0" }}>
            <EmptyState message="No users found" description="Try adjusting your search or filters, or create a new user." />
          </div>
        ) : (
          filtered.map((user) => {
            const selected = selectedIds.has(user.id);
            return (
              <div key={user.id} style={{ ...dynamicStyles.iconCard, ...(selected ? dynamicStyles.iconCardSelected : {}) }}>
                <div style={dynamicStyles.iconCardHeader}>
                  <Checkbox checked={selected} onChange={() => toggleSelect(user.id)} />
                  <EditButton menuItems={[{ icon: <EditIcon width={15} height={16} color={themeColors.text} />, label: "edit user", color: themeColors.text, onClick: () => { setModalEmployee(user); setModalOpen(true); } }, { icon: <TrashIcon width={12} height={14} color="#D51616" />, label: "delete user", color: "#D51616", onClick: () => handleDelete(user) }]} />
                </div>
                <div style={dynamicStyles.iconTitle}>
                  <DisplayIcon type="user" data={user} size="small" />
                  <div style={dynamicStyles.iconTitleText}>
                    <span style={dynamicStyles.iconName}>{user.name}</span>
                    <span style={dynamicStyles.iconSub}>↳ {user.email}</span>
                  </div>
                </div>
                {showTitle && <div style={dynamicStyles.iconMetaRow}><span style={dynamicStyles.iconMetaLabel}>Title</span><span style={dynamicStyles.iconMetaValue}>{user.title || "—"}</span></div>}
                {showWorkstations && <div style={dynamicStyles.iconMetaRow}><span style={dynamicStyles.iconMetaLabel}>Workstations</span><span style={dynamicStyles.iconMetaValue}>{user.workstationCount ?? user.workstations?.length ?? 0}</span></div>}
                {showGroups && <div style={dynamicStyles.iconMetaRow}><span style={dynamicStyles.iconMetaLabel}>Groups</span><span style={dynamicStyles.iconMetaValue}>{user.groupCount ?? user.groups?.length ?? 0}</span></div>}
                {showFiles && <div style={dynamicStyles.iconMetaRow}><span style={dynamicStyles.iconMetaLabel}>Shares</span><span style={dynamicStyles.iconMetaValue}>{user.fileCountDisplay ?? formatShares(user.fileCount ?? user.files?.length ?? 0)}</span></div>}
                
                <div style={dynamicStyles.iconFooter}>
                  <span style={dynamicStyles.iconMetaLabel}>{user.status || "offline"}</span>
                  <ActiveIcon width={12} height={12} outerColor={user.status === "online" ? "#1F381F" : "#381F1F"} innerColor={user.status === "online" ? "#04C40A" : "#ff5252"} />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  if (loading) {
    content = (
      <TableSurface>
        <TableSkeleton rows={8} cols={5} />
      </TableSurface>
    );
  } else if (layout === "list") {
    content = (
      <TableSurface>
        <UsersTable
          users={filtered} showTitle={showTitle} showWorkstations={showWorkstations} showGroups={showGroups} showFiles={showFiles}
          selectedIds={selectedIds} allVisibleSelected={allVisibleSelected} isIndeterminate={isIndeterminate}
          onToggleSelect={toggleSelect} onToggleSelectAll={toggleSelectAllVisible} onSort={handleSort} sortField={sortField} sortDir={sortDir}
          onEdit={(u) => { setModalEmployee(u); setModalOpen(true); }} onDelete={handleDelete}
        />
      </TableSurface>
    );
  }

  return (
    <PageShell>
      <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 24, minHeight: 0 }}>
        {/* Toolbar */}
        <div style={styles.toolbar}>
          <div style={styles.leftActions}>
            <SearchField value={search} onChange={setSearch} onKeyDown={(e) => { if (e.key === "Enter") fetchUsers(); }} placeholder="Search users" showIcon={true} style={{ flex: "1 1 200px", minWidth: "200px", maxWidth: "680px", width: "100%" }} />
            <DisplayButton
              layout={layout} onLayoutChange={setLayout}
              columnToggles={{
                columns: [
                  { key: "showTitle", label: "Title", checked: showTitle },
                  { key: "showWorkstations", label: "Workstations", checked: showWorkstations },
                  { key: "showGroups", label: "Groups", checked: showGroups },
                  { key: "showFiles", label: "Shares", checked: showFiles },
                ],
                onToggle: (c) => {
                  if (c === "showTitle") setShowTitle((p) => !p);
                  if (c === "showWorkstations") setShowWorkstations((p) => !p);
                  if (c === "showGroups") setShowGroups((p) => !p);
                  if (c === "showFiles") setShowFiles((p) => !p);
                },
              }}
            />
            <FilterButton filterGroups={[{ id: "status", label: "Status", type: "checkbox", options: [{ value: "active", label: "Active" }, { value: "offline", label: "Offline" }] }]} activeFilters={activeFilters} onFilterChange={handleFilterChange} />
          </div>

          <div style={styles.rightActions}>
            {layout === "list" && selectedCount > 0 && (
              <div style={styles.selectionSummary}>
                <span style={styles.selectionSummaryCount}>{selectedCount} selected</span>
                <button type="button" style={styles.clearSelectionButton} onClick={() => setSelectedIds(new Set())}>Clear selection</button>
              </div>
            )}
            <RefreshButton onClick={withClickLog({ name: "employees/toolbar/refresh", control: "refresh_button" })(fetchUsers)} />
            <CreateButton icon={<CreateUserIcon width={16} height={16} color={themeColors.text} />} buttonText="Create" onClick={() => { setModalEmployee(null); setModalOpen(true); }} />
          </div>
        </div>

        {/* Clean Conditional Rendering */}
        {content}
      </div>

      <EmployeesModal open={modalOpen} onClose={() => { setModalOpen(false); setModalEmployee(null); resetCreation(); }} employeeData={modalEmployee} onSubmit={handleModalSubmit} onDelete={handleDelete} creationStatus={status} creationProgress={progress} creationMessage={message} />
      {toast.open && <CustomToast msg={toast.msg} type={toast.type} onClose={() => setToast({ ...toast, open: false })} />}
    </PageShell>
  );
}
