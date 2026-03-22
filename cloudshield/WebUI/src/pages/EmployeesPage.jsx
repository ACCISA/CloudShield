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
import { sharedIconViewStyles } from "../components/common/styles/iconViewStyles.js";
import { managementToolbarStyles } from "../components/common/styles/managementToolbarStyles.js";

// Backend & Context
import {
  listUsers,
  deleteUser,
  createUser,
  updateUser,
} from "../services/usersApi.js";
import { apiUploadFile } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useAsyncTask } from "../hooks/useAsyncTask.js";

// Toast Notification
const CustomToast = ({ msg, type, onClose }) => {
  if (!msg) return null;

  const styles = {
    position: "fixed",
    bottom: "24px",
    right: "24px",
    padding: "12px 24px",
    borderRadius: "12px",
    backgroundColor: type === "error" ? "#d32f2f" : "#2e7d32",
    color: "#fff",
    fontSize: "1rem",
    boxShadow: "0 8px 20px rgba(0,0,0,0.35)",
    zIndex: 9999,
    display: "flex",
    alignItems: "center",
    animation: "fadeIn 0.3s ease-in-out",
    cursor: "pointer",
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div
      style={styles}
      onClick={onClose}
      role="button"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      aria-label="Close notification"
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
    for (const w of ws) {
      if (!workstationMap.has(w)) {
        workstationMap.set(w, { id: w, name: w, hostname: w });
      }
    }
  }
  const userWorkstations = Array.from(workstationMap.values());

  const fileShareMap = new Map();
  for (const g of memberGroups) {
    const fs = Array.isArray(g.file_shares) ? g.file_shares : [];
    for (const f of fs) {
      if (!fileShareMap.has(f)) {
        fileShareMap.set(f, { id: f, name: f, drive: f });
      }
    }
  }
  const userFileShares = Array.from(fileShareMap.values());

  return {
    id: user._id,
    name: user.full_name || user.email,
    email: user.email,
    title: user.role || "Employee",
    workstations: userWorkstations,
    workstationCount: userWorkstations.length,
    groups: userGroups,
    groupCount: userGroups.length,
    files: userFileShares,
    fileCount: userFileShares.length,
    status: user.status || "offline",
    profileImage: user.profile_image || null,
    _original: user,
  };
}

const styles = {
  ...managementToolbarStyles,
  ...sharedIconViewStyles,
  iconFooter: {
    marginTop: "auto",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
};

export default function EmployeesPage() {
  const location = useLocation();
  const { accessToken, currentUser } = useAuth();
  const withClickLog = useClickLogger({ page: "employees" });

  // Job creation task hook
  const { status, message, progress, executeTask: startCreation, reset: resetCreation } = useAsyncTask();

  // CSV import file input ref
  const csvInputRef = useRef(null);
  const [csvImporting, setCsvImporting] = useState(false);

  // Resolve org_id with a localStorage fallback; return null when unavailable.
  const orgId = useMemo(() => {
    if (currentUser?.org_id && currentUser.org_id !== "default-org") {
      return currentUser.org_id;
    }
    try {
      const stored = localStorage.getItem("org_id");
      if (stored) return stored;
    } catch (e) {
      console.error("Error reading org_id from localStorage:", e);
    }
    return null;
  }, [currentUser]);

  // UI State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalEmployee, setModalEmployee] = useState(null);

  // Open modal if navigated from dashboard
  useEffect(() => {
    if (location.state?.openModal) {
      setModalOpen(true);
      setModalEmployee(null);
      // Clear the state to prevent reopening on subsequent renders
      window.history.replaceState({}, document.title);
    }
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

  const [activeFilters, setActiveFilters] = useState({
    status: new Set(),
  });

  const [toast, setToast] = useState({ open: false, msg: "", type: "success" });

  const openToast = (msg, type = "success") => {
    setToast({ open: true, msg, type });
    setTimeout(() => setToast({ open: false, msg: "", type: "success" }), 3000);
  };

  // Resolve auth token at call-time (handles post-login context lag safely).
  const resolveAuthToken = () => {
    try {
      return localStorage.getItem("jwt") || accessToken || null;
    } catch {
      return accessToken || null;
    }
  };

  // Helper for auth headers
  const getAuthHeader = () => {
    const token = resolveAuthToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  /**
   * Update group memberships for a user.
   * Fetches all groups, determines current membership, and updates accordingly.
   * @param {string} userId - The user ID to update group memberships for
   * @param {Array} newGroups - Array of new group objects {id, name, ...} to be members of
   */
  const updateUserGroupMemberships = async (userId, newGroups) => {
    const newGroupIds = newGroups.map((g) => String(g.id || g._id));

    // Fetch all groups to determine current membership and update
    const res = await fetch("http://127.0.0.1:5050/api/access-groups", {
      method: "GET",
      credentials: "include",
      headers: { "Content-Type": "application/json", ...getAuthHeader() },
    });

    if (!res.ok) {
      console.error("Failed to fetch groups for membership update");
      return;
    }

    const data = await res.json();
    const allGroups = data.access_groups || [];

    // Determine current group membership
    const currentGroupIds = allGroups
      .filter((g) => {
        const members = Array.isArray(g.members) ? g.members : [];
        return members.some((m) => String(m) === String(userId));
      })
      .map((g) => String(g.id || g._id));

    // Groups to add user to (in newGroups but not in currentGroups)
    const toAdd = newGroupIds.filter((id) => !currentGroupIds.includes(id));
    // Groups to remove user from (in currentGroups but not in newGroups)
    const toRemove = currentGroupIds.filter((id) => !newGroupIds.includes(id));

    // Update groups that need the user added
    for (const groupId of toAdd) {
      const group = allGroups.find((g) => String(g.id || g._id) === groupId);
      if (!group) continue;

      const currentMembers = Array.isArray(group.members) ? group.members : [];
      if (!currentMembers.some((m) => String(m) === String(userId))) {
        const updatedMembers = [...currentMembers, userId];
        await fetch(`http://127.0.0.1:5050/api/access-groups/${groupId}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json", ...getAuthHeader() },
          body: JSON.stringify({ members: updatedMembers }),
        });
      }
    }

    // Update groups that need the user removed
    for (const groupId of toRemove) {
      const group = allGroups.find((g) => String(g.id || g._id) === groupId);
      if (!group) continue;

      const currentMembers = Array.isArray(group.members) ? group.members : [];
      const updatedMembers = currentMembers.filter((m) => String(m) !== String(userId));
      if (updatedMembers.length !== currentMembers.length) {
        await fetch(`http://127.0.0.1:5050/api/access-groups/${groupId}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json", ...getAuthHeader() },
          body: JSON.stringify({ members: updatedMembers }),
        });
      }
    }
  };

  // API Actions
  const fetchUsers = useCallback(async () => {
    const token = resolveAuthToken();
    if (!token) return;

    setLoading(true);
    try {
      // Fetch users
      const data = await listUsers({
        token,
        search: search,
        limit: 100,
        offset: 0,
      });

      // Fetch groups to calculate membership counts
      let allGroups = [];
      try {
        const groupsRes = await fetch("http://127.0.0.1:5050/api/access-groups", {
          method: "GET",
          credentials: "include",
          headers: { "Content-Type": "application/json", ...getAuthHeader() },
        });
        if (groupsRes.ok) {
          const groupsData = await groupsRes.json();
          allGroups = groupsData.access_groups || [];
        }
      } catch (e) {
        console.warn("Failed to fetch groups for enrichment:", e);
      }

      // Map users and enrich with group/workstation/file data
      const mappedUsers = Array.isArray(data)
        ? data.map((user) => enrichUser(user, allGroups))
        : [];

      if (mappedUsers.length > 0) {
        console.log(
          "Sample user org_id format:",
          mappedUsers[0]._original.org_id,
        );
      }
      setUsers(mappedUsers);
    } catch (error) {
      console.error("Failed to fetch users", error);
      openToast(error.message || "Failed to load users", "error");
    } finally {
      setLoading(false);
    }
  }, [accessToken, search]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleModalSubmit = async (payload) => {
    const token = resolveAuthToken();
    if (!token) {
      openToast("You must be logged in to create a user", "error");
      return;
    }

    try {
      const isEdit = Boolean(modalEmployee);

      if (isEdit) {
        // Edit mode
        trackButton("employees/edit/submit", {
          page: "employees",
          id: modalEmployee.id,
          control: "edit_dialog",
        });
        const apiPayload = {
          full_name: `${payload.firstName} ${payload.lastName}`,
          email: payload.email,
          role: payload.jobTitle,
          profile_image: payload.profileImage || null,
        };

        await updateUser(modalEmployee.id, apiPayload, { token });

        // Update group memberships if groups were provided
        if (payload.groups) {
          await updateUserGroupMemberships(modalEmployee.id, payload.groups);
        }

        openToast("User updated successfully");
        setModalOpen(false);
        setModalEmployee(null);
        fetchUsers();
      } else {
        // Create mode - queue DC user creation task and poll for completion
        trackButton("employees/create/submit", {
          page: "employees",
          control: "create_dialog",
        });
        const apiPayload = {
          email: payload.email,
          full_name: `${payload.firstName} ${payload.lastName}`,
          password: payload.password || "DefaultPass123!",
          role: payload.jobTitle?.toLowerCase().includes("admin")
            ? "admin"
            : "employee",
          org_id: orgId || "cedric",
          profile_image: payload.profileImage || null,
        };

        // Start async task to create user
        await startCreation(async () => {
          const response = await createUser(apiPayload, { token });
          if (!response?.job_id) {
            throw new Error("No job_id returned from user creation");
          }
          return response.job_id;
        });
      }
    } catch (error) {
      // Show detailed validation errors if available
      let msg = "Failed to save user";
      if (error.payload?.details && Array.isArray(error.payload.details)) {
        const passwordError = error.payload.details.find((d) =>
          d.loc?.includes("password"),
        );
        if (passwordError) {
          msg = passwordError.msg || msg;
        }
      } else if (error.payload?.error) {
        msg = error.payload.error;
      } else if (error.message) {
        msg = error.message;
      }
      openToast(msg, "error");
    }
  };
  
  // Handle job completion
  useEffect(() => {
    if (status === "succeeded") {
      openToast("User created successfully");
      resetCreation();
      setModalOpen(false);
      setModalEmployee(null);
      fetchUsers();
    } else if (status === "failed") {
      openToast(message || "Failed to create user", "error");
    }
  }, [status, message]);

  const handleDelete = async (user) => {
    // Use provided user or fall back to modalEmployee for modal context
    const userToDelete = user || modalEmployee;
    const token = resolveAuthToken();

    if (!token || !userToDelete) return;

    if (userToDelete.id === currentUser?.id) {
      openToast("You cannot delete your own account", "error");
      return;
    }

    try {
      trackButton("employees/edit/delete", {
        page: "employees",
        id: userToDelete.id,
        control: user ? "table_row" : "edit_dialog",
      });
      await deleteUser(userToDelete.id, { token });
      setUsers((prev) => prev.filter((u) => u.id !== userToDelete.id));
      openToast("User deleted successfully");

      // Only close modal if we were deleting from modal context
      if (!user && modalEmployee) {
        setModalOpen(false);
        setModalEmployee(null);
      }
    } catch (error) {
      openToast(error.message || "Failed to delete user", "error");
    }
  };

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

    if (q) {
      out = out.filter((u) =>
        [u.name, u.email, u.title].some((v) => v.toLowerCase().includes(q)),
      );
    }

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

  const { allVisibleSelected, isIndeterminate } = useMemo(() => {
    const hasSelected = filtered.some((u) => selectedIds.has(u.id));
    const allAreSelected =
      filtered.length > 0 && filtered.every((u) => selectedIds.has(u.id));
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
    const hasSelected = filtered.some((u) => selectedIds.has(u.id));
    const allAreSelected =
      filtered.length > 0 && filtered.every((u) => selectedIds.has(u.id));

    setSelectedIds((prev) => {
      if (hasSelected && !allAreSelected) {
        // Indeterminate state - deselect all
        const next = new Set(prev);
        filtered.forEach((u) => next.delete(u.id));
        return next;
      } else if (!hasSelected) {
        // Nothing selected - select all
        const next = new Set(prev);
        filtered.forEach((u) => next.add(u.id));
        return next;
      } else {
        // All selected - deselect all
        const next = new Set(prev);
        filtered.forEach((u) => next.delete(u.id));
        return next;
      }
    });
  };

  const toggleSort = (field) => {
    const nextDir =
      sortField === field ? (sortDir === "asc" ? "desc" : "asc") : "asc";
    setSortField(field);
    setSortDir(nextDir);
    trackButton("employees/table/sort", {
      page: "employees",
      field,
      direction: nextDir,
    });
  };

  const filterGroups = [
    {
      id: "status",
      label: "Status",
      type: "checkbox",
      options: [
        { value: "active", label: "Active" },
        { value: "offline", label: "Offline" },
      ],
    },
  ];

  const handleFilterChange = (groupId, value, isActive) => {
    trackButton("employees/filter/change", {
      page: "employees",
      groupId,
      value,
      active: isActive,
      control: "filter_button",
    });
    const applyFilter = createFilterChangeHandler(setActiveFilters);
    applyFilter(groupId, value, isActive);
  };

  const selectedCount = useMemo(
    () => filtered.filter((u) => selectedIds.has(u.id)).length,
    [filtered, selectedIds],
  );

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const getUserMenuItems = (user) => [
    {
      icon: <EditIcon width={15} height={16} color="#1a1a1a" />,
      label: "edit user",
      color: "#1a1a1a",
      onClick: () => {
        setModalEmployee(user);
        setModalOpen(true);
      },
    },
    {
      icon: <TrashIcon width={12} height={14} color="#D51616" />,
      label: "delete user",
      color: "#D51616",
      onClick: () => handleDelete(user),
    },
  ];

  return (
    <div className="page-layout">
      {/* Toolbar */}
      <div style={styles.toolbar}>
        <div style={styles.leftActions}>
          <SearchField
            value={search}
            onChange={setSearch}
            onKeyDown={(e) => {
              if (e.key === "Enter") fetchUsers();
            }}
            placeholder="Search users"
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
            onLayoutChange={handleLayoutChange}
            columnToggles={{
              columns: [
                { key: "showTitle", label: "Title", checked: showTitle },
                {
                  key: "showWorkstations",
                  label: "Workstations",
                  checked: showWorkstations,
                },
                { key: "showGroups", label: "Groups", checked: showGroups },
                { key: "showFiles", label: "Shares", checked: showFiles },
              ],
              onToggle: (column) => {
                if (column === "showTitle") setShowTitle((prev) => !prev);
                if (column === "showWorkstations")
                  setShowWorkstations((prev) => !prev);
                if (column === "showGroups") setShowGroups((prev) => !prev);
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
                    "rgba(255, 255, 255, 0.08)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background =
                    "rgba(255, 255, 255, 0.03)";
                }}
              >
                Clear selection
              </button>
            </div>
          )}
          <RefreshButton
            onClick={withClickLog({
              name: "employees/toolbar/refresh",
              control: "refresh_button",
            })(fetchUsers)}
            isLoading={loading}
          />

          {/* Hidden file input for CSV import */}
          <input
            ref={csvInputRef}
            type="file"
            accept=".csv"
            onChange={handleCsvImport}
            style={{ display: "none" }}
          />

          <CreateButton
            icon={<UploadFileIcon width={16} height={16} color="#fff" />}
            buttonText={csvImporting ? "Importing..." : "Import CSV"}
            onClick={handleCsvButtonClick}
            disabled={csvImporting}
            title="CSV Format: email,full_name,password_hash,role. Use bcrypt hashes from your previous system. Role is optional (defaults to 'employee')."
          />

          <CreateButton
            icon={<CreateUserIcon width={16} height={16} color="#fff" />}
            buttonText="Create"
            onClick={withClickLog({
              name: "employees/toolbar/open-create",
              control: "create_button",
            })(() => {
              setModalEmployee(null);
              setModalOpen(true);
            })}
          />
        </div>
      </div>

      {layout === "list" ? (
        <div className="page-list-wrapper">
          <UsersTable
            users={filtered}
            showTitle={showTitle}
            showWorkstations={showWorkstations}
            showGroups={showGroups}
            showFiles={showFiles}
            selectedIds={selectedIds}
            allVisibleSelected={allVisibleSelected}
            isIndeterminate={isIndeterminate}
            onToggleSelect={toggleSelect}
            onToggleSelectAll={toggleSelectAllVisible}
            onSort={toggleSort}
            sortField={sortField}
            sortDir={sortDir}
            onEdit={(u) => {
              trackButton("employees/table/open-edit", {
                page: "employees",
                id: u.id,
              });
              setModalEmployee(u);
              setModalOpen(true);
            }}
            onDelete={handleDelete}
          />
        </div>
      ) : (
        <div style={styles.iconsWrapper}>
          <IconSelectionBar
            styles={styles}
            allVisibleSelected={allVisibleSelected}
            isIndeterminate={isIndeterminate}
            onToggleSelectAll={toggleSelectAllVisible}
            selectedCount={selectedCount}
          />

          <div style={styles.iconsGrid}>
            {filtered.map((user) => {
              const selected = selectedIds.has(user.id);
              return (
                <div
                  key={user.id}
                  style={{
                    ...styles.iconCard,
                    ...(selected ? styles.iconCardSelected : {}),
                  }}
                >
                  <div style={styles.iconCardHeader}>
                    <Checkbox
                      checked={selected}
                      onChange={() => toggleSelect(user.id)}
                    />
                    <EditButton menuItems={getUserMenuItems(user)} />
                  </div>

                  <div style={styles.iconTitle}>
                    <DisplayIcon type="user" data={user} size="small" />
                    <div style={styles.iconTitleText}>
                      <span style={styles.iconName}>{user.name}</span>
                      <span style={styles.iconSub}>↳ {user.email}</span>
                    </div>
                  </div>

                  {showTitle && (
                    <div style={styles.iconMetaRow}>
                      <span style={styles.iconMetaLabel}>Title</span>
                      <span style={styles.iconMetaValue}>{user.title || "—"}</span>
                    </div>
                  )}
                  {showWorkstations && (
                    <div style={styles.iconMetaRow}>
                      <span style={styles.iconMetaLabel}>Workstations</span>
                      <span style={styles.iconMetaValue}>
                        {user.workstationCount ?? user.workstations?.length ?? 0}
                      </span>
                    </div>
                  )}
                  {showGroups && (
                    <div style={styles.iconMetaRow}>
                      <span style={styles.iconMetaLabel}>Groups</span>
                      <span style={styles.iconMetaValue}>
                        {user.groupCount ?? user.groups?.length ?? 0}
                      </span>
                    </div>
                  )}
                  {showFiles && (
                    <div style={styles.iconMetaRow}>
                      <span style={styles.iconMetaLabel}>Shares</span>
                      <span style={styles.iconMetaValue}>
                        {user.fileCount ?? user.files?.length ?? 0}
                      </span>
                    </div>
                  )}

                  <div style={styles.iconFooter}>
                    <span style={styles.iconMetaLabel}>{user.status || "offline"}</span>
                    <ActiveIcon
                      width={12}
                      height={12}
                      outerColor={user.status === "online" ? "#1F381F" : "#381F1F"}
                      innerColor={user.status === "online" ? "#04C40A" : "#ff5252"}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal */}
      <EmployeesModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setModalEmployee(null);
          resetCreation();
        }}
        employeeData={modalEmployee}
        onSubmit={handleModalSubmit}
        onDelete={handleDelete}
        creationStatus={status}
        creationProgress={progress}
        creationMessage={message}
      />

      {toast.open && (
        <CustomToast
          msg={toast.msg}
          type={toast.type}
          onClose={() => setToast({ ...toast, open: false })}
        />
      )}
    </div>
  );
}
