/**
 * AuthPage.jsx
 *
 * Purpose:
 * Authentication page (login) integrated with Flask API.
 */
import React, { useMemo, useState } from "react";
import { Alert, Box } from "@mui/material";
import { trackButton } from "../lib/analytics";

import AuthCard from "../components/auth/AuthCard.jsx";
import AuthTextField from "../components/auth/AuthTextField.jsx";
import PasswordField from "../components/auth/PasswordField.jsx";
import PrimaryButton from "../components/auth/PrimaryButton.jsx";
import PageShell from "../components/layout/PageShell.jsx";

import {apiPost} from "../api/client";

/**
 * Safely parse JSON if the response body is JSON, otherwise return {}.
 */
async function safeReadJson(response) {
  const contentType = response.headers?.get?.("content-type") || "";
  try {
    if (contentType.includes("application/json")) {
      return await response.json();
    }
    // Some APIs send text on error; attempt to parse if it looks like JSON
    const text = await response.text();
    if (!text) return {};
    try {
      return JSON.parse(text);
    } catch {
      return { message: text };
    }
  } catch {
    return {};
  }
}

/**
 * Convert API/HTTP errors into user-friendly messages.
 */
function getAuthErrorMessage({ status, data }) {
  const apiMsg = data?.error || data?.message;

  if (status === 400) return apiMsg || "Please check your email and password and try again.";
  if (status === 401) return apiMsg || "Incorrect email or password.";
  if (status === 403) return apiMsg || "You don’t have permission to access this account.";
  if (status === 404) return apiMsg || "Login service not found. Please contact support.";
  if (status >= 500) return "We’re having trouble signing you in right now. Please try again.";

  return apiMsg || "Login failed. Please try again.";
}

/**
 * Authentication page with login form.
 * @param {Object} props
 * @param {Function} props.onLoginSuccess - Callback when login succeeds (receives token data)
 */
export default function AuthPage({ onLoginSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // UI States
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const canSubmit = useMemo(() => {
    return Boolean(email?.trim()) && Boolean(password);
  }, [email, password]);

  async function handleLogin() {
    // 1) Basic client-side validation
    if (!canSubmit) {
      setError("Please enter both email and password.");
      return;
    }

    trackButton("auth/login/submit", { page: "auth" });

    setIsLoading(true);
    setError("");

    try {
      // 2) Call the Flask API
      const response = await apiPost("/auth/login",
        {
          email: email.trim(),
          password,
        });

      const data = await safeReadJson(response);

      if (!response.ok) {
        // Handle 401 or 500 errors from auth.py
        throw new Error(getAuthErrorMessage({ status: response.status, data }));
      }

      // 3) On Success: Pass data (access_token, etc) up to App.jsx
      onLoginSuccess?.(data);
    } catch (err) {
      setError(err?.message || "Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  // Allow pressing "Enter" to submit
  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleLogin();
  };

  return (
    <PageShell>
      <Box
        sx={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 3,
        }}
      >
        <AuthCard>
          {/* Error Feedback */}
          {error ? (
            <Alert severity="error" sx={{ mb: 3, width: "100%" }} variant="filled">
              {error}
            </Alert>
          ) : null}

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

          <PrimaryButton onClick={handleLogin} disabled={isLoading || !canSubmit}>
            {isLoading ? "Logging in…" : "Login"}
          </PrimaryButton>
        </AuthCard>
      </Box>
    </PageShell>
  );
}
