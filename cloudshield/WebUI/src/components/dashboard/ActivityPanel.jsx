/**
 * ActivityPanel.jsx
 *
 * Purpose:
 *   List recent activities with a small search and refresh control. Used on dashboard.
 *
 * Notes:
 *   - Local example data is used; wire to real API in the parent page/service.
 */
import React, { useState } from 'react';
import {
  Box,
  Typography,
  IconButton,
  OutlinedInput,
} from '@mui/material';
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';

/**
 * Displays a searchable list of recent user activities.
 * @returns {JSX.Element} Activity panel with search and refresh controls
 */
export default function ActivityPanel() {
  // Local search filter state
  const [search, setSearch] = useState('');
  
  // Mock activity data (replace with API call in production)
  const rows = [
    {
      user: 'Michael Scott',
      date: '10/11/2025 11:36 pm',
      activity: 'Uploaded file to group',
    },
    {
      user: 'Michael Scott',
      date: '10/11/2025 11:36 pm',
      activity: 'Uploaded file to group',
    },
    {
      user: 'Michael Scott',
      date: '10/11/2025 11:36 pm',
      activity: 'Uploaded file to group',
    },
    {
      user: 'Michael Scott',
      date: '10/11/2025 11:36 pm',
      activity: 'Uploaded file to group',
    },
    {
      user: 'Michael Scott',
      date: '10/11/2025 11:36 pm',
      activity: 'Uploaded file to group',
    },
  ];

  return (
    <Box
      sx={{
        flex: 1,
        minWidth: 0,
        backgroundColor: '#0F0F0F',
        borderRadius: '16px',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 24px 64px rgba(0,0,0,0.7)',
        color: '#fff',
        padding: '16px',
        mt: '24px',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header row */}
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '12px',
          justifyContent: 'space-between',
          mb: 2,
        }}
      >
        <Typography
          sx={{
            color: '#fff',
            fontSize: '1.1rem',
            fontWeight: 500,
            lineHeight: 1.3,
          }}
        >
          Recent activity
        </Typography>

        <Box
          sx={{
            flex: '1 1 auto',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
            minWidth: 0,
          }}
        >
          <IconButton
            size="small"
            sx={{
              color: '#fff',
              backgroundColor: 'rgba(255,255,255,0.07)',
              borderRadius: '8px',
              width: 32,
              height: 32,
              '&:hover': {
                backgroundColor: 'rgba(255,255,255,0.12)',
              },
            }}
          >
            <RefreshOutlinedIcon sx={{ fontSize: '1rem' }} />
          </IconButton>

          <OutlinedInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search activities"
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
              flex: '0 1 320px',
              maxWidth: '100%',
              minWidth: '200px',
              backgroundColor: '#161616',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '0.9rem',
              border: '1px solid rgba(255,255,255,0.18)',
              paddingY: '4px',
              paddingX: '12px',
              '& .MuiOutlinedInput-notchedOutline': {
                border: 'none',
              },
              '& input': {
                padding: '8px 0',
              },
              '&.Mui-focused': {
                outline: '2px solid rgba(255,255,255,0.4)',
                outlineOffset: 0,
              },
            }}
          />
        </Box>
      </Box>

      {/* Table header */}
      <Box
        sx={{
          color: '#fff',
          fontSize: '0.8rem',
          fontWeight: 500,
          opacity: 0.8,
          display: 'grid',
          gridTemplateColumns: '1fr 180px 1fr',
          columnGap: '16px',
          paddingX: '8px',
          paddingY: '8px',
        }}
      >
        <Box>User ↑</Box>
        <Box>Date ↑</Box>
        <Box>Activity ↑</Box>
      </Box>

      {/* Rows */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {rows.map((row, idx) => (
          <Box
            key={idx}
            sx={{
              display: 'grid',
              gridTemplateColumns: '1fr 180px 1fr',
              columnGap: '16px',
              backgroundColor: '#3a3a3a',
              borderRadius: '8px',
              fontSize: '0.8rem',
              lineHeight: 1.4,
              color: '#fff',
              paddingX: '8px',
              paddingY: '8px',
              alignItems: 'center',
            }}
          >
            {/* user with avatar chip */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Box
                sx={{
                  width: 16,
                  height: 16,
                  backgroundColor: '#ffffff',
                  borderRadius: '999px',
                  border: '1px solid #000',
                  flexShrink: 0,
                }}
              />
              <Box sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                {row.user}
              </Box>
            </Box>

            <Box
              sx={{
                fontSize: '0.8rem',
                color: 'rgba(255,255,255,0.8)',
                whiteSpace: 'nowrap',
              }}
            >
              {row.date}
            </Box>

            <Box
              sx={{
                fontSize: '0.8rem',
                color: '#fff',
                fontWeight: 500,
              }}
            >
              {row.activity}
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
