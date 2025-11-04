import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import AuthPage from './pages/AuthPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import WorkstationsPage from './pages/WorkstationsPage.jsx';
import AppLayout from './components/layout/AppLayout.jsx';

export default function App() {
  // TEMP auth simulation
  const [isAuthed, setIsAuthed] = useState(true); // set true for quicker dev; flip to false to test auth

  return (
    <BrowserRouter>
      <Routes>
        {/* Public route: login */}
        <Route
          path="/login"
          element={<AuthPage onLoginSuccess={() => setIsAuthed(true)} />}
        />

        {/* Protected app routes wrapped in AppLayout (sidebar lives here) */}
        <Route
          path="/dashboard"
          element={
            isAuthed ? (
              <AppLayout>
                <DashboardPage />
              </AppLayout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        <Route
          path="/workstations"
          element={
            isAuthed ? (
              <AppLayout>
                <WorkstationsPage />
              </AppLayout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* default route */}
        <Route
          path="*"
          element={
            isAuthed ? (
              <Navigate to="/workstations" replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
