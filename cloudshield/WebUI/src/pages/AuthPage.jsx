import React, { useState } from 'react';
import { Box } from '@mui/material';

import AuthCard from '../components/auth/AuthCard.jsx';
import AuthTextField from '../components/auth/AuthTextField.jsx';
import PasswordField from '../components/auth/PasswordField.jsx';
import PrimaryButton from '../components/auth/PrimaryButton.jsx';

export default function AuthPage({ onLoginSuccess }) {
  const [email, setEmail] = useState('johndoe@example.com');
  const [password, setPassword] = useState('******');

  function handleLogin() {
    // TODO: call backend auth
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
