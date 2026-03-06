import React, { useMemo, useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import LandingPage from "./pages/LandingPage.jsx";
import AuthPage from "./pages/AuthPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import WorkstationsPage from "./pages/WorkstationsPage.jsx";
import EmployeesPage from "./pages/EmployeesPage.jsx";
import AppLayout from "./components/layout/AppLayout.jsx";
import SignUpPage from "./pages/SignUpPage.jsx";
import GroupsPage from "./pages/GroupsPage.jsx";
import FilesPage from "./pages/FilesPage.jsx";
import ProvisioningPage from "./pages/ProvisioningPage.jsx";
import SettingsPage from "./pages/SettingsPage.jsx";

import { AuthProvider } from "./context/AuthContext.jsx";

function AppWithAuth() {
  const devBypass = import.meta.env.VITE_BYPASS_AUTH === "false";
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (devBypass) {
      console.warn("[App] Auth bypass is active (VITE_BYPASS_AUTH=true).");
    }
  }, [devBypass]);

  // 1. Auth State
  const [isAuthed, setIsAuthed] = useState(() => {
    return devBypass || !!localStorage.getItem("jwt");
  });

  // 2. Provisioning Check
  // We check if a job ID exists AND we haven't explicitly marked it as done
  const needsProvisioning = useMemo(() => {
    if (devBypass) return false;
    if (!isAuthed) return false;
    
    const isDone = localStorage.getItem("isProvisioned") === "true";
    const hasJob = !!localStorage.getItem("provision_job_id");
    
    // Logic: If we have a job ID pending and aren't marked done, go to provisioning.
    return hasJob && !isDone;
  }, [devBypass, isAuthed]);

  const handleAuthSuccess = (data) => {
    if (data?.access_token) {
      localStorage.setItem("jwt", data.access_token);
      setIsAuthed(true);
      
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

  // 3. Protected Route Wrapper
  const Protected = useMemo(() => {
    return function ProtectedWrapper({ children }) {
      // Not logged in -> Login
      if (!devBypass && !isAuthed) return <Navigate to="/login" replace />;
      
      // Logged in but provisioning incomplete -> Provisioning Page
      if (needsProvisioning) return <Navigate to="/provisioning" replace />;
      
      // Logged in & Provisioned -> Dashboard Layout
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
  }, [devBypass, isAuthed, sidebarCollapsed, needsProvisioning]);

  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Landing page */}
          <Route 
            path="/" 
            element={
              isAuthed ? (
                <Navigate to={needsProvisioning ? "/provisioning" : "/dashboard"} replace />
              ) : (
                <LandingPage />
              )
            } 
          />

          {/* Public route: sign up */}
          <Route
            path="/signup"
            element={
              isAuthed ? (
                <Navigate to={needsProvisioning ? "/provisioning" : "/dashboard"} replace />
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
                <Navigate to={needsProvisioning ? "/provisioning" : "/dashboard"} replace />
              ) : (
                <AuthPage onLoginSuccess={handleAuthSuccess} />
              )
            }
          />

          {/* Provisioning Route (No Layout) */}
          <Route 
            path="/provisioning"
            element={
               // Only allow access if authenticated
               isAuthed ? <ProvisioningPage /> : <Navigate to="/login" replace />
            }
          />

          {/* App routes (Protected with Layout) */}
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

        <Route
          path="/settings"
          element={
            <Protected>
              <SettingsPage />
            </Protected>
          }
        />

          {/* Catch-all */}
          <Route
            path="*"
            element={
              isAuthed ? (
                <Navigate to={needsProvisioning ? "/provisioning" : "/dashboard"} replace />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
export default AppWithAuth;