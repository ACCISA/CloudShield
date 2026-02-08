/**
 * AuthTextField.jsx
 *
 * Purpose:
 *   Small wrapper around MUI's OutlinedInput with a label and styling used on auth forms.
 *
 * Props:
 *   - label: string label shown above the input
 *   - placeholder: placeholder text
 *   - value: current input value
 *   - onChange: change handler (e) => void
 *   - type: input type (default: 'text')
 *   - endAdornment: optional adornment element
 */
import React from 'react';
import { Box, Typography, OutlinedInput } from '@mui/material';

/**
 * Renders a labeled text input field for auth forms.
 * @param {Object} props
 * @param {string} props.label - Label displayed above input
 * @param {string} props.placeholder - Placeholder text
 * @param {string} props.value - Current input value
 * @param {Function} props.onChange - Change handler
 * @param {string} [props.type='text'] - Input type (text, email, etc.)
 * @param {React.ReactNode} [props.endAdornment] - Optional end adornment element
 * @returns {JSX.Element} Styled input with label
 */
export default function AuthTextField({
  label,
  placeholder,
  value,
  onChange,
  type = 'text',
  endAdornment,
  onKeyDown,
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
        onKeyDown={onKeyDown}
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
