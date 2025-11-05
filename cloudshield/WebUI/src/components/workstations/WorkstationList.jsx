/**
 * WorkstationList.jsx
 *
 * Purpose:
 *   Render a list/grid of workstation rows with actions like edit and connect/disconnect.
 *
 * Props:
 *   - rows: array of workstation objects to display
 *   - onEdit: callback(row) when edit icon clicked
 *   - onToggleStatus: callback(id) to toggle connection status
 */
import React from 'react';
import {
  Box,
  Typography,
  IconButton,
  Chip,
  Checkbox,
  Button,
  Tooltip,
} from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';

/**
 * Renders a status chip based on workstation connection state.
 * @param {Object} props
 * @param {('connected'|'busy'|string)} props.status - Workstation status
 * @returns {JSX.Element} Status chip with appropriate styling
 */
function StatusChip({ status }) {
  if (status === 'connected') {
    return (
      <Chip
        label="Connect"
        size="small"
        icon={<Box sx={{
          width: 10, height: 10, bgcolor: '#1eff6d', borderRadius: '999px', mr: '4px'
        }}/>}
        sx={{
          color: '#fff',
          backgroundColor: '#0e6b2f',
          borderRadius: '22px',
          px: 1,
          '& .MuiChip-icon': { ml: '4px' },
        }}
      />
    );
  }
  if (status === 'busy') {
    return (
      <Chip
        label="Disconnect"
        size="small"
        icon={
          <Box sx={{
            width: 10, height: 10, bgcolor: '#fff', borderRadius: '999px', mr: '4px'
          }}/>
        }
        sx={{
          color: '#fff',
          backgroundColor: '#7c1d1d',
          borderRadius: '22px',
          px: 1,
          '& .MuiChip-icon': { ml: '4px' },
        }}
      />
    );
  }
  return (
    <Chip
      label="Connect"
      size="small"
      icon={<Box sx={{ width: 10, height: 10, bgcolor: '#1eff6d', borderRadius: '999px', mr: '4px' }}/>}
      sx={{
        color: '#fff',
        backgroundColor: '#0e6b2f',
        borderRadius: '22px',
        px: 1,
        '& .MuiChip-icon': { ml: '4px' },
      }}
    />
  );
}

/**
 * Renders a list of workstation rows with edit and status toggle actions.
 * @param {Object} props
 * @param {Array<Object>} props.rows - Array of workstation data objects
 * @param {Function} props.onEdit - Called with workstation row when edit clicked
 * @param {Function} props.onToggleStatus - Called with workstation ID when status toggled
 * @returns {JSX.Element} List of workstation rows
 */
export default function WorkstationList({ rows, onEdit, onToggleStatus }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {rows.map((r, idx) => (
        <Box key={r.id}>
          {/* row */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: '28px 1fr 260px 220px 180px 180px 120px 80px',
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

            {/* name + code */}
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              <Typography sx={{ fontWeight: 600 }}>{r.name}</Typography>
              <Typography sx={{ fontSize: '0.85rem', opacity: 0.8 }}>↳ {r.code}</Typography>
            </Box>

            {/* users */}
            <Typography sx={{ opacity: 0.9 }}>
              Users: <strong>{r.usersCount}</strong>
            </Typography>

            {/* current */}
            <Typography sx={{ opacity: 0.9 }}>
              Current: <strong>{r.currentUser}</strong>
            </Typography>

            {/* last used */}
            <Typography sx={{ opacity: 0.9 }}>
              Last used: <strong>{r.lastUsed}</strong>
            </Typography>

            {/* connect/disconnect button */}
            <Box>
              <Button
                onClick={() => onToggleStatus(r.id)}
                variant="contained"
                disableElevation
                sx={{
                  color: '#fff',
                  backgroundColor: r.status === 'connected' ? '#116e34' : r.status === 'busy' ? '#7c1d1d' : '#116e34',
                  borderRadius: '999px',
                  textTransform: 'none',
                  px: 2,
                  py: 0.5,
                  '&:hover': { backgroundColor: r.status === 'busy' ? '#8a2323' : '#0f612d' },
                }}
              >
                {r.status === 'connected' ? 'Connect' : r.status === 'busy' ? 'Disconnect' : 'Connect'}
              </Button>
            </Box>

            {/* red dot (status light) */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  bgcolor: r.status === 'busy' ? '#ff5252' : '#1eff6d',
                  borderRadius: '999px',
                }}
              />
            </Box>

            {/* edit icon */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
              <Tooltip title="Edit workstation">
                <IconButton
                  onClick={() => onEdit(r)}
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

          {/* divider line except last */}
          {idx !== rows.length - 1 && (
            <Box sx={{ borderTop: '1px solid rgba(255,255,255,0.1)', mx: 1 }} />
          )}
        </Box>
      ))}
    </Box>
  );
}
