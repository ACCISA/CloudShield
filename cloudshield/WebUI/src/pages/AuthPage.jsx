/**
 * AuthPage.jsx
 *
 * Purpose:
 *   Authentication page (login) composed from auth UI components.
 *
 * Props:
 *   - onLoginSuccess: callback invoked when fake login completes
 */
import React, { useState } from 'react';
import { Box } from '@mui/material';

import AuthCard from '../components/auth/AuthCard.jsx';
import AuthTextField from '../components/auth/AuthTextField.jsx';
import PasswordField from '../components/auth/PasswordField.jsx';
import PrimaryButton from '../components/auth/PrimaryButton.jsx';

/**
 * Authentication page with login form.
 * @param {Object} props
 * @param {Function} props.onLoginSuccess - Callback when login succeeds
 * @returns {JSX.Element} Login page
 */
export default function AuthPage({ onLoginSuccess }) {
  const [email, setEmail] = useState('johndoe@example.com');
  const [password, setPassword] = useState('******');

  /**
   * Handle login button click. Currently a stub; integrate with backend auth.
   */
  function handleLogin() {
    console.log('login with', email, password);
    if (onLoginSuccess) onLoginSuccess();
  }

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
        <AuthTextField
          label="Email"
          placeholder="johndoe@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <PasswordField
          label="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <PrimaryButton onClick={handleLogin}>
          Login
        </PrimaryButton>
      </AuthCard>
    </Box>
  );
}
