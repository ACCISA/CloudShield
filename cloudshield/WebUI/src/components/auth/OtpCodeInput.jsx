/**
 * OtpCodeInput.jsx
 *
 * Purpose:
 *   Simple UI for entering a multi-digit one-time code (OTP) used during 2FA flows.
 *
 * Props:
 *   - values: array of single-character strings for each digit (e.g. ['','','',...])
 *   - onChange: function(index, newChar) called when a digit changes
 *
 * Notes:
 *   - Keyboard/focus handling is minimal here; parent may manage focus if needed.
 */
import React from 'react';
import { Box } from '@mui/material';

/**
 * Renders a multi-digit OTP code input with individual digit boxes.
 * @param {Object} props
 * @param {string[]} [props.values=[]] - Array of single-character strings for each digit
 * @param {Function} props.onChange - Called with (index, newChar) when a digit changes
 * @returns {JSX.Element} Row of individual input boxes
 */
export default function OtpCodeInput({ values = [], onChange }) {
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
