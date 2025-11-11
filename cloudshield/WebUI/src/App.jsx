import React, { useMemo, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import AuthPage from './pages/AuthPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import WorkstationsPage from './pages/WorkstationsPage.jsx';
import ProvisioningPage from './pages/ProvisioningPage.jsx';
import AppLayout from './components/layout/AppLayout.jsx';
import UsersPage from './pages/UsersPage.jsx';
import AddUser from './pages/AddUser.jsx';

export default function App() {
  // TEMP auth simulation
  const [isAuthed, setIsAuthed] = useState(true); // set true for quicker dev; flip to false to test auth

  const [isProvisioned, setIsProvisioned] = useState(true);
  // Provisioning gate
  // const [isProvisioned, setIsProvisioned] = useState(() => {
  //   try {
  //     return localStorage.getItem('isProvisioned') === 'true';
  //   } catch {
  //     return false;
  //   }
  // });

  const handleProvisioned = () => {
    setIsProvisioned(true);
    try {
      localStorage.setItem('isProvisioned', 'true');
    } catch {}
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
          element={<AuthPage onLoginSuccess={() => setIsAuthed(true)} />}
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
              <UsersPage />
            </Protected>
          }
        />

        <Route
          path="/add_users"
          element={
            <Protected>
              <AddUser />
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
