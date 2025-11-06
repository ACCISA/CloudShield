import React, { useMemo, useState } from 'react';
import {
  Box,
  IconButton,
  OutlinedInput,
  Button,
  MenuItem,
  Divider,
  Popover,
  Typography,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined';
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined';
import FilterListOutlinedIcon from '@mui/icons-material/FilterListOutlined';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';

import WorkstationList from '../components/workstations/WorkstationList.jsx';
import WorkstationCreateDialog from '../components/workstations/WorkstationCreateDialog.jsx';
import WorkstationEditDialog from '../components/workstations/WorkstationEditDialog.jsx';

/* ----------------------------------- seed ---------------------------------- */

const seed = [
  {
    id: 'ws-1',
    name: 'Development',
    code: 'WS-001',
    usersCount: 3,
    users: ['Jim Halpert', 'Pam Beasly', 'Dwight Schrute'],
    currentUser: 'Jim Halpert',
    lastUsed: '03/11/2025',
    status: 'connected',
  },
  {
    id: 'ws-2',
    name: 'Marketing',
    code: 'WS-002',
    usersCount: 2,
    users: ['Pam Beasly', 'Michael Scott'],
    currentUser: 'Pam Beasly',
    lastUsed: '—',
    status: 'busy',
  },
  {
    id: 'ws-3',
    name: 'Development',
    code: 'WS-001',
    usersCount: 3,
    users: ['Jim Halpert', 'Dwight Schrute', 'Michael Scott'],
    currentUser: 'Jim Halpert',
    lastUsed: '03/11/2025',
    status: 'connected',
  },
  {
    id: 'ws-4',
    name: 'Development',
    code: 'WS-001',
    usersCount: 3,
    users: ['Jim Halpert', 'Pam Beasly', 'Dwight Schrute'],
    currentUser: 'Jim Halpert',
    lastUsed: '03/11/2025',
    status: 'connected',
  },
];

/* ---------------------------------- page ----------------------------------- */

export default function WorkstationsPage() {
  const [rows, setRows] = useState(seed);
  const [search, setSearch] = useState('');

  // Display state (looks like mock: both buttons to the right of the search)
  const [anchorDisplay, setAnchorDisplay] = useState(null);
  const [showUsersCol, setShowUsersCol] = useState(true);
  const [showCurrentCol, setShowCurrentCol] = useState(true);
  const [showLastUsedCol, setShowLastUsedCol] = useState(true);

  // Filter state
  const [anchorFilter, setAnchorFilter] = useState(null);
  const [statusFilters, setStatusFilters] = useState(new Set()); // empty = all
  const [requireActiveUsers, setRequireActiveUsers] = useState(false);

  // dialogs
  const [openCreate, setOpenCreate] = useState(false);
  const [editRow, setEditRow] = useState(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    let data = rows;

    // text search
    if (q) {
      data = data.filter(r =>
        [r.name, r.code, r.currentUser].some(v => (v || '').toLowerCase().includes(q))
      );
    }

    // status filter
    if (statusFilters.size > 0) {
      data = data.filter(r => statusFilters.has(r.status));
    }

    // active users filter
    if (requireActiveUsers) {
      data = data.filter(r => (r.usersCount ?? 0) > 0);
    }

    return data;
  }, [rows, search, statusFilters, requireActiveUsers]);

  const toggleStatusFilter = (value) => {
    setStatusFilters(prev => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  };

  const handleCreate = (payload) => {
    const newRow = {
      id: `ws-${Date.now()}`,
      name: payload.name,
      code: payload.code || 'WS-NEW',
      usersCount: payload.users?.length || 0,
      users: payload.users || [],
      currentUser: payload.users?.[0] || '—',
      lastUsed: '—',
      status: 'disconnected',
    };
    setRows(prev => [newRow, ...prev]);
  };

  const handleEditSave = (id, changes) => {
    setRows(prev => prev.map(r => (r.id === id ? { ...r, ...changes } : r)));
  };

  const handleDelete = (id) => setRows(prev => prev.filter(r => r.id !== id));

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

  // shared button styles (to match your mock)
  const pillBtn = {
    color: '#fff',
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: '12px',
    textTransform: 'none',
    px: 1.5,
    height: 40,
    '& .MuiButton-startIcon': { mr: 1 },
    '&:hover': {
      borderColor: 'rgba(255,255,255,0.35)',
      background: 'rgba(255,255,255,0.07)',
    },
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Toolbar */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <OutlinedInput
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search workstations"
          startAdornment={<SearchOutlinedIcon sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '1rem', mr: '8px' }} />}
          sx={{
            flex: '1 1 420px',
            minWidth: '260px',
            maxWidth: '680px',
            backgroundColor: '#161616',
            borderRadius: '12px',
            color: '#fff',
            fontSize: '0.95rem',
            border: '1px solid rgba(255,255,255,0.18)',
            py: '6px',
            px: '12px',
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

          {/* Display */}
          <Button
            variant="outlined"
            startIcon={<TuneOutlinedIcon />}
            onClick={(e) => setAnchorDisplay(e.currentTarget)}
            sx={pillBtn}
          >
            Display
          </Button>
          <Popover
            open={Boolean(anchorDisplay)}
            anchorEl={anchorDisplay}
            onClose={() => setAnchorDisplay(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            transformOrigin={{ vertical: 'top', horizontal: 'left' }}
            PaperProps={{
              sx: {
                backgroundColor: '#111',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.16)',
                borderRadius: '12px',
                width: 280,
              },
            }}
          >
            <Box sx={{ p: 1.5 }}>
              <Typography sx={{ fontSize: '0.8rem', opacity: 0.7, px: 1, pt: 0.5, pb: 0.5 }}>
                Layout
              </Typography>
              <MenuItem sx={{ borderRadius: '8px', opacity: 0.75 }}>Cards</MenuItem>
              <MenuItem sx={{ borderRadius: '8px' }} selected>
                List
              </MenuItem>

              <Divider sx={{ my: 1.2, borderColor: 'rgba(255,255,255,0.12)' }} />

              <Typography sx={{ fontSize: '0.8rem', opacity: 0.7, px: 1, pt: 0.5, pb: 0.5 }}>
                Columns
              </Typography>
              <Box sx={{ px: 1 }}>
                <FormControlLabel
                  control={<Checkbox checked={showUsersCol} onChange={(e) => setShowUsersCol(e.target.checked)} sx={{ color: '#fff', '&.Mui-checked': { color: '#fff' } } } />}
                  label="Users"
                />
                <FormControlLabel
                  control={<Checkbox checked={showCurrentCol} onChange={(e) => setShowCurrentCol(e.target.checked)} sx={{ color: '#fff', '&.Mui-checked': { color: '#fff' } } } />}
                  label="Current"
                />
                <FormControlLabel
                  control={<Checkbox checked={showLastUsedCol} onChange={(e) => setShowLastUsedCol(e.target.checked)} sx={{ color: '#fff', '&.Mui-checked': { color: '#fff' } } } />}
                  label="Last used"
                />
              </Box>
            </Box>
          </Popover>

          {/* Filter */}
          <Button
            variant="outlined"
            startIcon={<FilterListOutlinedIcon />}
            onClick={(e) => setAnchorFilter(e.currentTarget)}
            sx={pillBtn}
          >
            Filter
          </Button>
          <Popover
            open={Boolean(anchorFilter)}
            anchorEl={anchorFilter}
            onClose={() => setAnchorFilter(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            transformOrigin={{ vertical: 'top', horizontal: 'left' }}
            PaperProps={{
              sx: {
                backgroundColor: '#111',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.16)',
                borderRadius: '12px',
                width: 280,
              },
            }}
          >
            <Box sx={{ p: 1.5 }}>
              <Typography sx={{ fontSize: '0.8rem', opacity: 0.7, px: 1, pt: 0.5, pb: 0.5 }}>
                Status
              </Typography>
              <Box sx={{ px: 1 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={statusFilters.has('connected')}
                      onChange={() => toggleStatusFilter('connected')}
                      sx={{ color: '#fff', '&.Mui-checked': { color: '#fff' } }}
                    />
                  }
                  label="Connected"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={statusFilters.has('disconnected')}
                      onChange={() => toggleStatusFilter('disconnected')}
                      sx={{ color: '#fff', '&.Mui-checked': { color: '#fff' } }}
                    />
                  }
                  label="Disconnected"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={statusFilters.has('busy')}
                      onChange={() => toggleStatusFilter('busy')}
                      sx={{ color: '#fff', '&.Mui-checked': { color: '#fff' } }}
                    />
                  }
                  label="Busy"
                />
              </Box>

              <Divider sx={{ my: 1.2, borderColor: 'rgba(255,255,255,0.12)' }} />

              <FormControlLabel
                sx={{ px: 1 }}
                control={
                  <Checkbox
                    checked={requireActiveUsers}
                    onChange={(e) => setRequireActiveUsers(e.target.checked)}
                    sx={{ color: '#fff', '&.Mui-checked': { color: '#fff' } }}
                  />
                }
                label="Has active users"
              />
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
              height: 40,
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
          showUsers={showUsersCol}
          showCurrent={showCurrentCol}
          showLastUsed={showLastUsedCol}
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
