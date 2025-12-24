// WebUI/src/theme/theme.js
import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'dark',
    background: {
      default: '#0A0A0A', // page bg
      paper: '#111111',   // card bg
    },
    text: {
      primary: '#FFFFFF',
      secondary: '#9E9E9E',
    },
    divider: 'rgba(255,255,255,0.12)',
    primary: {
      main: '#000000', // not actually used for the white button; we'll custom style that
    },
  },
  shape: {
    borderRadius: 12, // base radius, we'll override per component
  },
  typography: {
    fontFamily: `'Inter', system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif`,
    body1: {
      fontSize: '0.95rem',
      lineHeight: 1.4,
    },
  },
  components: {
    // We'll tune MUI components so they look like your Figma base
    MuiPaper: {
      styleOverrides: {
        rounded: {
          borderRadius: '20px', // card big radius
          backgroundColor: '#111111',
          border: '1px solid rgba(255,255,255,0.08)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          backgroundColor: '#161616',
          borderRadius: '8px',
          border: '1px solid rgba(255,255,255,0.18)',
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: '#161616',
          borderRadius: '8px',
          color: '#fff',
        },
        notchedOutline: {
          borderColor: 'rgba(255,255,255,0.18)',
        },
        input: {
          fontSize: '0.95rem',
          paddingTop: '12px',
          paddingBottom: '12px',
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          color: '#fff',
          fontSize: '0.9rem',
          lineHeight: 1.2,
          marginBottom: '6px',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontSize: '1rem',
          fontWeight: 500,
          borderRadius: '14px',
          lineHeight: 1.3,
          paddingTop: '14px',
          paddingBottom: '14px',
        },
      },
    },
  },
});

export default theme;
