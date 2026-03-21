/**
 * PrimaryButton.jsx
 *
 * Purpose:
 *   Styled primary action button used across auth screens and forms.
 *
 * Props:
 *   - children: button label/content
 *   - fullWidth: whether to stretch to container width (default: true)
 *   - ...rest: forwarded props to MUI Button
 */
import React from 'react';
import { Button } from '@mui/material';
import { useThemeColors } from "../../hooks/useThemeColors.js";

/**
 * Styled primary action button for auth forms.
 * @param {Object} props
 * @param {React.ReactNode} props.children - Button content/label
 * @param {boolean} [props.fullWidth=true] - Whether button stretches to container width
 * @param {Object} props.rest - Additional props forwarded to MUI Button
 * @returns {JSX.Element} Styled button component
 */
export default function PrimaryButton({ children, fullWidth = true, ...rest }) {
  const themeColors = useThemeColors();
  return (
    <Button
      {...rest}
      fullWidth={fullWidth}
      sx={{
        backgroundColor: themeColors.primary,
        color: themeColors.primaryText,
        fontSize: '1rem',
        fontWeight: 500,
        textTransform: 'none',
        lineHeight: 1.3,
        borderRadius: '14px',
        paddingY: '14px',
        paddingX: '16px',
        boxShadow: '0 24px 64px rgba(0,0,0,0.75)',
        '&:hover': {
          backgroundColor: themeColors.primaryHover,
        },
      }}
    >
      {children}
    </Button>
  );
}
