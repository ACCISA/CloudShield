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

import { listUsers, deleteUser, createUser } from '../services/usersApi.js';
import { useAuth } from '../context/AuthContext.jsx';

function UserTable({ users, onDelete, currentUserId, deletingUserId }) {
  if (!users.length) {
    return (
      <Box sx={{ py: 6, display: 'flex', justifyContent: 'center', color: 'rgba(255,255,255,0.7)' }}>
        <Typography>No users found.</Typography>
      </Box>
    );
  }

  return (
    <Table sx={{ minWidth: 650 }} aria-label="Employees table">
      <TableHead>
        <TableRow>
          <TableCell sx={{ color: 'rgba(255,255,255,0.7)', borderBottomColor: 'rgba(255,255,255,0.12)' }}>Name</TableCell>
          <TableCell sx={{ color: 'rgba(255,255,255,0.7)', borderBottomColor: 'rgba(255,255,255,0.12)' }}>Email</TableCell>
          <TableCell sx={{ color: 'rgba(255,255,255,0.7)', borderBottomColor: 'rgba(255,255,255,0.12)' }}>Role</TableCell>
          <TableCell sx={{ color: 'rgba(255,255,255,0.7)', borderBottomColor: 'rgba(255,255,255,0.12)' }}>Status</TableCell>
          <TableCell sx={{ color: 'rgba(255,255,255,0.7)', borderBottomColor: 'rgba(255,255,255,0.12)' }} align="right">Actions</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {users.map((user) => {
          const isCurrentUser = user._id === currentUserId;
          const isDeleting = user._id === deletingUserId;
          const tooltipTitle = isCurrentUser ? "Cannot delete yourself" : "Delete user";
          
          return (
            <TableRow key={user._id} hover sx={{ '&:last-of-type td': { borderBottom: 0 } }}>
              <TableCell sx={{ borderBottomColor: 'rgba(255,255,255,0.08)' }}>
                {user.full_name || '—'}
              </TableCell>
              <TableCell sx={{ borderBottomColor: 'rgba(255,255,255,0.08)' }}>
                {user.email || '—'}
              </TableCell>
              <TableCell sx={{ textTransform: 'capitalize', borderBottomColor: 'rgba(255,255,255,0.08)' }}>
                {user.role || 'employee'}
              </TableCell>
              <TableCell sx={{ textTransform: 'capitalize', borderBottomColor: 'rgba(255,255,255,0.08)' }}>
                {user.status || 'active'}
              </TableCell>
              <TableCell align="right" sx={{ borderBottomColor: 'rgba(255,255,255,0.08)' }}>
                <Tooltip title={tooltipTitle}>
                  <span>
                    <IconButton
                      aria-label={`Delete user ${user.full_name || user.email}`}
                      onClick={() => onDelete(user)}
                      disabled={isCurrentUser || isDeleting}
                      sx={{
                        color: (isCurrentUser || isDeleting) ? 'rgba(255,255,255,0.3)' : '#fff',
                        borderRadius: '10px',
                        border: '1px solid rgba(255,255,255,0.2)',
                        '&:hover': { 
                          backgroundColor: (isCurrentUser || isDeleting) ? 'transparent' : 'rgba(255,255,255,0.08)' 
                        },
                        '&.Mui-disabled': {
                          color: 'rgba(255,255,255,0.3)',
                          opacity: 0.5,
                          cursor: 'not-allowed',
                        },
                      }}
                      size="small"
                    >
                      {/* Show spinner while deleting this specific user, otherwise show trash icon */}
                      {isDeleting ? (
                        <CircularProgress size={20} sx={{ color: 'rgba(255,255,255,0.5)' }} />
                      ) : (
                        <DeleteOutlineIcon fontSize="small" />
                      )}
                    </IconButton>
                  </span>
                </Tooltip>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

export default function EmployeesPage() {
  const { currentUser, accessToken, authError, authLoading } = useAuth();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState(null);
  const [dialogUser, setDialogUser] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState(null);
  const [deleteError, setDeleteError] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [createError, setCreateError] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [query, setQuery] = useState('');
  const [form, setForm] = useState({
    email: '',
    full_name: '',
    password: '',
    role: 'employee',
  });

  const DEFAULT_LIMIT = 20;
  const DEFAULT_OFFSET = 0;

  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => {
      const nameA = (a.full_name || a.email || '').toLowerCase();
      const nameB = (b.full_name || b.email || '').toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }, [users]);

  const fetchUsers = useCallback(async (signal) => {
    if (!accessToken) {
      return;
    }
    try {
      setLoading(true);
      const data = await listUsers({
        signal,
        token: accessToken,
        search: query,
        limit: DEFAULT_LIMIT,
        offset: DEFAULT_OFFSET,
      });
      setUsers(data);
      setBanner(null);
    } catch (error) {
      if (error.name === 'AbortError') return;
      setBanner({ severity: 'error', message: error.message || 'Failed to load users.' });
    } finally {
      setLoading(false);
    }
  }, [accessToken, query]);

  useEffect(() => {
    if (authLoading) {
      setLoading(true);
      return;
    }

    if (!accessToken) {
      setUsers([]);
      setLoading(false);
      if (authError) {
        setBanner({ severity: 'error', message: authError });
      } else {
        setBanner({ severity: 'warning', message: 'Sign in to view employees.' });
      }
      return;
    }

    const controller = new AbortController();
    fetchUsers(controller.signal);
    return () => controller.abort();
  }, [authLoading, accessToken, authError, fetchUsers]);

  const handleRefresh = () => {
    if (!accessToken) {
      setBanner({ severity: 'warning', message: 'Authentication required to refresh users.' });
      return;
    }
    fetchUsers();
  };

  const handleSearch = () => {
    setQuery(searchTerm.trim());
  };

  const handleSearchKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleSearch();
    }
  };

  const handleOpenCreate = () => {
    setCreateError('');
    setForm({ email: '', full_name: '', password: '', role: 'employee' });
    setCreateOpen(true);
  };

  const handleCloseCreate = () => {
    if (isCreating) return;
    setCreateOpen(false);
    setCreateError('');
  };

  const handleOpenDeleteDialog = (user) => {
    setDeleteError('');
    setDialogUser(user);
  };

  const handleCloseDialog = () => {
    setDeleteError('');
    setDialogUser(null);
    setIsDeleting(false);
    setDeletingUserId(null);
  };

  const isSelfDelete = dialogUser?._id === currentUser?.id;

  const handleConfirmDelete = async () => {
    if (!dialogUser) return;

    if (isSelfDelete) {
      setDeleteError('You cannot delete your own account.');
      return;
    }

    if (!accessToken) {
      setDeleteError('Missing authentication token. Please sign in again.');
      return;
    }

    setIsDeleting(true);
    setDeletingUserId(dialogUser._id);
    try {
      await deleteUser(dialogUser._id, { token: accessToken });
      setUsers((prev) => prev.filter((user) => user._id !== dialogUser._id));
      setBanner({
        severity: 'success',
        message: `${dialogUser.full_name || dialogUser.email || 'User'} was deleted successfully.`,
      });
      handleCloseDialog();
    } catch (error) {
      const message = error.payload?.error || error.message || 'Failed to delete user.';
      setDeleteError(message);
      setBanner({ severity: 'error', message });
      setIsDeleting(false);
      setDeletingUserId(null);
    }
  };

  const handleCreateUser = async (event) => {
    event.preventDefault();
    if (!accessToken) {
      setCreateError('Missing authentication token. Please sign in again.');
      return;
    }

    const email = form.email.trim().toLowerCase();
    const fullName = form.full_name.trim();
    const password = form.password.trim();

    if (!email || !fullName || !password) {
      setCreateError('Full name, email, and password are required.');
      return;
    }

    setIsCreating(true);
    setCreateError('');

    try {
      const payload = {
        email,
        full_name: fullName,
        password,
        role: form.role,
        org_id: currentUser?.org_id || localStorage.getItem('org_id'),
      };

      const result = await createUser(payload, { token: accessToken });

      const newUser = {
        _id: result?.user_id || payload.email,
        email: payload.email,
        full_name: payload.full_name,
        role: payload.role,
        status: result?.status ?? result?.user?.status ?? 'active',
      };

      setUsers((prev) => [newUser, ...prev]);
      setBanner({ severity: 'success', message: `${payload.full_name || payload.email} was created successfully.` });
      setCreateOpen(false);
      setForm({ email: '', full_name: '', password: '', role: 'employee' });
    } catch (error) {
      if (error?.status === 409) {
        setCreateError(error.payload?.error || 'An account with this email already exists.');
      } else if (error?.status === 403) {
        setCreateError(error.payload?.error || 'User limit reached for your plan.');
      } else {
        setCreateError(error.message || 'Failed to create user.');
      }
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={2}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 600 }}>
            Employees
          </Typography>
          <Typography sx={{ color: 'rgba(255,255,255,0.6)', mt: 0.5 }}>
            Manage organization users and remove access for departed employees.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5}>
          <Button
            onClick={handleOpenCreate}
            startIcon={<AddOutlinedIcon />}
            sx={{
              color: '#fff',
              backgroundColor: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '10px',
              textTransform: 'none',
              '&:hover': { backgroundColor: 'rgba(255,255,255,0.14)' },
            }}
          >
            Add Employee
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshOutlinedIcon />}
            onClick={handleRefresh}
            sx={{
              color: '#fff',
              borderColor: 'rgba(255,255,255,0.2)',
              borderRadius: '10px',
              textTransform: 'none',
              '&:hover': { borderColor: 'rgba(255,255,255,0.35)', backgroundColor: 'rgba(255,255,255,0.08)' },
            }}
          >
            Refresh
          </Button>
        </Stack>
      </Stack>

      <Stack direction="row" spacing={1.5} sx={{ maxWidth: 560 }}>
        <TextField
          fullWidth
          size="small"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          placeholder="Search employees"
          variant="outlined"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchOutlinedIcon fontSize="small" sx={{ color: 'rgba(255,255,255,0.7)' }} />
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              backgroundColor: '#161616',
              color: '#fff',
              borderRadius: '10px',
              border: '1px solid rgba(255,255,255,0.18)',
              '& fieldset': { border: 'none' },
            },
          }}
        />
        <Button
          variant="contained"
          onClick={handleSearch}
          sx={{
            textTransform: 'none',
            backgroundColor: '#2471EA',
            borderRadius: '10px',
            '&:hover': { backgroundColor: '#1E5FC7' },
          }}
        >
          Search
        </Button>
      </Stack>

      {banner && (
        <Alert
          severity={banner.severity}
          onClose={() => setBanner(null)}
          sx={{ borderRadius: '12px' }}
        >
          {banner.message}
        </Alert>
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
            currentUserId={currentUser?.id}
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
