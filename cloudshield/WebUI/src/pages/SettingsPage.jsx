import { useEffect, useRef, useState } from "react";
import { Box, Tab, Tabs, Typography } from "@mui/material";
import { useAuth } from "../context/AuthContext.jsx";

import PageShell from "../components/layout/PageShell.jsx";
import Skeleton from "../components/ui/Skeleton.jsx";

import BasicInfoTab from "../components/settings/BasicInfoTab.jsx";
import BillingTab from "../components/settings/BillingTab.jsx";
import NotificationsTab from "../components/settings/NotificationsTab.jsx";
import AppearanceTab from "../components/settings/AppearanceTab.jsx";

import { buildApiUrl } from "../lib/apiBase.js";
import { safeAsync } from "../lib/safeAsync.js";

const TABS = ["Basic Info", "Plan & Billing", "Notifications", "Appearance"];

const getAuthHeader = () => {
  const token = localStorage.getItem("jwt");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

async function buildApiError(res, fallbackMessage) {
  const body = await res.json().catch(() => ({}));
  const err = new Error(body?.message || body?.error || fallbackMessage);
  err.response = {
    status: res.status,
    data: body,
  };
  return err;
}

function SettingsLoading() {
  return (
    <Box
      role="status"
      aria-live="polite"
      data-testid="settings-loading"
      sx={{ mt: 2 }}
    >
      <Typography sx={{ color: "text.secondary", mb: 2 }}>
        Loading settings...
      </Typography>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
        <Skeleton height={24} width="24%" />
        <Skeleton height={14} width="100%" />
        <Skeleton height={14} width="72%" />
        <Skeleton height={220} width="100%" style={{ borderRadius: 16 }} />
      </Box>
    </Box>
  );
}

export default function SettingsPage() {
  const { currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState(0);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({
    open: false,
    msg: "",
    type: "success",
  });

  const toastTimerRef = useRef(null);

  const closeToast = () => {
    setToast((prev) => ({ ...prev, open: false }));
  };

  const openToast = (msg, type = "success") => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }

    setToast({ open: true, msg, type });

    toastTimerRef.current = setTimeout(() => {
      setToast((prev) => ({ ...prev, open: false }));
      toastTimerRef.current = null;
    }, 2500);
  };

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (!currentUser?.id) {
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    const fetchData = async () => {
      setLoading(true);

      try {
        const response = await safeAsync(async () => {
          const userRes = await fetch(buildApiUrl(`/users/${currentUser.id}`), {
            headers: {
              "Content-Type": "application/json",
              ...getAuthHeader(),
            },
          });

          if (!userRes.ok) {
            throw await buildApiError(userRes, "Failed to load settings");
          }

          return userRes.json();
        });

        if (!cancelled) {
          setUserData(response.user || response);
        }
      } catch (e) {
        console.error("Failed to load settings data", e);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [currentUser?.id]);

  const handleUserUpdate = async (payload) => {
    if (!currentUser?.id) return false;

    try {
      const response = await safeAsync(
        async () => {
          const res = await fetch(buildApiUrl(`/users/${currentUser.id}`), {
            method: "PATCH",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
              ...getAuthHeader(),
            },
            body: JSON.stringify(payload),
          });

          if (!res.ok) {
            throw await buildApiError(res, "Failed to update");
          }

          return res.json();
        },
        {
          toast: {
            error: (msg) => openToast(msg, "error"),
          },
        }
      );

      setUserData(response.user || response);
      openToast("Settings saved successfully", "success");
      return true;
    } catch {
      return false;
    }
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case 0:
        return <BasicInfoTab userData={userData} onSave={handleUserUpdate} />;
      case 1:
        return <BillingTab />;
      case 2:
        return (
          <NotificationsTab userData={userData} onSave={handleUserUpdate} />
        );
      case 3:
        return <AppearanceTab />;
      default:
        return null;
    }
  };

  return (
    <>
      <Box sx={{ minHeight: "100vh", backgroundColor: "background.default" }}>
        <PageShell>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              color: "text.primary",
              mb: 1,
              fontSize: "2rem",
              letterSpacing: "-0.5px",
            }}
          >
            Settings
          </Typography>

          <Tabs
            value={activeTab}
            onChange={(_, value) => setActiveTab(value)}
            sx={{
              mb: 2,
              borderBottom: "1px solid",
              borderBottomColor: "var(--divider)", // Use variable
              "& .MuiTab-root": {
                textTransform: "none",
                fontWeight: 500,
                fontSize: "0.95rem",
                minWidth: "auto",
                padding: "12px 0",
                marginRight: "32px",
                color: "var(--text-secondary)", // Use variable
                transition: "color 0.2s ease",
              },
              "& .Mui-selected": { 
                color: "var(--text-primary) !important", // Force text primary
                fontWeight: 600,
              },
              "& .MuiTabs-indicator": { 
                backgroundColor: "var(--text-primary)", // Force text primary
                height: "2px",
              },
            }}
          >
            {TABS.map((label) => (
              <Tab key={label} label={label} disableRipple />
            ))}
          </Tabs>

          <Box sx={{ flex: 1, minHeight: 0 }}>
            {loading ? <SettingsLoading /> : renderActiveTab()}
          </Box>
        </PageShell>
      </Box>

      {toast.open && (
        <button
          type="button"
          role="alert"
          tabIndex={0}
          aria-live="assertive"
          aria-atomic="true"
          onClick={closeToast}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              closeToast();
            }
          }}
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
            outline: "none",
            border: "none",
          }}
        >
          {toast.msg}
        </button>
      )}
    </>
  );
}
