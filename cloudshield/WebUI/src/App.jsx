// WebUI/src/App.jsx
import React, { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import AuthPage from "./pages/AuthPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import AppLayout from "./components/layout/AppLayout.jsx";

export default function App() {
  // TEMP auth simulation
  const [isAuthed, setIsAuthed] = useState(true); //to change to false for it to function as intended (its true now to access other pages without actually need ign to login)

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

        {/* default route */}
        <Route
          path="*"
          element={
            isAuthed ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        {/* <Route
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
        /> */}
      </Routes>
    </BrowserRouter>
  );
}
