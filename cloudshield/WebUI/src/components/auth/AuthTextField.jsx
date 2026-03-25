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
import PropTypes from 'prop-types';
import { Box, Typography, OutlinedInput } from '@mui/material';
import { useThemeColors } from "../../hooks/useThemeColors.js";

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
  const themeColors = useThemeColors();
  return (
    <Box sx={{ width: '100%', mb: 2 }}>
      <Typography
        sx={{
          color: themeColors.text,
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
          backgroundColor: themeColors.inputBg,
          borderRadius: '8px',
          color: themeColors.text,
          fontSize: '0.95rem',
          lineHeight: 1.3,
          border: `1px solid ${themeColors.border}`,
          paddingY: '12px',
          paddingX: '12px',
          '& .MuiOutlinedInput-notchedOutline': {
            border: 'none',
          },
          '&:hover': {
            backgroundColor: themeColors.inputBgHover,
          },
          '&.Mui-focused': {
            outline: `2px solid ${themeColors.borderLight}`,
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

AuthTextField.propTypes = {
  label: PropTypes.string.isRequired,
  placeholder: PropTypes.string,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onChange: PropTypes.func.isRequired,
  type: PropTypes.string,
  endAdornment: PropTypes.node,
  onKeyDown: PropTypes.func,
};

AuthTextField.defaultProps = {
  placeholder: '',
  value: '',
  type: 'text',
  endAdornment: null,
  onKeyDown: undefined,
};
