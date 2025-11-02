import React from 'react';
import { Box, Typography, Chip, IconButton } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

export default function StatCard({
  title,
  value,
  changeText = '15.2% ↑',
  gradientFrom = '#6a5acd',
  gradientTo = '#9f7aea',
}) {
  return (
    <Box
      sx={{
        flex: '0 0 auto',
        minWidth: 220,
        borderRadius: '12px',
        padding: '16px',
        background: `linear-gradient(135deg, ${gradientFrom} 0%, ${gradientTo} 100%)`,
        color: '#fff',
        boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      {/* Header row: title + plus */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          color: '#fff',
        }}
      >
        <Typography
          sx={{
            color: '#fff',
            fontSize: '1rem',
            lineHeight: 1.3,
            fontWeight: 500,
          }}
        >
          {title}
        </Typography>

        <IconButton
          size="small"
          sx={{
            color: '#fff',
            backgroundColor: 'rgba(0,0,0,0.2)',
            borderRadius: '6px',
            width: 28,
            height: 28,
            '&:hover': {
              backgroundColor: 'rgba(0,0,0,0.3)',
            },
          }}
        >
          <AddIcon sx={{ fontSize: '1rem' }} />
        </IconButton>
      </Box>

      {/* Big number */}
      <Typography
        sx={{
          color: '#fff',
          fontSize: '2.5rem',
          fontWeight: 500,
          lineHeight: 1.2,
        }}
      >
        {value}
      </Typography>

      {/* change chip */}
      <Chip
        label={changeText}
        size="small"
        sx={{
          alignSelf: 'flex-start',
          backgroundColor: '#fff',
          color: '#000',
          fontSize: '0.75rem',
          fontWeight: 500,
          height: '24px',
          borderRadius: '6px',
        }}
      />
    </Box>
  );
}
