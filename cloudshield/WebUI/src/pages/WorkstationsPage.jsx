import React, { useMemo, useState } from 'react';
import { Box, IconButton, OutlinedInput, Typography, Popover, Button, MenuItem, Divider } from '@mui/material';
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined';
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';

import WorkstationList from '../components/workstations/WorkstationList.jsx';
import WorkstationCreateDialog from '../components/workstations/WorkstationCreateDialog.jsx';
import WorkstationEditDialog from '../components/workstations/WorkstationEditDialog.jsx';

const seed = [
  {
    id: 'ws-1',
    name: 'Development',
    code: 'WS-001',
    usersCount: 3,
    currentUser: 'Jim Halpert',
    lastUsed: '03/11/2025',
    status: 'connected',       // connected | disconnected | busy
  },
  {
    id: 'ws-2',
    name: 'Marketing',
    code: 'WS-002',
    usersCount: 2,
    currentUser: 'Pam Beasly',
    lastUsed: '—',
    status: 'busy',
  },
  {
    id: 'ws-3',
    name: 'Development',
    code: 'WS-001',
    usersCount: 3,
    currentUser: 'Jim Halpert',
    lastUsed: '03/11/2025',
    status: 'connected',
  },
  {
    id: 'ws-4',
    name: 'Development',
    code: 'WS-001',
    usersCount: 3,
    currentUser: 'Jim Halpert',
    lastUsed: '03/11/2025',
    status: 'connected',
  },
];

export default function WorkstationsPage() {
  const [rows, setRows] = useState(seed);
  const [search, setSearch] = useState('');
  const [anchorEl, setAnchorEl] = useState(null);

  // dialogs
  const [openCreate, setOpenCreate] = useState(false);
  const [editRow, setEditRow] = useState(null); // holds the row being edited or null

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r =>
      [r.name, r.code, r.currentUser].some(v => (v || '').toLowerCase().includes(q))
    );
  }, [rows, search]);

  const handleCreate = (payload) => {
    const newRow = {
      id: `ws-${Date.now()}`,
      name: payload.name,
      code: payload.code || 'WS-NEW',
      usersCount: payload.users?.length || 0,
      currentUser: payload.users?.[0] || '—',
      lastUsed: '—',
      status: 'disconnected',
    };
    setRows(prev => [newRow, ...prev]);
  };

  const handleEditSave = (id, changes) => {
    setRows(prev => prev.map(r => (r.id === id ? { ...r, ...changes } : r)));
  };

  const handleDelete = (id) => {
    setRows(prev => prev.filter(r => r.id !== id));
  };

  const handleToggleStatus = (id) => {
    setRows(prev =>
      prev.map(r => {
        if (r.id !== id) return r;
        if (r.status === 'connected') return { ...r, status: 'disconnected' };
        if (r.status === 'disconnected') return { ...r, status: 'connected' };
        return r; // busy unchanged
      })
    );
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Toolbar */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <OutlinedInput
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search workstations"
          startAdornment={
            <SearchOutlinedIcon
              sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '1rem', mr: '8px' }}
            />
          }
          sx={{
            flex: '1 1 420px',
            minWidth: '260px',
            maxWidth: '680px',
            backgroundColor: '#161616',
            borderRadius: '12px',
            color: '#fff',
            fontSize: '0.95rem',
            border: '1px solid rgba(255,255,255,0.18)',
            paddingY: '6px',
            paddingX: '12px',
            '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
            '& input': { padding: '10px 0' },
            '&.Mui-focused': { outline: '2px solid rgba(255,255,255,0.35)', outlineOffset: 0 },
          }}
        />

        <Box sx={{ display: 'flex', gap: '10px' }}>
          <IconButton
            size="small"
            sx={{
              color: '#fff',
              backgroundColor: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '10px',
              width: 40,
              height: 40,
              '&:hover': { backgroundColor: 'rgba(255,255,255,0.14)' },
            }}
            onClick={() => console.log('refresh')}
          >
            <RefreshOutlinedIcon />
          </IconButton>

          {/* Display popover */}
          <Button
            variant="outlined"
            startIcon={<TuneOutlinedIcon />}
            onClick={(e) => setAnchorEl(e.currentTarget)}
            sx={{
              color: '#fff',
              borderColor: 'rgba(255,255,255,0.2)',
              borderRadius: '12px',
              textTransform: 'none',
              px: 1.5,
              '&:hover': { borderColor: 'rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.07)' },
            }}
          >
            Display
          </Button>
          <Popover
            open={Boolean(anchorEl)}
            anchorEl={anchorEl}
            onClose={() => setAnchorEl(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            transformOrigin={{ vertical: 'top', horizontal: 'left' }}
            PaperProps={{
              sx: {
                backgroundColor: '#111',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.16)',
                borderRadius: '12px',
                width: 260,
              },
            }}
          >
            <Box sx={{ p: 1 }}>
              <Typography sx={{ fontSize: '0.8rem', opacity: 0.7, px: 1, pt: 1, pb: 0.5 }}>
                Layout
              </Typography>
              <MenuItem sx={{ borderRadius: '8px' }}>Cards</MenuItem>
              <MenuItem sx={{ borderRadius: '8px' }} selected>List</MenuItem>
              <Divider sx={{ my: 1, borderColor: 'rgba(255,255,255,0.12)' }} />
              <Typography sx={{ fontSize: '0.8rem', opacity: 0.7, px: 1, pt: 1, pb: 0.5 }}>
                Ordering
              </Typography>
              <MenuItem sx={{ borderRadius: '8px' }}>Date created</MenuItem>
              <MenuItem sx={{ borderRadius: '8px' }}>Users</MenuItem>
              <Divider sx={{ my: 1, borderColor: 'rgba(255,255,255,0.12)' }} />
              <MenuItem sx={{ borderRadius: '8px' }}>Active users</MenuItem>
            </Box>
          </Popover>

          {/* Create */}
          <Button
            onClick={() => setOpenCreate(true)}
            startIcon={<AddOutlinedIcon />}
            sx={{
              color: '#fff',
              backgroundColor: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '12px',
              textTransform: 'none',
              px: 1.5,
              '&:hover': { backgroundColor: 'rgba(255,255,255,0.14)' },
            }}
          >
            Create
          </Button>
        </Box>
      </Box>

      {/* List panel */}
      <Box
        sx={{
          borderRadius: '18px',
          border: '1px solid rgba(255,255,255,0.16)',
          backgroundColor: '#0F0F0F',
          boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
          p: 2,
        }}
      >
        <WorkstationList
          rows={filtered}
          onEdit={(row) => setEditRow(row)}
          onToggleStatus={handleToggleStatus}
        />
      </Box>

      {/* Create dialog */}
      <WorkstationCreateDialog
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        onCreate={(payload) => {
          handleCreate(payload);
          setOpenCreate(false);
        }}
      />

      {/* Edit dialog */}
      {!!editRow && (
        <WorkstationEditDialog
          open
          row={editRow}
          onClose={() => setEditRow(null)}
          onSave={(changes) => {
            handleEditSave(editRow.id, changes);
            setEditRow(null);
          }}
          onDelete={() => {
            handleDelete(editRow.id);
            setEditRow(null);
          }}
        />
      )}
    </Box>
  );
}
