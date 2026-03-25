import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';

import { CssBaseline } from '@mui/material';
import { ThemeProvider_Custom } from './context/ThemeContext.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { PostHogProvider } from 'posthog-js/react';

if (typeof globalThis !== 'undefined') {
  // Expose Vite env so tests that run under CommonJS can still read settings.
  globalThis.__APP_ENV__ = import.meta.env;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <PostHogProvider
      apiKey={import.meta.env.VITE_PUBLIC_POSTHOG_KEY}
      options={{
        api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST,
        defaults: '2025-05-24',
        capture_exceptions: true, // This enables capturing exceptions using Error Tracking, set to false if you don't want this
        debug: import.meta.env.MODE === "development",
      }}
    >
      <ThemeProvider_Custom>
        <AuthProvider>
          <CssBaseline />
          <App />
        </AuthProvider>
      </ThemeProvider_Custom>
    </PostHogProvider>
  </React.StrictMode>
);
