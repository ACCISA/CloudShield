import React from 'react';
import { Button } from '@mui/material';

export default function PrimaryButton({ children, fullWidth = true, ...rest }) {
  return (
    <Button
      {...rest}
      fullWidth={fullWidth}
      sx={{
        backgroundColor: '#FFFFFF',
        color: '#000000',
        fontSize: '1rem',
        fontWeight: 500,
        textTransform: 'none',
        lineHeight: 1.3,
        borderRadius: '14px',
        paddingY: '14px',
        paddingX: '16px',
        boxShadow: '0 24px 64px rgba(0,0,0,0.75)',
        '&:hover': {
          backgroundColor: '#f5f5f5',
        },
      }}
    >
      {children}
    </Button>
  );
}
