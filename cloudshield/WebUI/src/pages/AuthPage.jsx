/**
 * AuthPage.jsx
 *
 * Purpose:
 * Authentication page (login) integrated with Flask API.
 */
import React, { useState } from 'react';
import { Box, Alert, CircularProgress } from '@mui/material';
import { trackButton } from '../lib/analytics';

import AuthCard from '../components/auth/AuthCard.jsx';
import AuthTextField from '../components/auth/AuthTextField.jsx';
import PasswordField from '../components/auth/PasswordField.jsx';
import PrimaryButton from '../components/auth/PrimaryButton.jsx';

/**
 * Authentication page with login form.
 * @param {Object} props
 * @param {Function} props.onLoginSuccess - Callback when login succeeds (receives token data)
 */
export default function AuthPage({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // UI States
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Handle login button click.
   * connect to POST /auth/login
   */
  async function handleLogin() {
    // 1. Basic Client-side validation
    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }

    trackButton('auth/login/submit', { page: 'auth' });

    setIsLoading(true);
    setError('');

    try {
      // 2. Call the Flask API
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const rawText = await response.text();
      let data = {};
      if (rawText) {
        try {
          data = JSON.parse(rawText);
        } catch {
          data = {};
        }
      }

      if (!response.ok) {
        // Handle 401 or 500 errors from auth.py
        throw new Error(data.error || 'Login failed. Please check your credentials.');
      }

      // 3. On Success: Pass data (access_token, etc) up to App.jsx
      if (onLoginSuccess) {
        onLoginSuccess(data);
      }

    } catch (err) {
      setError(err?.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  }

  // Allow pressing "Enter" to submit
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleLogin();
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: '#0A0A0A',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <AuthCard>
        {/* Error Feedback */}
        {error && (
          <Alert severity="error" sx={{ mb: 3, width: '100%' }} variant="filled">
            {error}
          </Alert>
        )}

        <AuthTextField
          label="Email"
          placeholder="johndoe@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={handleKeyDown}
        />

        <PasswordField
          label="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={handleKeyDown}
        />

        <PrimaryButton 
          onClick={handleLogin} 
          disabled={isLoading}
        >
          {isLoading ? (
            <CircularProgress size={24} color="inherit" />
          ) : (
            "Login"
          )}
        </PrimaryButton>
      </AuthCard>
    </Box>
  );
}