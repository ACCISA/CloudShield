import React, { useMemo, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import AuthPage from './pages/AuthPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import WorkstationsPage from './pages/WorkstationsPage.jsx';
import ProvisioningPage from './pages/ProvisioningPage.jsx';
import EmployeesPage from './pages/EmployeesPage.jsx';
import AppLayout from './components/layout/AppLayout.jsx';
import SignUpPage from './pages/SignUpPage.jsx';
import { AuthProvider } from './context/AuthContext.jsx';

function AppWithAuth() {
  // This is your app-level auth flag (UI login/signup flow),
  // separate from the service bootstrap AuthContext.
  const [isAuthed, setIsAuthed] = useState(false); // set true for dev if needed
  const [isProvisioned, setIsProvisioned] = useState(() => {
    try {
      return localStorage.getItem('isProvisioned') === 'true';
    } catch {
      return false;
    }
  });

  const handleProvisioned = () => {
    setIsProvisioned(true);
    try {
      localStorage.setItem("isProvisioned", "true");
    } catch {}
  };

  // Called specifically after SIGNUP
  const handleSignupSuccess = ({ token, user } = {}) => {
    setIsAuthed(true);

    if (token) {
      try {
        localStorage.setItem('jwt', token);
      } catch {
        // ignore storage error
      }
    }

    if (user?.org_id) {
      try {
        localStorage.setItem('org_id', user.org_id);
      } catch {
        // ignore
      }
    }
  };

  const Protected = useMemo(() => {
    return function ProtectedWrapper({ children }) {
      if (!isAuthed) return <Navigate to="/login" replace />;
      if (!isProvisioned) return <Navigate to="/provisioning" replace />;
      return (
        <AppLayout showSidebar sidebarMode="full">
          {children}
        </AppLayout>
      );
    };
  }, [isAuthed, isProvisioned]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public route: login */}
        <Route
          path="/login"
          element={
            <AuthPage
              onLoginSuccess={() => {
                setIsAuthed(true);
              }}
            />
          }
        />

        {/* Public route: sign up */}
        <Route
          path="/signup"
          element={
            <SignUpPage
              onSignupSuccess={handleSignupSuccess}
            />
          }
        />

        {/* Provisioning route: visible when not provisioned; shows sidebar shell (no tabs) */}
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

        {/* App routes (require both auth + provisioned) */}
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
              <EmployeesPage />
            </Protected>
          }
        />

        {/* default route */}
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
  // Wrap everything in your AuthProvider for service/claims context
  return (
    <AuthProvider>
      <AppWithAuth />
    </AuthProvider>
  );
}
