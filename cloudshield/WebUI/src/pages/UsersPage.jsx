import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  OutlinedInput,
  IconButton,
  Button,
  Typography,
  Avatar,
  Checkbox,
  Divider,
  Popover,
  MenuItem,
  FormControlLabel,
  Checkbox as MuiCheckbox,
} from '@mui/material';
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined';
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined';
import FilterListOutlinedIcon from '@mui/icons-material/FilterListOutlined';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [anchorDisplay, setAnchorDisplay] = useState(null);
  const [anchorFilter, setAnchorFilter] = useState(null);

  // fetch users
  useEffect(() => {
    fetch('http://localhost:5050/users')
      .then((res) => res.json())
      .then((data) => {
        if (data?.items) setUsers(data.items);
        else {
          // fallback seed
          setUsers([
            {
              _id: '1',
              full_name: 'Michael Scott',
              email: 'michaelscott@dm.com',
              title: 'Regional Manager',
            },
            {
              _id: '2',
              full_name: 'Pam Beesly',
              email: 'pambeesly@dm.com',
              title: 'Receptionist',
            },
            {
              _id: '3',
              full_name: 'Jim Halpert',
              email: 'jimhalpert@dm.com',
              title: 'Salesman',
            },
            {
              _id: '4',
              full_name: 'Dwight Schrute',
              email: 'dwight@dm.com',
              title: 'Assistant to the Regional Manager',
            },
          ]);
        }
      })
      .catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.full_name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.title?.toLowerCase().includes(q)
    );
  }, [search, users]);

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

  const stackedAvatars = (count = 3) => (
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      {Array.from({ length: Math.min(3, count) }).map((_, i) => (
        <Avatar
          key={i}
          sx={{
            width: 28,
            height: 28,
            border: '2px solid #0F0F0F',
            ml: i === 0 ? 0 : -1.2,
            backgroundColor: '#d0d0d0',
          }}
        />
      ))}
      {count > 3 && (
        <Typography sx={{ fontSize: '0.85rem', opacity: 0.8, ml: 1 }}>
          +{count - 3}
        </Typography>
      )}
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Toolbar */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        <OutlinedInput
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search users"
          startAdornment={
            <SearchOutlinedIcon
              sx={{
                color: 'rgba(255,255,255,0.7)',
                fontSize: '1rem',
                mr: '8px',
              }}
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
            py: '6px',
            px: '12px',
            '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
            '& input': { padding: '10px 0' },
            '&.Mui-focused': {
              outline: '2px solid rgba(255,255,255,0.35)',
              outlineOffset: 0,
            },
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
            onClick={() => window.location.reload()}
          >
            <RefreshOutlinedIcon />
          </IconButton>

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
              <Typography
                sx={{ fontSize: '0.8rem', opacity: 0.7, px: 1, pt: 0.5 }}
              >
                Layout
              </Typography>
              <MenuItem sx={{ borderRadius: '8px', opacity: 0.75 }}>Cards</MenuItem>
              <MenuItem sx={{ borderRadius: '8px' }} selected>
                List
              </MenuItem>
            </Box>
          </Popover>

          <Button
            variant="outlined"
            startIcon={<FilterListOutlinedIcon />}
            onClick={(e) => setAnchorFilter(e.currentTarget)}
            sx={pillBtn}
          >
            Filter
          </Button>

          <Button
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
            onClick={() => alert('Open create modal (coming soon)')}
          >
            Create
          </Button>
        </Box>
      </Box>

      {/* List Panel */}
      <Box
        sx={{
          borderRadius: '18px',
          border: '1px solid rgba(255,255,255,0.16)',
          backgroundColor: '#0F0F0F',
          boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
          p: 2,
          overflowX: 'auto',
        }}
      >
        {/* Header */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns:
              '40px 1.8fr 1fr 1fr 1fr 1fr 40px',
            alignItems: 'center',
            px: 2,
            py: 1,
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            minWidth: 880,
          }}
        >
          <Box />
          <Typography sx={{ fontSize: '0.85rem', opacity: 0.7 }}>Name/Email</Typography>
          <Typography sx={{ fontSize: '0.85rem', opacity: 0.7 }}>Title</Typography>
          <Typography sx={{ fontSize: '0.85rem', opacity: 0.7 }}>Workstations</Typography>
          <Typography sx={{ fontSize: '0.85rem', opacity: 0.7 }}>Groups</Typography>
          <Typography sx={{ fontSize: '0.85rem', opacity: 0.7 }}>Files</Typography>
          <Box />
        </Box>

        {/* Rows */}
        {filtered.map((u) => (
          <Box
            key={u._id}
            sx={{
              display: 'grid',
              gridTemplateColumns:
                '40px 1.8fr 1fr 1fr 1fr 1fr 40px',
              alignItems: 'center',
              px: 2,
              py: 1.2,
              borderBottom: '1px solid rgba(255,255,255,0.05)',
              minWidth: 880,
              '&:hover': { backgroundColor: 'rgba(255,255,255,0.04)' },
            }}
          >
            <Checkbox
              sx={{
                color: 'rgba(255,255,255,0.5)',
                '&.Mui-checked': { color: '#fff' },
              }}
            />

            {/* Avatar + Name */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Avatar
                sx={{
                  width: 34,
                  height: 34,
                  backgroundColor: '#bfbfbf',
                }}
              />
              <Box sx={{ textAlign: 'left' }}>
                <Typography
                  sx={{
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    color: '#fff',
                    lineHeight: 1.2,
                  }}
                >
                  {u.full_name}
                </Typography>
                <Typography
                  sx={{
                    fontSize: '0.8rem',
                    opacity: 0.7,
                    lineHeight: 1.3,
                  }}
                >
                  {u.email}
                </Typography>
              </Box>
            </Box>

            {/* Title */}
            <Typography sx={{ fontSize: '0.9rem', color: '#fff' }}>
              {u.title || '—'}
            </Typography>

            {/* Workstations */}
            {stackedAvatars(5)}

            {/* Groups */}
            {stackedAvatars(4)}

            {/* Files */}
            {stackedAvatars(4)}

            {/* Right icons */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: 1,
              }}
            >
              <FiberManualRecordIcon
                sx={{ fontSize: '0.8rem', color: '#f44336' }}
              />
              <EditOutlinedIcon
                sx={{ fontSize: '1.1rem', opacity: 0.8, cursor: 'pointer' }}
              />
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
