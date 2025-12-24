/**
 * WorkstationList.jsx
 *
 * Purpose:
 *   Render a list of workstation rows with actions like edit and connect/disconnect,
 *   matching the mock (avatar stack for Users, dot-only for Current, chip-style status).
 *
 * Props:
 *   - rows: array of workstation objects to display
 *   - onEdit(row)
 *   - onToggleStatus(id)
 *   - showUsers: boolean (Display control)
 *   - showCurrent: boolean (Display control)
 *   - showLastUsed: boolean (Display control)
 */

import React from 'react';
import {
  Box,
  Typography,
  IconButton,
  Chip,
  Checkbox,
  Tooltip,
  Avatar,
} from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';

/* ---------------------------- helpers & visuals ---------------------------- */

const colorPool = ['#6573C3', '#00B0FF', '#66BB6A', '#FFB74D', '#BA68C8', '#EF5350'];
const initials = (name = '—') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(s => s[0]?.toUpperCase())
    .join('');

function tinyAvatar(name, i) {
  return (
    <Avatar
      key={`${name}-${i}`}
      sx={{
        width: 24,
        height: 24,
        fontSize: '0.7rem',
        bgcolor: colorPool[i % colorPool.length],
        border: '2px solid #0F0F0F',
      }}
    >
      {initials(name)}
    </Avatar>
  );
}

function UsersPill({ row }) {
  const list = Array.isArray(row.users) && row.users.length
    ? row.users
    : [row.currentUser || '—', 'Michael Scott', 'Dwight Schrute'];

  const show = list.slice(0, 3);
  const extra = Math.max((row.usersCount ?? list.length) - show.length, 0);

  return (
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        {show.map((n, idx) => (
          <Box key={n + idx} sx={{ ml: idx === 0 ? 0 : '-8px' }}>
            {tinyAvatar(n, idx)}
          </Box>
        ))}
      </Box>
      {extra > 0 && (
        <Typography sx={{ ml: 1, fontSize: '0.9rem', opacity: 0.85 }}>+ {extra}</Typography>
      )}
    </Box>
  );
}

function StatusChip({ status }) {
  if (status === 'busy') {
    return (
      <Chip
        label="Disconnect"
        size="small"
        sx={{
          color: '#fff',
          backgroundColor: '#7c1d1d',
          borderRadius: '22px',
          px: 1.25,
        }}
      />
    );
  }
  // connected or disconnected both show green "Connect" in the mock
  return (
    <Chip
      label="Connect"
      size="small"
      sx={{
        color: '#fff',
        backgroundColor: '#116e34',
        borderRadius: '22px',
        px: 1.25,
      }}
    />
  );
}

/* --------------------------------- component -------------------------------- */

export default function WorkstationList({
  rows,
  onEdit,
  onToggleStatus,
  showUsers = true,
  showCurrent = true,
  showLastUsed = true,
}) {
  // Build grid template dynamically based on which columns are visible.
  const cols = [
    '28px',           // checkbox
    '1.2fr',          // name/code with icon
    showUsers ? '0.9fr' : null,
    showCurrent ? '0.6fr' : null,
    showLastUsed ? '0.8fr' : null,
    '0.7fr',          // chip
    '0.25fr',         // status light
    '0.25fr',         // edit
  ].filter(Boolean);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {rows.map((r, idx) => (
        <Box key={r.id}>
          {/* Row */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: cols.join(' '),
              alignItems: 'center',
              gap: '12px',
              color: '#fff',
              py: 1.5,
              px: 1,
              borderRadius: '12px',
              '&:hover': { backgroundColor: 'rgba(255,255,255,0.02)' },
            }}
          >
            {/* select */}
            <Checkbox
              sx={{
                color: 'rgba(255,255,255,0.5)',
                '&.Mui-checked': { color: '#fff' },
              }}
            />

            {/* name + code + leading circle */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
              <Box sx={{ width: 28, height: 28, borderRadius: '999px', bgcolor: '#2A2A2A' }} />
              <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                <Typography sx={{ fontWeight: 600, lineHeight: 1.15 }}>{r.name}</Typography>
                <Typography sx={{ fontSize: '0.85rem', opacity: 0.85, mt: '2px' }}>↳ {r.code}</Typography>
              </Box>
            </Box>

            {/* users */}
            {showUsers && <UsersPill row={r} />}

            {/* current -> dot only */}
            {showCurrent && (
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box sx={{ width: 14, height: 14, borderRadius: '999px', bgcolor: '#8A8A8A' }} />
              </Box>
            )}

            {/* last used */}
            {showLastUsed && <Typography sx={{ opacity: 0.9 }}>{r.lastUsed || '—'}</Typography>}

            {/* status chip (click toggles) */}
            <Box onClick={() => onToggleStatus?.(r.id)} sx={{ cursor: 'pointer' }}>
              <StatusChip status={r.status} />
            </Box>

            {/* status light */}
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  bgcolor: r.status === 'busy' ? '#ff5252' : '#1eff6d',
                  borderRadius: '999px',
                }}
              />
            </Box>

            {/* edit */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
              <Tooltip title="Edit workstation">
                <IconButton
                  onClick={() => onEdit?.(r)}
                  size="small"
                  sx={{
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '10px',
                    '&:hover': { backgroundColor: 'rgba(255,255,255,0.08)' },
                  }}
                >
                  <EditOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          {/* divider */}
          {idx !== rows.length - 1 && (
            <Box sx={{ borderTop: '1px solid rgba(255,255,255,0.1)', mx: 1 }} />
          )}
        </Box>
      ))}
    </Box>
  );
}
