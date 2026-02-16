import React, { useState, useEffect, useMemo, useCallback } from "react";
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
import { createFilterChangeHandler } from "../utils/filterHelpers.js";

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

const styles = {
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
};

export default function EmployeesPage() {
  const location = useLocation();
  const { accessToken, currentUser } = useAuth();
  const withClickLog = useClickLogger({ page: "employees" });
  
  // Job creation task hook
  const { jobId, status, message, progress, executeTask: startCreation, reset: resetCreation } = useAsyncTask();

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

  // Mappers
  const mapUserToUI = (user) => ({
    id: user._id,
    name: user.full_name || user.email,
    email: user.email,
    title: user.role || "Employee",
    workstations: user.workstations || 0,
    groups: user.groups || 0,
    files: user.files || 0,
    status: user.status || "offline",
    _original: user,
  });

  // API Actions
  const fetchUsers = useCallback(async () => {
    if (!accessToken) return;

    setLoading(true);
    try {
      const data = await listUsers({
        token: accessToken,
        search: search,
        limit: 100,
        offset: 0,
      });

      const mappedUsers = Array.isArray(data) ? data.map(mapUserToUI) : [];
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
    if (!accessToken) {
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
        };

        await updateUser(modalEmployee.id, apiPayload, { token: accessToken });
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
        };

        // Start async task to create user
        await startCreation(async () => {
          const response = await createUser(apiPayload, { token: accessToken });
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

    if (!accessToken || !userToDelete) return;

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
      await deleteUser(userToDelete.id, { token: accessToken });
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
          <RefreshButton
            onClick={withClickLog({
              name: "employees/toolbar/refresh",
              control: "refresh_button",
            })(fetchUsers)}
            isLoading={loading}
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
