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
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined';

import { listUsers, deleteUser } from '../services/usersApi.js';
import { useAuth } from '../context/AuthContext.jsx';

function UserTable({ users, onDelete }) {
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
        {users.map((user) => (
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
              <Tooltip title="Delete user">
                <IconButton
                  aria-label={`Delete user ${user.full_name || user.email}`}
                  onClick={() => onDelete(user)}
                  sx={{
                    color: '#fff',
                    borderRadius: '10px',
                    border: '1px solid rgba(255,255,255,0.2)',
                    '&:hover': { backgroundColor: 'rgba(255,255,255,0.08)' },
                  }}
                  size="small"
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </TableCell>
          </TableRow>
        ))}
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
  const [deleteError, setDeleteError] = useState('');

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
      const data = await listUsers({ signal, token: accessToken });
      setUsers(data);
      setBanner(null);
    } catch (error) {
      if (error.name === 'AbortError') return;
      setBanner({ severity: 'error', message: error.message || 'Failed to load users.' });
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

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

  const handleOpenDeleteDialog = (user) => {
    setDeleteError('');
    setDialogUser(user);
  };

  const handleCloseDialog = () => {
    setDeleteError('');
    setDialogUser(null);
    setIsDeleting(false);
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
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 600 }}>
            Employees
          </Typography>
          <Typography sx={{ color: 'rgba(255,255,255,0.6)', mt: 0.5 }}>
            Manage organization users and remove access for departed employees.
          </Typography>
        </Box>
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
          <UserTable users={sortedUsers} onDelete={handleOpenDeleteDialog} />
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
    </Box>
  );
}
