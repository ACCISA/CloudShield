import React, { useState } from 'react';
import { Box, Typography, OutlinedInput, IconButton } from '@mui/material';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';

export default function PasswordField({
  label = 'Password',
  value,
  onChange,
}) {
  const [show, setShow] = useState(false);

  return (
    <Box sx={{ width: '100%', mb: 3 }}>
      <Typography
        sx={{
          color: '#fff',
          fontSize: '0.9rem',
          fontWeight: 500,
          mb: '6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          lineHeight: 1.2,
        }}
      >
        <span>{label}</span>
        {/* in your screenshot, "Hide" text + eye icon appears on the same row as label */}
        <Box
          component="span"
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: '#fff',
            fontSize: '0.9rem',
            fontWeight: 400,
            opacity: 0.8,
            cursor: 'pointer',
          }}
          onClick={() => setShow(!show)}
        >
          {show ? 'Hide' : 'Show'}
          <IconButton
            onClick={() => setShow(!show)}
            size="small"
            sx={{
              color: '#fff',
              p: 0,
            }}
          >
            {show ? (
              <VisibilityOffOutlinedIcon fontSize="small" />
            ) : (
              <VisibilityOutlinedIcon fontSize="small" />
            )}
          </IconButton>
        </Box>
      </Typography>

      <OutlinedInput
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
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
            letterSpacing: '0.15em', // like password dots feel tighter
          },
        }}
      />
    </Box>
  );
}
