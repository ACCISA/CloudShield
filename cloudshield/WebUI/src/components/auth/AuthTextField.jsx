import React from 'react';
import { Box, Typography, OutlinedInput } from '@mui/material';

export default function AuthTextField({
  label,
  placeholder,
  value,
  onChange,
  type = 'text',
  endAdornment,
}) {
  return (
    <Box sx={{ width: '100%', mb: 2 }}>
      <Typography
        sx={{
          color: '#fff',
          fontSize: '0.9rem',
          fontWeight: 500,
          mb: '6px',
        }}
      >
        {label}
      </Typography>

      <OutlinedInput
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={onChange}
        endAdornment={endAdornment}
        sx={{
          width: '100%',
          backgroundColor: '#161616',
          borderRadius: '8px',
          color: '#fff',
          fontSize: '0.95rem',
          lineHeight: 1.3,
          border: '1px solid rgba(255,255,255,0.18)',
          paddingY: '12px',
          paddingX: '12px',
          '& .MuiOutlinedInput-notchedOutline': {
            border: 'none',
          },
          '&:hover': {
            backgroundColor: '#1a1a1a',
          },
          '&.Mui-focused': {
            outline: '2px solid rgba(255,255,255,0.4)',
            outlineOffset: '0px',
          },
          '& input': {
            padding: 0,
          },
        }}
      />
    </Box>
  );
}
