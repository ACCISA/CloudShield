import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';

import { ThemeProvider, CssBaseline } from '@mui/material';
import theme from './theme/theme.js';
import { AuthProvider } from './context/AuthContext.jsx';

if (typeof globalThis !== 'undefined') {
  // Expose Vite env so tests that run under CommonJS can still read settings.
  globalThis.__APP_ENV__ = import.meta.env;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <App />
      </ThemeProvider>
    </AuthProvider>
  </React.StrictMode>
);
