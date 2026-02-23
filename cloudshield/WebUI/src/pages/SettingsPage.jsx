import { useState, useEffect } from "react";
import { Box, Typography, Tabs, Tab } from "@mui/material";
import { useAuth } from "../context/AuthContext.jsx";
import BasicInfoTab from "../components/settings/BasicInfoTab.jsx";
import BillingTab from "../components/settings/BillingTab.jsx";
import NotificationsTab from "../components/settings/NotificationsTab.jsx";
import AppearanceTab from "../components/settings/AppearanceTab.jsx";

const getAuthHeader = () => {
  const token = localStorage.getItem("jwt");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const TABS = ["Basic Info", "Plan & Billing", "Notifications", "Appearance"];

export default function SettingsPage() {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState(0);

  const [userData, setUserData] = useState(null);
  const [orgData, setOrgData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [toast, setToast] = useState({ open: false, msg: "", type: "success" });

  const openToast = (msg, type = "success") => {
    setToast({ open: true, msg, type });
    setTimeout(() => setToast((p) => ({ ...p, open: false })), 2500);
  };

  useEffect(() => {
    if (!currentUser?.id) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const userRes = await fetch(`http://127.0.0.1:5050/api/users/${currentUser.id}`, {
          headers: { "Content-Type": "application/json", ...getAuthHeader() },
        });

        if (userRes.ok) {
          const response = await userRes.json();
          setUserData(response.user || response);
        }
      } catch (e) {
        console.error("Failed to load settings data", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [currentUser?.id]);

  const handleUserUpdate = async (payload) => {
    try {
      const res = await fetch(`/api/users/${currentUser.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to update");
      }
      const response = await res.json();
      const updatedUser = response.user || response;
      setUserData(updatedUser);
      openToast("Settings saved successfully", "success");
      return true;
    } catch (e) {
      openToast(e.message || "Failed to save changes", "error");
      return false;
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", backgroundColor: "#0A0A0A", padding: "40px 48px" }}>
      {/* Header */}
      <Typography
        variant="h4"
        sx={{ fontWeight: 700, color: "#fff", mb: 1, fontSize: "2rem", letterSpacing: "-0.5px" }}
      >
        Settings
      </Typography>

      {/* Tab Navigation */}
      <Tabs
        value={activeTab}
        onChange={(_, v) => setActiveTab(v)}
        sx={{
          mb: 4,
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          "& .MuiTab-root": {
            textTransform: "none",
            fontWeight: 500,
            fontSize: "0.95rem",
            minWidth: "auto",
            padding: "12px 0",
            marginRight: "32px",
          },
          "& .Mui-selected": { color: "#fff" },
          "& .MuiTabs-indicator": { backgroundColor: "#fff", height: "2px" },
        }}
      >
        {TABS.map((label, i) => (
          <Tab key={label} label={label} disableRipple />
        ))}
      </Tabs>

      {/* Tab Panels */}
      {!loading && (
        <>
          {activeTab === 0 && (
            <BasicInfoTab userData={userData} onSave={handleUserUpdate} />
          )}
          {activeTab === 1 && <BillingTab />}
          {activeTab === 2 && (
            <NotificationsTab userData={userData} onSave={handleUserUpdate} />
          )}
          {activeTab === 3 && <AppearanceTab />}
        </>
      )}

      {loading && (
        <Box sx={{ color: "#9E9E9E", mt: 4 }}>Loading settings...</Box>
      )}

      {/* Toast */}
      {toast.open && (
        <div
          onClick={() => setToast((p) => ({ ...p, open: false }))}
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            padding: "12px 24px",
            borderRadius: "12px",
            backgroundColor: toast.type === "error" ? "#d32f2f" : "#2e7d32",
            color: "#fff",
            fontSize: "1rem",
            boxShadow: "0 8px 20px rgba(0,0,0,0.35)",
            zIndex: 9999,
            cursor: "pointer",
          }}
        >
          {toast.msg}
        </div>
      )}
    </Box>
  );
}