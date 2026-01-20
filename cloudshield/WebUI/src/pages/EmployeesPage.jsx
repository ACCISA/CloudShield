import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import PropTypes from 'prop-types';
import { listUsers, deleteUser, createUser } from '../services/usersApi.js';
import { useAuth } from '../context/AuthContext.jsx';

UserTable.propTypes = {
  users: PropTypes.arrayOf(
    PropTypes.shape({
      _id: PropTypes.string.isRequired,
      full_name: PropTypes.string,
      email: PropTypes.string,
      role: PropTypes.string,
      status: PropTypes.string,
    })
  ),

  onDelete: PropTypes.func.isRequired,
  currentUserId: PropTypes.string,
  deletingUserId: PropTypes.string,
};

function UserTable({ users = [], onDelete, currentUserId, deletingUserId }) {
  if (!users.length) {
    return (
      <Box sx={{ py: 6, display: 'flex', justifyContent: 'center', color: 'rgba(255,255,255,0.7)' }}>
        <Typography>No users found.</Typography>
      </Box>
    );
  }

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
  type: PropTypes.oneOf(['success', 'error', 'info', 'warning']),
  onClose: PropTypes.func.isRequired,
};

CustomToast.defaultProps = {
  type: 'success',
};

export default function EmployeesPage() {
  const { accessToken, currentUser } = useAuth();

  // UI State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [layout, setLayout] = useState("list");

  const [sortField, setSortField] = useState("name");
  const [sortDir, setSortDir] = useState("asc");

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
    _original: user 
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

  const currentUserId = currentUser?.id ?? currentUser?._id;
  const isSelfDelete = dialogUser?._id === currentUserId;


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

  // Logic: Filter & Sort
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

      <Paper
        elevation={0}
        sx={{
          borderRadius: '18px',
          border: '1px solid rgba(255,255,255,0.16)',
          backgroundColor: '#0F0F0F',
          minHeight: 280,
          overflow: 'hidden',
        }}
      >
        {loading || authLoading ? (
          <Box sx={{ py: 6, display: 'flex', justifyContent: 'center' }}>
            <CircularProgress size={32} />
          </Box>
        ) : (
          <UserTable 
            users={sortedUsers} 
            onDelete={handleOpenDeleteDialog} 
            currentUserId={currentUser?.id ?? currentUser?._id}
            deletingUserId={deletingUserId}
          />
        )}
      </Paper>

      <Dialog
        open={Boolean(dialogUser)}
        onClose={handleCloseDialog}
        aria-labelledby="confirm-delete-user"
      >
        <DialogTitle id="confirm-delete-user">Delete User</DialogTitle>
        <DialogContent sx={{ minWidth: 360 }}>
          <Stack spacing={2}>
            <Typography>
              Are you sure you want to delete{' '}
              <strong>{dialogUser?.full_name || dialogUser?.email}</strong>?
            </Typography>
            <Typography color="error">This action is permanent.</Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
              The user will be removed from the organization and will lose access immediately.
            </Typography>
            {(deleteError || isSelfDelete) && (
              <Alert severity="error">
                {deleteError || 'You cannot delete your own account.'}
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirmDelete}
            color="error"
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting…' : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={createOpen} onClose={handleCloseCreate} aria-labelledby="create-user-dialog">
        <DialogTitle id="create-user-dialog">Add Employee</DialogTitle>
        <DialogContent sx={{ minWidth: 440 }}>
          <Stack component="form" id="create-user-form" spacing={2} onSubmit={handleCreateUser}>
            <TextField
              label="Full Name"
              value={form.full_name}
              onChange={(e) => setForm((prev) => ({ ...prev, full_name: e.target.value }))}
              required
              autoFocus
              fullWidth
            />
            <TextField
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              required
              fullWidth
            />
            <TextField
              label="Initial Password"
              type="password"
              value={form.password}
              onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
              required
              fullWidth
            />
            <TextField
              select
              label="Role"
              value={form.role}
              onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}
              fullWidth
            >
              <MenuItem value="employee">Employee</MenuItem>
              <MenuItem value="admin">Admin</MenuItem>
            </TextField>
            {createError && (
              <Alert severity="error">{createError}</Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCreate} disabled={isCreating}>
            Cancel
          </Button>
          <Button
            disabled={isCreating}
            variant="contained"
            type="submit"
            form="create-user-form"
          >
            {isCreating ? 'Creating…' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}