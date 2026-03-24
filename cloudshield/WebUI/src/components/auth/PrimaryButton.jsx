/**
 * PrimaryButton.jsx
 *
 * Purpose:
 * Styled primary action button used across auth screens and forms.
 */
import React from 'react';
import { Button } from '@mui/material';

export default function PrimaryButton({ children, fullWidth = true, ...rest }) {
  return (
    <Button
      {...rest}
      fullWidth={fullWidth}
      sx={{
        backgroundColor: "var(--text-primary)",
        color: "var(--bg-primary)",
        fontSize: '1rem',
        fontWeight: 500,
        textTransform: 'none',
        lineHeight: 1.3,
        borderRadius: '14px',
        paddingY: '14px',
        paddingX: '16px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.05)', // Reduced from the massive 64px shadow
        transition: 'all 0.2s ease',
        '&:hover': {
          backgroundColor: "var(--text-primary)",
          opacity: 0.9, // Soft hover effect
        },
        '&:active': {
          transform: 'scale(0.98)'
        },
        '&:disabled': {
          backgroundColor: "var(--action-hover)",
          color: "var(--text-secondary)",
        }
      }}
    >
      {children}
    </Button>
  );
}