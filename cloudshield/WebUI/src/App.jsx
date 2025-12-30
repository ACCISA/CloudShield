import React, { useMemo, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import AuthPage from './pages/AuthPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import WorkstationsPage from './pages/WorkstationsPage.jsx';
import ProvisioningPage from './pages/ProvisioningPage.jsx';
import EmployeesPage from './pages/EmployeesPage.jsx';
import AppLayout from './components/layout/AppLayout.jsx';
import SignUpPage from './pages/SignUpPage.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import UsersPage from './pages/UsersPage.jsx';

function AppWithAuth() {
  const devBypass = import.meta.env.VITE_BYPASS_AUTH === 'true';

  useEffect(() => {
    if (devBypass) {
      // Warn when auth/provisioning is bypassed in dev mode
      console.warn('[App] Auth bypass is active (VITE_BYPASS_AUTH=true).');
    }
  }, [devBypass]);

  // Initialize auth state based on presence of JWT in storage
  const [isAuthed, setIsAuthed] = useState(() => {
    return devBypass || !!localStorage.getItem('jwt');
  });

  const [isProvisioned, setIsProvisioned] = useState(() => {
    try {
      return devBypass || localStorage.getItem('isProvisioned') === 'true';
    } catch {
      return false;
    }
  });

  const handleProvisioned = () => {
    setIsProvisioned(true);
    localStorage.setItem('isProvisioned', 'true');
  };

  /**
   * Unified Handler for Login OR Signup Success
   * Expects: { access_token: "...", ... } from API response
   */
  const handleAuthSuccess = (data) => {
    if (data?.access_token) {
      localStorage.setItem('jwt', data.access_token);
      setIsAuthed(true);
    }
    
    // If the backend returns org_id or user info, store it safely
    if (data?.user?.org_id) {
        localStorage.setItem('org_id', data.user.org_id);
    }
  };

  const Protected = useMemo(() => {
    return function ProtectedWrapper({ children }) {
      if (!devBypass && !isAuthed) return <Navigate to="/login" replace />;
      if (!devBypass && !isProvisioned) return <Navigate to="/provisioning" replace />;
      return (
        <AppLayout showSidebar sidebarMode="full">
          {children}
        </AppLayout>
      );
    };
  }, [devBypass, isAuthed, isProvisioned]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public route: login */}
        <Route
          path="/login"
          element={
            isAuthed ? <Navigate to="/dashboard" replace /> : (
              <AuthPage
                onLoginSuccess={handleAuthSuccess}
              />
            )
          }
        />

        {/* Public route: sign up */}
        <Route
          path="/signup"
          element={
            isAuthed ? <Navigate to="/dashboard" replace /> : (
              <SignUpPage
                onSignupSuccess={handleAuthSuccess} 
              />
            )
          }
        />

        {/* Provisioning route */}
        <Route
          path="/provisioning"
          element={
            isAuthed ? (
              <AppLayout showSidebar sidebarMode="provisioning">
                <ProvisioningPage onProvisioned={handleProvisioned} />
              </AppLayout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* App routes */}
        <Route
          path="/dashboard"
          element={
            <Protected>
              <DashboardPage />
            </Protected>
          }
        />

        <Route
          path="/workstations"
          element={
            <Protected>
              <WorkstationsPage />
            </Protected>
          }
        />

        <Route
          path="/users"
          element={
            <Protected>
              <UsersPage />
            </Protected>
          }
        />

        {/* Catch-all */}
        <Route
          path="*"
          element={
            isAuthed ? (
              isProvisioned ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <Navigate to="/provisioning" replace />
              )
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppWithAuth />
    </AuthProvider>
  );
}