import React from 'react';
import { Box } from '@mui/material';

export default function OtpCodeInput({ values = [], onChange }) {
  // values: array of length 6 like ['','','','','','']
  // onChange(index, newChar)

  return (
    <Box
      sx={{
        display: 'flex',
        gap: '12px',
        flexWrap: 'nowrap',
        justifyContent: 'center',
        width: '100%',
        mb: 4,
      }}
    >
      {values.map((digit, idx) => (
        <Box
          key={idx}
          component="input"
          value={digit}
          maxLength={1}
          onChange={e => {
            const v = e.target.value.slice(-1); // last char only
            onChange(idx, v);
          }}
          sx={{
            width: '48px',
            height: '64px',
            backgroundColor: '#161616',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.18)',
            color: '#fff',
            fontSize: '1.5rem',
            fontWeight: 500,
            lineHeight: 1,
            textAlign: 'center',
            outline: 'none',
            '&:focus': {
              outline: '2px solid rgba(255,255,255,0.4)',
              outlineOffset: '0px',
            },
          }}
        />
      ))}
    </Box>
  );
}
