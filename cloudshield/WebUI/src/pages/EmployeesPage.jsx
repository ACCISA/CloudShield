import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import PropTypes from "prop-types";
import { useLocation } from "react-router-dom";
import { useClickLogger } from "../hooks/useClickLogger";
import { trackButton } from "../lib/analytics";

// UI Components
import UsersTable from "../components/users/UsersTable.jsx";
import Checkbox from "../components/common/Checkbox/Checkbox.jsx";

import SearchField from "../components/common/SearchField/SearchField.jsx";
import CreateButton from "../components/common/CreateButton/CreateButton.jsx";
import RefreshButton from "../components/common/RefreshButton/RefreshButton.jsx";
import DisplayButton from "../components/common/DisplayButton/DisplayButton.jsx";
import FilterButton from "../components/common/FilterButton/FilterButton.jsx";
import EmployeesModal from "../components/users/EmployeesModal.jsx";
import CreateUserIcon from "../assets/CreateUserIcon.jsx";
import UploadFileIcon from "../assets/UploadFileIcon.jsx";
import { createFilterChangeHandler } from "../utils/filterHelpers.js";
import DisplayIcon from "../components/common/DisplayIcon/DisplayIcon.jsx";
import IconSelectionBar from "../components/common/IconSelectionBar.jsx";
import EditButton from "../components/common/EditButton/EditButton.jsx";
import EditIcon from "../assets/EditIcon.jsx";
import TrashIcon from "../assets/TrashIcon.jsx";
import ActiveIcon from "../assets/ActiveIcon.jsx";
import { sharedIconViewStyles, getSharedIconViewStyles } from "../components/common/styles/iconViewStyles.js";
import { managementToolbarStyles } from "../components/common/styles/managementToolbarStyles.js";
import PageShell from "../components/layout/PageShell.jsx";
import TableSurface from "../components/table/TableSurface.jsx";
import TableSkeleton from "../components/table/TableSkeleton.jsx";
import EmptyState from "../components/common/EmptyState/EmptyState.jsx";

import { formatShares } from "../lib/format.js";
import { safeAsync } from "../lib/safeAsync.js";
import { useThemeColors } from "../hooks/useThemeColors.js";

import { listUsers, deleteUser, createUser, updateUser } from "../services/usersApi.js";
import { apiGet, apiPatch, apiUploadFile } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useAsyncTask } from "../hooks/useAsyncTask.js";

const CustomToast = ({ msg, type = "success", onClose }) => {
  if (!msg) return null;
  return (
    <div
      style={{
        position: "fixed", bottom: "24px", right: "24px", padding: "12px 24px",
        borderRadius: "12px", backgroundColor: type === "error" ? "#d32f2f" : "#2e7d32",
        color: "text.primary", fontSize: "1rem", boxShadow: "0 8px 20px rgba(0,0,0,0.35)",
        zIndex: 9999, display: "flex", alignItems: "center", cursor: "pointer",
      }}
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === " " || e.key === "Enter") onClose();
      }}
      role="button"
      tabIndex={0}
    >
      {msg}
    </div>
  );
};

CustomToast.propTypes = {
  msg: PropTypes.string.isRequired,
  type: PropTypes.oneOf(["success", "error", "info", "warning"]),
  onClose: PropTypes.func.isRequired,
};

CustomToast.defaultProps = {
  type: "success",
};

/**
 * Returns the groups (from allGroups) where userId is a member.
 */
function getUserGroups(allGroups, userId) {
  return allGroups
    .filter((g) => {
      const members = Array.isArray(g.members) ? g.members : [];
      return members.some((m) => String(m) === userId);
    });
}

/**
 * Enriches a raw API user with group, workstation, and file-share data.
 */
function enrichUser(user, allGroups) {
  const userId = String(user._id);
  const memberGroups = getUserGroups(allGroups, userId);

  const userGroups = memberGroups.map((g) => ({
    id: g.id || g._id,
    name: g.group_name || g.name || "Unknown Group",
    description: g.description || "",
    image: g.group_image || null,
  }));

  const workstationMap = new Map();
  for (const g of memberGroups) {
    const ws = Array.isArray(g.workstations) ? g.workstations : [];
    for (const w of ws) { if (!workstationMap.has(w)) workstationMap.set(w, { id: w, name: w, hostname: w }); }
  }
  const userWorkstations = Array.from(workstationMap.values());

  const fileShareMap = new Map();
  for (const g of memberGroups) {
    const fs = Array.isArray(g.file_shares) ? g.file_shares : [];
    for (const f of fs) { if (!fileShareMap.has(f)) fileShareMap.set(f, { id: f, name: f, drive: f }); }
  }
  const userFileShares = Array.from(fileShareMap.values());

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

export default function EmployeesPage() {
  const location = useLocation();
  const { accessToken, currentUser } = useAuth();
  const withClickLog = useClickLogger({ page: "employees" });
  const themeColors = useThemeColors();
  
  const iconViewStyles = getSharedIconViewStyles(themeColors);
  const dynamicStyles = { ...styles, ...iconViewStyles };
  
  const { status, message, progress, executeTask: startCreation, reset: resetCreation } = useAsyncTask();

  // CSV import file input ref
  const csvInputRef = useRef(null);
  const pendingCreateGroupSyncRef = useRef(null);
  const [csvImporting, setCsvImporting] = useState(false);
  const [showCsvHelp, setShowCsvHelp] = useState(false);

  // Resolve org_id with a localStorage fallback; return null when unavailable.
  const orgId = useMemo(() => {
    if (currentUser?.org_id && currentUser.org_id !== "default-org") return currentUser.org_id;
    try { const stored = localStorage.getItem("org_id"); if (stored) return stored; } catch (e) {}
    return null;
  }, [currentUser]);

  // UI State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalEmployee, setModalEmployee] = useState(null);

  // Open modal if navigated from dashboard
  useEffect(() => {
    if (location.state?.openModal) { setModalOpen(true); setModalEmployee(null); window.history.replaceState({}, document.title); }
  }, [location]);

  const [layout, setLayout] = useState("list");

  const [sortField, setSortField] = useState("name");
  const [sortDir, setSortDir] = useState("asc");

  // Column visibility toggles
  const [showTitle, setShowTitle] = useState(true);
  const [showWorkstations, setShowWorkstations] = useState(true);
  const [showGroups, setShowGroups] = useState(true);
  const [showFiles, setShowFiles] = useState(true);

  const [selectedIds, setSelectedIds] = useState(new Set());

  // Data State
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const [activeFilters, setActiveFilters] = useState({ status: new Set() });
  const [toast, setToast] = useState({ open: false, msg: "", type: "success" });

  const openToast = (msg, type = "success") => { setToast({ open: true, msg, type }); setTimeout(() => setToast({ open: false, msg: "", type: "success" }), 3000); };
  const resolveAuthToken = () => { try { return localStorage.getItem("jwt") || accessToken || null; } catch { return accessToken || null; } };
  const getAuthHeader = () => { const token = resolveAuthToken(); return token ? { Authorization: `Bearer ${token}` } : {}; };

  const fetchAccessGroups = async () => {
    try {
      const res = await apiGet("/access-groups", { headers: getAuthHeader() });
      const data = await res.json();
      return Array.isArray(data.access_groups) ? data.access_groups : [];
    } catch (e) {
      console.warn("Failed to fetch groups:", e);
      return [];
    }
  };

  const patchAccessGroupMembers = async (groupId, members) => {
    await apiPatch(`/access-groups/${encodeURIComponent(groupId)}`, { members }, { headers: getAuthHeader() });
  };

  /**
   * Update group memberships for a user.
   * Fetches all groups, determines current membership, and updates accordingly.
   * @param {string} userId - The user ID to update group memberships for
   * @param {Array} newGroups - Array of new group objects {id, name, ...} to be members of
   */
  const updateUserGroupMemberships = async (userId, newGroups) => {
    const newGroupIds = newGroups.map((g) => String(g.id || g._id));
    const allGroups = await fetchAccessGroups();

    const currentGroupIds = allGroups.filter((g) => { const members = Array.isArray(g.members) ? g.members : []; return members.some((m) => String(m) === String(userId)); }).map((g) => String(g.id || g._id));
    const toAdd = newGroupIds.filter((id) => !currentGroupIds.includes(id));
    // Groups to remove user from (in currentGroups but not in newGroups)
    const toRemove = currentGroupIds.filter((id) => !newGroupIds.includes(id));

    // Update groups that need the user added
    for (const groupId of toAdd) {
      const group = allGroups.find((g) => String(g.id || g._id) === groupId);
      if (!group) continue;

      const currentMembers = Array.isArray(group.members) ? group.members : [];
      if (!currentMembers.some((m) => String(m) === String(userId))) {
        await patchAccessGroupMembers(groupId, [...currentMembers, userId]);
      }
    }

    // Update groups that need the user removed
    for (const groupId of toRemove) {
      const group = allGroups.find((g) => String(g.id || g._id) === groupId);
      if (!group) continue;

      const currentMembers = Array.isArray(group.members) ? group.members : [];
      const updatedMembers = currentMembers.filter((m) => String(m) !== String(userId));
      if (updatedMembers.length !== currentMembers.length) {
        await patchAccessGroupMembers(groupId, updatedMembers);
      }
    }
  };

 const fetchUsers = useCallback(async () => {
    const token = resolveAuthToken();
    if (!token) return;

    setLoading(true);
    try {
      const data = await safeAsync(() => listUsers({ token, search, limit: 100, offset: 0 }), { toast: { error: (msg) => openToast(msg, "error") } });
      const allGroups = await fetchAccessGroups();
      setUsers(Array.isArray(data) ? data.map((user) => enrichUser(user, allGroups)) : []);
    } catch (error) {
      console.error("Failed to fetch users", error);
      openToast(error.message || "Failed to load users", "error");
      return [];
    } finally {
      setLoading(false);
    }
  }, [accessToken, search]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

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
        if (!orgId) {
          openToast("Missing organization context. Refresh and try again.", "error");
          return;
        }

        const apiPayload = { email: payload.email, full_name: `${payload.firstName} ${payload.lastName}`, password: payload.password || "DefaultPass123!", role: payload.jobTitle?.toLowerCase().includes("admin") ? "admin" : "employee", org_id: orgId, profile_image: payload.profileImage || null };
        pendingCreateGroupSyncRef.current = {
          groups: Array.isArray(payload.groups) ? payload.groups : [],
          email: payload.email || "",
          userId: null,
        };
        await startCreation(async () => {
          const response = await createUser(apiPayload, { token });
          const jid = response?.job_id;
          if (!jid) {
            pendingCreateGroupSyncRef.current = null;
            throw new Error("No job_id returned from user creation");
          }
          if (pendingCreateGroupSyncRef.current) {
            pendingCreateGroupSyncRef.current.userId = response?.user_id || response?.id || null;
          }
          return jid;
        });
      }
    } catch (error) {
      let msg = "Failed to save user";
      const details = Array.isArray(error?.payload?.details) ? error.payload.details : [];
      const passwordError = details.find((d) => Array.isArray(d?.loc) && d.loc.includes("password"));
      if (passwordError?.msg) msg = passwordError.msg;
      else if (error?.payload?.error) msg = error.payload.error;
      else if (error?.message) msg = error.message;
      openToast(msg, "error");
    }
  };
  
  useEffect(() => {
    const syncCreatedUserGroups = async () => {
      const pending = pendingCreateGroupSyncRef.current;
      if (!pending || !Array.isArray(pending.groups) || pending.groups.length === 0) {
        return;
      }

      const token = resolveAuthToken();
      if (!token) return;

      let createdUserId = pending.userId;
      if (!createdUserId && pending.email) {
        const matches = await listUsers({ token, search: pending.email, limit: 10, offset: 0 });
        const exact = (Array.isArray(matches) ? matches : []).find(
          (u) => (u?.email || "").toLowerCase() === pending.email.toLowerCase(),
        );
        createdUserId = exact?._id || exact?.id || null;
      }

      if (createdUserId) {
        await updateUserGroupMemberships(String(createdUserId), pending.groups);
      }
    };

    if (status === "succeeded") {
      safeAsync(syncCreatedUserGroups, { toast: { error: () => openToast("User created but group assignment failed", "warning") } });
      pendingCreateGroupSyncRef.current = null;
      openToast("User created successfully");
      resetCreation();
      setModalOpen(false);
      setModalEmployee(null);
      fetchUsers();
    } else if (status === "failed") {
      pendingCreateGroupSyncRef.current = null;
      openToast(message || "Failed to create user", "error");
    }
  }, [status, message]);

  const handleDelete = async (user) => {
    // Use provided user or fall back to modalEmployee for modal context
    const userToDelete = user || modalEmployee;
    const token = resolveAuthToken();

    if (!token || !userToDelete) return;
    if (userToDelete.id === currentUser?.id) { openToast("You cannot delete your own account", "error"); return; }

    try {
      await safeAsync(() => deleteUser(userToDelete.id, { token }), { toast: { error: (msg) => openToast(msg, "error") } });
      setUsers((prev) => prev.filter((u) => u.id !== userToDelete.id));
      openToast("User deleted successfully");
      if (!user && modalEmployee) { setModalOpen(false); setModalEmployee(null); }
    } catch (error) {}
  };

  const [currentPage, setCurrentPage] = useState(1);
  useEffect(() => {
    setCurrentPage(1);
  }, [search, activeFilters, sortField, sortDir]);

  const handleLayoutChange = (value) => {
    trackButton("employees/display/toggle", {
      page: "employees",
      layout: value,
    });
    setLayout(value);
  };

  // CSV import handler
  const handleCsvImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset input so same file can be selected again
    event.target.value = "";

    setCsvImporting(true);
    try {
      trackButton("employees/csv/import", { page: "employees" });
      const result = await apiUploadFile("/users/import-csv", file);

      const created = result.created || 0;
      const errorCount = result.errors?.length || 0;

      if (created > 0) {
        openToast(`Successfully imported ${created} user(s)${errorCount > 0 ? ` (${errorCount} errors)` : ""}`, "success");
        fetchUsers();
      } else if (errorCount > 0) {
        const firstError = result.errors[0];
        openToast(`Import failed: ${firstError.error || "Unknown error"}`, "error");
      } else {
        openToast("No users imported", "info");
      }

      // Log detailed errors to console for debugging
      if (result.errors?.length > 0) {
        console.warn("CSV import errors:", result.errors);
      }
    } catch (error) {
      openToast(error.message || "CSV import failed", "error");
    } finally {
      setCsvImporting(false);
    }
  };

  const handleCsvButtonClick = () => {
    csvInputRef.current?.click();
  };

  // Logic: Filter & Sort
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

  const pagedUsers = useMemo(() => {
    const start = (currentPage - 1) * 10;
    return filtered.slice(start, start + 10);
  }, [filtered, currentPage]);

  const { allVisibleSelected, isIndeterminate } = useMemo(() => {
    const hasSelected = filtered.some((u) => selectedIds.has(u.id));
    const allAreSelected = filtered.length > 0 && filtered.every((u) => selectedIds.has(u.id));
    return { allVisibleSelected: allAreSelected, isIndeterminate: hasSelected && !allAreSelected };
  }, [filtered, selectedIds]);

  const toggleSelect = (id) => setSelectedIds((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  const toggleSelectAllVisible = () => {
    const hasSelected = filtered.some((u) => selectedIds.has(u.id));
    const allAreSelected = filtered.length > 0 && filtered.every((u) => selectedIds.has(u.id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (hasSelected && !allAreSelected) { filtered.forEach((u) => next.delete(u.id)); }
      else if (!hasSelected) { filtered.forEach((u) => next.add(u.id)); }
      else { filtered.forEach((u) => next.delete(u.id)); }
      return next;
    });
  };

  const handleFilterChange = createFilterChangeHandler(setActiveFilters);
  const selectedCount = useMemo(() => filtered.filter((u) => selectedIds.has(u.id)).length, [filtered, selectedIds]);

  return (
    <PageShell>
      <div className="page-layout" style={{ display: "flex", flexDirection: "column", height: "100%", gap: 24, minHeight: 0 }}>
        {/* Toolbar */}
        <div style={styles.toolbar}>
          <div style={styles.leftActions}>
            <SearchField value={search} onChange={setSearch} onKeyDown={(e) => { if (e.key === "Enter") fetchUsers(); }} placeholder="Search users" showIcon={true} style={{ flex: "1 1 200px", minWidth: "200px", maxWidth: "680px", width: "100%" }} />
            <DisplayButton
              layout={layout} onLayoutChange={handleLayoutChange}
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
                <button
                  type="button"
                  style={styles.clearSelectionButton}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255, 255, 255, 0.03)"; }}
                  onClick={() => setSelectedIds(new Set())}
                >
                  Clear selection
                </button>
              </div>
            )}
            <input
              ref={csvInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleCsvImport}
              style={{ display: "none" }}
            />
            <CreateButton
              icon={<UploadFileIcon width={16} height={16} color={themeColors.text} />}
              buttonText={csvImporting ? "Importing..." : "Import CSV"}
              onClick={handleCsvButtonClick}
              disabled={csvImporting}
              data-testid="import-csv-btn"
            />
            <div
              style={{ position: "relative", display: "inline-flex", alignItems: "center" }}
              onMouseEnter={() => setShowCsvHelp(true)}
              onMouseLeave={() => setShowCsvHelp(false)}
            >
              <button
                type="button"
                aria-label="CSV format help"
                onClick={() => setShowCsvHelp((v) => !v)}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  border: `1px solid ${themeColors.border}`,
                  background: "transparent",
                  color: themeColors.text,
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                ?
              </button>
              {showCsvHelp && (
                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    top: "calc(100% + 8px)",
                    minWidth: 340,
                    maxWidth: 460,
                    padding: "12px 14px",
                    borderRadius: 10,
                    border: `1px solid ${themeColors.border}`,
                    background: themeColors.bgSecondary,
                    color: themeColors.text,
                    fontSize: 12,
                    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.24)",
                    zIndex: 20,
                    whiteSpace: "normal",
                    transform: "translateY(0)",
                    animation: "fadeInCsvHelp 140ms ease-out",
                  }}
                >
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>Employees CSV Format</div>
                  <div style={{ opacity: 0.9, marginBottom: 6 }}>
                    Required columns: email, full_name, password_hash
                  </div>
                  <div style={{ opacity: 0.9, marginBottom: 8 }}>
                    Optional columns: role, workstations
                  </div>
                  <div
                    style={{
                      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
                      fontSize: 11,
                      padding: "8px 10px",
                      borderRadius: 6,
                      border: `1px solid ${themeColors.borderLight || themeColors.border}`,
                      background: "rgba(0, 0, 0, 0.08)",
                    }}
                  >
                    email,full_name,password_hash,role,workstations
                    <br />
                    john@example.com,John Doe,$2b$12$...,employee,WS001;WS002
                  </div>
                </div>
              )}
            </div>
            <RefreshButton onClick={withClickLog({ name: "employees/toolbar/refresh", control: "refresh_button" })(fetchUsers)} />
            <CreateButton icon={<CreateUserIcon width={16} height={16} color={themeColors.text} />} buttonText="Create" onClick={() => { setModalEmployee(null); setModalOpen(true); }} />
          </div>
        </div>

        {/* Clean Conditional Rendering */}
        {loading ? (
          <TableSurface>
            <TableSkeleton rows={8} cols={5} />
          </TableSurface>
        ) : layout === "list" ? (
          <TableSurface>
            <UsersTable
              users={filtered} showTitle={showTitle} showWorkstations={showWorkstations} showGroups={showGroups} showFiles={showFiles}
              selectedIds={selectedIds} allVisibleSelected={allVisibleSelected} isIndeterminate={isIndeterminate}
              onToggleSelect={toggleSelect} onToggleSelectAll={toggleSelectAllVisible} onSort={(f) => { setSortDir(sortField === f ? (sortDir === "asc" ? "desc" : "asc") : "asc"); setSortField(f); }} sortField={sortField} sortDir={sortDir}
              onEdit={(u) => { setModalEmployee(u); setModalOpen(true); }} onDelete={handleDelete}
            />
          </TableSurface>
        ) : (
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
        )}
      </div>

      <EmployeesModal open={modalOpen} onClose={() => { setModalOpen(false); setModalEmployee(null); resetCreation(); }} employeeData={modalEmployee} onSubmit={handleModalSubmit} onDelete={handleDelete} creationStatus={status} creationProgress={progress} creationMessage={message} />
      {toast.open && <CustomToast msg={toast.msg} type={toast.type} onClose={() => setToast({ ...toast, open: false })} />}
    </PageShell>
  );
}
