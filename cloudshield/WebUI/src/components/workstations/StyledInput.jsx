/**
 * StyledInput.jsx
 *
 * Purpose:
 *   Reusable styled input field for workstation dialogs.
 *
 * Props:
 *   - label: input label text
 *   - value: input value
 *   - onChange: change handler
 *   - placeholder: placeholder text
 */
import React from 'react';
import { Box, Typography, OutlinedInput } from '@mui/material';

/**
 * Styled input field with label for dark theme dialogs.
 * @param {Object} props
 * @param {string} props.label - Input label
 * @param {string} props.value - Input value
 * @param {Function} props.onChange - Change handler
 * @param {string} props.placeholder - Placeholder text
 * @returns {JSX.Element} Styled input field
 */
export default function StyledInput({ label, value, onChange, placeholder, ...props }) {
  return (
    <Box>
      <Typography sx={{ mb: 0.5, fontWeight: 500 }}>{label}</Typography>
      <OutlinedInput
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        sx={{
          width: '100%',
          backgroundColor: '#161616',
          borderRadius: '12px',
          color: '#fff',
          border: '1px solid rgba(255,255,255,0.18)',
          '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
        }}
        {...props}
      />
    </Box>
  );
}
