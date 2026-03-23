import React, { useState, useEffect, useMemo, useCallback } from "react";
import PropTypes from "prop-types";
import { useLocation } from "react-router-dom";
import { useClickLogger } from "../hooks/useClickLogger";
import { useThemeColors } from "../hooks/useThemeColors.js";
import { trackButton } from "../lib/analytics";

// UI Components
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

import { getUserErrorMessage } from "../lib/errors.js";
import { formatShares } from "../lib/format.js";
import { safeAsync } from "../lib/safeAsync.js";

// Backend & Context
import {
  listUsers,
  deleteUser,
  createUser,
  updateUser,
} from "../services/usersApi.js";
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
    color: "text.primary",
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
    fileCountDisplay: formatShares(userFileShares.length),
    sharesDisplay: formatShares(userFileShares.length),
    status: user.status || "offline",
    profileImage: user.profile_image || null,
    _original: user,
  };
}

const styles = {
  ...managementToolbarStyles,
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
  const themeColors = useThemeColors();
  
  const iconViewStyles = getSharedIconViewStyles(themeColors);
  const dynamicStyles = { ...styles, ...iconViewStyles };
  
  const { status, message, progress, executeTask: startCreation, reset: resetCreation } = useAsyncTask();

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

  const [modalOpen, setModalOpen] = useState(false);
  const [modalEmployee, setModalEmployee] = useState(null);

  useEffect(() => {
    if (location.state?.openModal) {
      setModalOpen(true);
      setModalEmployee(null);
      window.history.replaceState({}, document.title);
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

  const normalizeErrorMessage = (error, fallback) => {
    const msg = getUserErrorMessage(error);
    return !msg || msg === "Something went wrong. Please try again."
      ? fallback
      : msg;
  };

  const makeToastAdapter = (fallback) => ({
    error: (msg) =>
      openToast(
        !msg || msg === "Something went wrong. Please try again."
          ? fallback
          : msg,
        "error"
      ),
  });

  const resolveAuthToken = () => {
    try {
      return localStorage.getItem("jwt") || accessToken || null;
    } catch {
      return accessToken || null;
    }
  };

  const getAuthHeader = () => {
    const token = resolveAuthToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const updateUserGroupMemberships = async (userId, newGroups) => {
    const newGroupIds = newGroups.map((g) => String(g.id || g._id));

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

    const currentGroupIds = allGroups
      .filter((g) => {
        const members = Array.isArray(g.members) ? g.members : [];
        return members.some((m) => String(m) === String(userId));
      })
      .map((g) => String(g.id || g._id));

    const toAdd = newGroupIds.filter((id) => !currentGroupIds.includes(id));
    const toRemove = currentGroupIds.filter((id) => !newGroupIds.includes(id));

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

 const fetchUsers = useCallback(async () => {
    const token = resolveAuthToken();
    if (!token) return;

    setLoading(true);

    try {
      const data = await safeAsync(
        () =>
          listUsers({
            token,
            search,
            limit: 100,
            offset: 0,
          }),
        { toast: makeToastAdapter("Failed to load users") }
      );

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

      const mappedUsers = Array.isArray(data)
        ? data.map((user) => enrichUser(user, allGroups))
        : [];

      setUsers(mappedUsers);
    } catch (error) {
      console.error("Failed to fetch users", error);
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

        if (payload.groups) {
          await updateUserGroupMemberships(modalEmployee.id, payload.groups);
        }

        openToast("User updated successfully");
        setModalOpen(false);
        setModalEmployee(null);
        fetchUsers();
      } else {
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

        await startCreation(async () => {
          const response = await createUser(apiPayload, { token });
          if (!response?.job_id) {
            throw new Error("No job_id returned from user creation");
          }
          return response.job_id;
        });
      }
    } catch (error) {
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
      } else {
        msg = normalizeErrorMessage(error, "Failed to save user");
      }
      openToast(msg, "error");
    }
  };
  
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

      await safeAsync(
        () => deleteUser(userToDelete.id, { token }),
        { toast: makeToastAdapter("Failed to delete user") }
      );

      setUsers((prev) => prev.filter((u) => u.id !== userToDelete.id));
      openToast("User deleted successfully");

      if (!user && modalEmployee) {
        setModalOpen(false);
        setModalEmployee(null);
      }
    } catch (error) {
      console.error("Failed to delete user", error);
    }
  };

  const handleLayoutChange = (value) => {
    trackButton("employees/display/toggle", {
      page: "employees",
      layout: value,
    });
    setLayout(value);
  };

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
        const next = new Set(prev);
        filtered.forEach((u) => next.delete(u.id));
        return next;
      } else if (!hasSelected) {
        const next = new Set(prev);
        filtered.forEach((u) => next.add(u.id));
        return next;
      } else {
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
      icon: <EditIcon width={15} height={16} color={themeColors.text} />,
      label: "edit user",
      color: themeColors.text,
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
    <PageShell>
      <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 24, minHeight: 0 }}>
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
                    e.currentTarget.style.background = themeColors.lightOverlay;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = themeColors.lightOverlaySubtle;
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

            <CreateButton
              icon={<CreateUserIcon width={16} height={16} color={themeColors.text} />}
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
          <TableSurface>
            {loading ? (
              <TableSkeleton rows={6} cols={5} />
            ) : (
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
            )}
          </TableSurface>
        ) : (
          <div style={dynamicStyles.iconsWrapper}>
            <IconSelectionBar
              styles={dynamicStyles}
              allVisibleSelected={allVisibleSelected}
              isIndeterminate={isIndeterminate}
              onToggleSelectAll={toggleSelectAllVisible}
              selectedCount={selectedCount}
            />

            <div style={dynamicStyles.iconsGrid}>
              {filtered.length === 0 && !loading ? (
                <div style={{ gridColumn: "1 / -1", margin: "32px 0" }}>
                  <EmptyState 
                    message="No users found" 
                    description="Try adjusting your search or filters, or create a new user." 
                  />
                </div>
              ) : (
                filtered.map((user) => {
                  const selected = selectedIds.has(user.id);
                  return (
                    <div
                      key={user.id}
                      style={{
                        ...dynamicStyles.iconCard,
                        ...(selected ? dynamicStyles.iconCardSelected : {}),
                      }}
                    >
                      <div style={dynamicStyles.iconCardHeader}>
                        <Checkbox
                          checked={selected}
                          onChange={() => toggleSelect(user.id)}
                        />
                        <EditButton menuItems={getUserMenuItems(user)} />
                      </div>

                      <div style={dynamicStyles.iconTitle}>
                        <DisplayIcon type="user" data={user} size="small" />
                        <div style={dynamicStyles.iconTitleText}>
                          <span style={dynamicStyles.iconName}>{user.name}</span>
                          <span style={dynamicStyles.iconSub}>↳ {user.email}</span>
                        </div>
                      </div>

                      {showTitle && (
                        <div style={dynamicStyles.iconMetaRow}>
                          <span style={dynamicStyles.iconMetaLabel}>Title</span>
                          <span style={dynamicStyles.iconMetaValue}>{user.title || "—"}</span>
                        </div>
                      )}

                      {showWorkstations && (
                        <div style={dynamicStyles.iconMetaRow}>
                          <span style={dynamicStyles.iconMetaLabel}>Workstations</span>
                          <span style={dynamicStyles.iconMetaValue}>
                            {user.workstationCount ?? user.workstations?.length ?? 0}
                          </span>
                        </div>
                      )}

                      {showGroups && (
                        <div style={dynamicStyles.iconMetaRow}>
                          <span style={dynamicStyles.iconMetaLabel}>Groups</span>
                          <span style={dynamicStyles.iconMetaValue}>
                            {user.groupCount ?? user.groups?.length ?? 0}
                          </span>
                        </div>
                      )}

                      {showFiles && (
                        <div style={dynamicStyles.iconMetaRow}>
                          <span style={dynamicStyles.iconMetaLabel}>Shares</span>
                          <span style={dynamicStyles.iconMetaValue}>
                            {user.fileCountDisplay ??
                              formatShares(user.fileCount ?? user.files?.length ?? 0)}
                          </span>
                        </div>
                      )}

                      <div style={dynamicStyles.iconFooter}>
                        <span style={dynamicStyles.iconMetaLabel}>
                          {user.status || "offline"}
                        </span>
                        <ActiveIcon
                          width={12}
                          height={12}
                          outerColor={user.status === "online" ? "#1F381F" : "#381F1F"}
                          innerColor={user.status === "online" ? "#04C40A" : "#ff5252"}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

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
    </PageShell>
  );
}