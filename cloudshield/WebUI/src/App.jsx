import React, { useMemo, useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import AuthPage from "./pages/AuthPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import WorkstationsPage from "./pages/WorkstationsPage.jsx";
import EmployeesPage from "./pages/EmployeesPage.jsx";
import AppLayout from "./components/layout/AppLayout.jsx";
import SignUpPage from "./pages/SignUpPage.jsx";
import GroupsPage from "./pages/GroupsPage.jsx";
import FilesPage from "./pages/FilesPage.jsx";

import { AuthProvider } from "./context/AuthContext.jsx";

function AppWithAuth() {
  const devBypass = import.meta.env.VITE_BYPASS_AUTH === "true";
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (devBypass) {
      // Warn when auth is bypassed in dev mode
      console.warn("[App] Auth bypass is active (VITE_BYPASS_AUTH=true).");
    }
  }, [devBypass]);

  // Initialize auth state based on presence of JWT in storage
  const [isAuthed, setIsAuthed] = useState(() => {
    return devBypass || !!localStorage.getItem("jwt");
  });

  /**
   * Unified Handler for Login OR Signup Success
   * Expects: { access_token: "...", user: { org_id?: "..." }, ... } from API response
   */
  const handleAuthSuccess = (data) => {
    if (data?.access_token) {
      localStorage.setItem("jwt", data.access_token);

      setIsAuthed(true);
      
      // Decode JWT to extract org_id
      try {
        const payload = JSON.parse(atob(data.access_token.split('.')[1]));
        if (payload.org_id) {
          localStorage.setItem("org_id", payload.org_id);
        }
      } catch (err) {
        console.error("Failed to decode JWT:", err);
      }
    }
  };

  const Protected = useMemo(() => {
    return function ProtectedWrapper({ children }) {
      if (!devBypass && !isAuthed) return <Navigate to="/login" replace />;
      return (
        <AppLayout 
          showSidebar 
          sidebarMode="full"
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(prev => !prev)}
        >
          {children}
        </AppLayout>
      );
    };
  }, [devBypass, isAuthed, sidebarCollapsed]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Landing page: sign up */}
        <Route path="/" element={<Navigate to="/signup" replace />} />

        {/* Public route: sign up */}
        <Route
          path="/signup"
          element={
            isAuthed ? (
              <Navigate to="/dashboard" replace />
            ) : isAuthed ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <SignUpPage onSignupSuccess={handleAuthSuccess} />
            )
          }
        />

        {/* Public route: login */}
        <Route
          path="/login"
          element={
            isAuthed ? (
              <Navigate to="/dashboard" replace />
            ) : isAuthed ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <AuthPage onLoginSuccess={handleAuthSuccess} />
            )
          }
        />

        {/* App routes (protected) */}
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
          path="/employees"
          element={
            <Protected>
              <EmployeesPage />
            </Protected>
          }
        />

        <Route
          path="/groups"
          element={
            <Protected>
              <GroupsPage />
            </Protected>
          }
        />

        <Route
          path="/files"
          element={
            <Protected>
              <FilesPage />
            </Protected>
          }
        />

        {/* Catch-all */}
        <Route
          path="*"
          element={
            isAuthed ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Navigate to="/signup" replace />
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
