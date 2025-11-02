import React from 'react';
import { Paper, Box, Typography } from '@mui/material';

export default function AuthCard({ children }) {
  return (
    <Paper
      variant="rounded"
      sx={{
        width: '100%',
        maxWidth: 480,
        margin: '48px auto',
        backgroundColor: '#111111',
        borderRadius: '20px',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 24px 64px rgba(0,0,0,0.75)',
        padding: { xs: '32px', md: '48px' },
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        color: '#fff',
      }}
    >
      {/* Logo block */}
      <Box sx={{ mb: 4, mt: 2 }}>
        {/* Replace this with your actual SVG logo */}
        <Box
          sx={{
            width: 64,
            height: 64,
            bgcolor: '#fff',
            color: '#000',
            borderRadius: '8px',
            fontWeight: 600,
            fontSize: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          LOGO
        </Box>
      </Box>

      <Box sx={{ width: '100%' }}>
        {children}
      </Box>

      {/* Footer links like "Can't log in?" / "Secure Login with 2FA" */}
      <Box
        sx={{
          width: '100%',
          textAlign: 'center',
          mt: 6,
          color: '#fff',
        }}
      >
        <Typography
          sx={{
            color: '#fff',
            fontSize: '1rem',
            fontWeight: 500,
            textDecoration: 'underline',
            mb: 2,
          }}
        >
          Can’t log in?
        </Typography>
        <Typography
          sx={{
            color: 'rgba(255,255,255,0.6)',
            fontSize: '0.9rem',
            mb: 1,
          }}
        >
          Secure Login with 2FA
        </Typography>
      </Box>
    </Paper>
  );
}
