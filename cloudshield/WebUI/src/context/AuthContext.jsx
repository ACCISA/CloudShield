import React, { createContext, useContext, useMemo, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

const DEFAULT_USER = {
  id: 'admin-001',
  email: 'admin@company.com',
  full_name: 'Admin User',
  role: 'admin',
  org_id: 'default-org',
};

export function AuthProvider({ children, initialState = {} }) {
  const disableBootstrap = initialState.disableBootstrap ?? false;
  const env = (() => {
    if (typeof globalThis !== 'undefined' && globalThis.__APP_ENV__) {
      return globalThis.__APP_ENV__;
    }
    return typeof process === "undefined" ? {} : process.env;
  })();
  const bootstrapEmail = initialState.bootstrapEmail ?? env?.VITE_AUTH_EMAIL ?? env?.VITE_API_EMAIL ?? '';
  const bootstrapPassword = initialState.bootstrapPassword ?? env?.VITE_AUTH_PASSWORD ?? env?.VITE_API_PASSWORD ?? '';
  const envAccessToken = env?.VITE_API_ACCESS_TOKEN ?? env?.VITE_AUTH_TOKEN ?? null;
  const initialUser = initialState.currentUser ?? DEFAULT_USER;
  const initialToken =
    initialState.accessToken ??
    localStorage.getItem("jwt") ??
    envAccessToken ??
    null;
  const shouldBootstrap = !disableBootstrap && !initialToken && Boolean(bootstrapEmail && bootstrapPassword);

  const [currentUser, setCurrentUser] = useState(initialUser);
  const [accessToken, setAccessToken] = useState(initialToken);
  const [authError, setAuthError] = useState(initialState.authError ?? null);
  const [authLoading, setAuthLoading] = useState(shouldBootstrap);
  const [refreshTick, setRefreshTick] = useState(0);

  const runBootstrap = useCallback(async (signal) => {
    setAuthLoading(true);
    setAuthError(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: bootstrapEmail, password: bootstrapPassword }),
        signal,
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.access_token) {
        const message = payload?.error || `Authentication failed (${response.status})`;
        throw new Error(message);
      }

      const token = payload.access_token;
      setAccessToken(token);

      try {
        const meResponse = await fetch('/api/auth/me', {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
          signal,
        });

        if (meResponse.ok) {
          const mePayload = await meResponse.json().catch(() => ({}));
          const claims = mePayload?.claims || {};
          setCurrentUser((prev) => ({
            id: claims.sub ?? prev.id,
            email: bootstrapEmail || prev.email,
            full_name: prev.full_name,
            role: claims.role ?? prev.role,
            org_id: claims.org_id ?? prev.org_id,
          }));
        }
      } catch (err) {
        if (err?.name === 'AbortError') return;
      }
    } catch (error) {
      if (error?.name === 'AbortError') return;
      setAccessToken(null);
      setAuthError(error?.message || 'Authentication failed');
    } finally {
      setAuthLoading(false);
    }
  }, [bootstrapEmail, bootstrapPassword]);

  useEffect(() => {
    if (disableBootstrap || accessToken) {
      setAuthLoading(false);
      return;
    }

    if (!bootstrapEmail || !bootstrapPassword) {
      setAuthLoading(false);
      setAuthError((prev) => prev || 'Missing bootstrap credentials. Set VITE_AUTH_EMAIL and VITE_AUTH_PASSWORD in .env.local');
      return;
    }

    const controller = new AbortController();
    runBootstrap(controller.signal);

    return () => controller.abort();
  }, [disableBootstrap, accessToken, bootstrapEmail, bootstrapPassword, runBootstrap, refreshTick]);

  const refreshAuth = useCallback(() => {
    setAccessToken(null);
    setAuthError(null);
    setAuthLoading(true);
    setRefreshTick((tick) => tick + 1);
  }, []);

  const value = useMemo(() => ({
    currentUser,
    accessToken,
    authError,
    authLoading,
    isAuthenticated: Boolean(accessToken),
    refreshAuth,
  }), [currentUser, accessToken, authError, authLoading, refreshAuth]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
