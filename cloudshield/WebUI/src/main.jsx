import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';

import { ThemeProvider, CssBaseline } from '@mui/material';
import theme from './theme/theme.js';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </React.StrictMode>
);
