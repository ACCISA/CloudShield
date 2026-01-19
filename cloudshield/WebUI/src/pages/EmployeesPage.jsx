import React, { useState, useEffect, useMemo, useCallback } from "react";
import PropTypes from "prop-types"; // Import PropTypes for validation

// Noah's Custom UI Components
import UsersTable from "../components/users/UsersTable.jsx";
import UserEditModal from "../components/users/UserEditModal.jsx";
import UserCreateModal from "../components/users/UserCreateModal.jsx";
import SearchField from "../components/common/SearchField/SearchField.jsx";
import CreateButton from "../components/common/CreateButton/CreateButton.jsx";
import RefreshButton from "../components/common/RefreshButton/RefreshButton.jsx";
import DisplayButton from "../components/common/DisplayButton/DisplayButton.jsx";
import FilterButton from "../components/common/FilterButton/FilterButton.jsx";
import CreateUserIcon from "../assets/CreateUserIcon.jsx";

// Richard's Backend Logic & Context
import { listUsers, deleteUser, createUser, updateUser } from '../services/usersApi.js';
import { useAuth } from '../context/AuthContext.jsx';

// --- Simple Custom Toast Component (Replaces MUI Snackbar) ---
const CustomToast = ({ msg, type, onClose }) => {
  if (!msg) return null;

  const styles = {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    padding: '12px 24px',
    borderRadius: '12px',
    backgroundColor: type === 'error' ? '#d32f2f' : '#2e7d32', // Red for error, Green for success
    color: '#fff',
    fontSize: '1rem',
    boxShadow: '0 8px 20px rgba(0,0,0,0.35)',
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    animation: 'fadeIn 0.3s ease-in-out',
    cursor: 'pointer'
  };

  // Accessibility fix: Keyboard support for the clickable div
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
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

// PropTypes validation (Fixes SonarCloud "missing in props validation")
CustomToast.propTypes = {
  msg: PropTypes.string.isRequired,
  type: PropTypes.oneOf(['success', 'error', 'info', 'warning']),
  onClose: PropTypes.func.isRequired,
};

CustomToast.defaultProps = {
  type: 'success',
};

export default function EmployeesPage() {
  // --- Auth & Context ---
  const { accessToken, currentUser } = useAuth();

  // --- UI State ---
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [layout, setLayout] = useState("list");
  
  // Note: Removed unused state variables (showTitle, showWorkstations, etc.)
  // and passed them directly as props to UsersTable to fix "Unused variable" Code Smells.

  const [sortField, setSortField] = useState("name");
  const [sortDir, setSortDir] = useState("asc");

  // --- Data State ---
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  
  // Filter state
  const [activeFilters, setActiveFilters] = useState({
    status: new Set(),
  });

  // Toast State
  const [toast, setToast] = useState({ open: false, msg: "", type: "success" });

  const openToast = (msg, type = "success") => {
    setToast({ open: true, msg, type });
    // Auto-hide after 3 seconds
    setTimeout(() => setToast({ open: false, msg: "", type: "success" }), 3000);
  };

  // --- Helpers ---
  
  // Maps Backend API Object -> UI Component Object
  const mapUserToUI = (user) => ({
    id: user._id,
    name: user.full_name || user.email, 
    email: user.email,
    title: user.role || "Employee",
    // Defaults to 0 if backend doesn't send these yet
    workstations: user.workstations || 0, 
    groups: user.groups || 0,
    files: user.files || 0,
    status: user.status || "offline",
    _original: user 
  });

  // --- API Actions ---

  const fetchUsers = useCallback(async () => {
    if (!accessToken) return;
    
    setLoading(true);
    try {
      // Calls Richard's API
      const data = await listUsers({
        token: accessToken,
        search: search, 
        limit: 100, 
        offset: 0,
      });

      const mappedUsers = Array.isArray(data) ? data.map(mapUserToUI) : [];
      setUsers(mappedUsers);
      
    } catch (error) {
      console.error("Failed to fetch users", error);
      openToast(error.message || "Failed to load users", "error");
    } finally {
      setLoading(false);
    }
  }, [accessToken, search]);

  // Initial Fetch
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleCreate = async (payload) => {
    if (!accessToken) {
        openToast("You must be logged in to create a user", "error");
        return;
    }

    try {
      const apiPayload = {
        email: payload.email,
        full_name: `${payload.firstName} ${payload.lastName}`,
        password: payload.password || "Password123!", 
        role: payload.jobTitle?.toLowerCase().includes("admin") ? "admin" : "employee",
        org_id: currentUser?.org_id,
      };

      await createUser(apiPayload, { token: accessToken });
      
      openToast("User created successfully");
      setCreateModalOpen(false);
      fetchUsers(); 

    } catch (error) {
      const msg = error.payload?.error || error.message || "Failed to create user";
      openToast(msg, "error");
    }
  };

  const handleUpdate = async (id, payload) => {
    if (!accessToken) return;

    try {
      const apiPayload = {
        full_name: `${payload.firstName} ${payload.lastName}`,
        email: payload.email,
        role: payload.jobTitle,
      };

      await updateUser(id, apiPayload, { token: accessToken });
      
      openToast("User updated successfully");
      setEditModalOpen(false);
      fetchUsers();

    } catch (error) {
      console.error(error);
      openToast("Update failed: Check API implementation", "error");
    }
  };

  const handleDelete = async (id) => {
    if (!accessToken) return;
    
    if (id === currentUser?.id) {
        openToast("You cannot delete your own account", "error");
        return;
    }

    try {
      await deleteUser(id, { token: accessToken });
      setUsers((prev) => prev.filter((u) => u.id !== id)); 
      openToast("User deleted successfully");
      setEditModalOpen(false); 
    } catch (error) {
      openToast(error.message || "Failed to delete user", "error");
    }
  };

  // --- Filtering & Sorting (Noah's Logic) ---

  const filtered = useMemo(() => {
    let out = [...users];
    
    const q = search.trim().toLowerCase();
    
    if (q) {
      out = out.filter((u) =>
        [u.name, u.email, u.title].some((v) => v.toLowerCase().includes(q))
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

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
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

  return (
    <div style={styles.container}>
      {/* Toolbar */}
      <div style={styles.toolbar}>
        <div style={styles.leftActions}>
          <SearchField
            value={search}
            onChange={setSearch} 
            onKeyDown={(e) => { if (e.key === 'Enter') fetchUsers(); }} 
            placeholder="Search users"
            width="420px"
            showIcon={true}
            style={{
              flex: "1 1 260px",
              minWidth: "260px",
              maxWidth: "680px",
            }}
          />

          <DisplayButton layout={layout} onLayoutChange={setLayout} />

          <FilterButton
            filterGroups={filterGroups}
            activeFilters={activeFilters}
            onFilterChange={handleFilterChange}
          />
        </div>

        <div style={styles.rightActions}>
          <RefreshButton onClick={fetchUsers} isLoading={loading} />

          <CreateButton
            icon={<CreateUserIcon width={16} height={16} color="#fff" />}
            buttonText="Create"
            onClick={() => setCreateModalOpen(true)}
          />
        </div>
      </div>

      <UsersTable
        users={filtered}
        showTitle={true}
        showWorkstations={true}
        showGroups={true}
        showFiles={true}
        onSort={toggleSort}
        sortField={sortField}
        sortDir={sortDir}
        onEdit={(u) => {
          setEditTarget(u);
          setEditModalOpen(true);
        }}
        onDelete={(u) => handleDelete(u.id)}
      />

      {/* Modals */}
      {editTarget && (
        <UserEditModal
            open={editModalOpen}
            onClose={() => setEditModalOpen(false)}
            data={editTarget}
            onSubmit={(payload) => handleUpdate(editTarget.id, payload)}
            onDelete={() => handleDelete(editTarget.id)}
        />
      )}

      <UserCreateModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSubmit={handleCreate}
      />

      {/* Custom Toast Notification (No MUI) */}
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