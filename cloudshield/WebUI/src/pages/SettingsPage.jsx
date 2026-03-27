import { useEffect, useRef, useState } from "react";
import { Box, Tab, Tabs, Typography } from "@mui/material";
import { useAuth } from "../context/AuthContext.jsx";

import PageShell from "../components/layout/PageShell.jsx";
import Skeleton from "../components/ui/Skeleton.jsx";

import BasicInfoTab from "../components/settings/BasicInfoTab.jsx";
import BillingTab from "../components/settings/BillingTab.jsx";
import NotificationsTab from "../components/settings/NotificationsTab.jsx";
import AppearanceTab from "../components/settings/AppearanceTab.jsx";

import { safeAsync } from "../lib/safeAsync.js";

const API_BASE = "http://127.0.0.1:5050";
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

    const fetchData = async () => {
      const token = localStorage.getItem("jwt");
      if (!token) {
        if (!cancelled) {
          setUserData(null);
          setLoading(false);
        }
        return;
      }

      setLoading(true);

      try {
        const userId =
          currentUser?.id ??
          currentUser?._id ??
          currentUser?.user_id ??
          null;

        const response = await safeAsync(async () => {
          const url = userId
            ? `${API_BASE}/api/users/${userId}`
            : `${API_BASE}/api/users/me`;

          const res = await fetch(url, {
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
              ...getAuthHeader(),
            },
          });

          if (!res.ok) {
            throw await buildApiError(res, "Failed to load settings");
          }

          return res.json();
        });

        if (!cancelled) {
          setUserData(response?.user || response || null);
        }
      } catch (e) {
        console.error("Failed to load settings data", e);
        if (!cancelled) {
          setUserData(null);
        }
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
  }, [currentUser]);

  const handleUserUpdate = async (payload) => {
    const userId =
      userData?.id ??
      userData?._id ??
      userData?.user_id ??
      currentUser?.id ??
      currentUser?._id ??
      currentUser?.user_id ??
      null;

    if (!userId) {
      openToast("Could not determine which user to update.", "error");
      return false;
    }

    try {
      const response = await safeAsync(
        async () => {
          const res = await fetch(`${API_BASE}/api/users/${userId}`, {
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

      const apiUser = response?.user || response || {};
      const { password, ...safePayload } = payload;

      setUserData((prev) => ({
        ...prev,
        ...safePayload,
        ...apiUser,
      }));

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
              borderBottomColor: "var(--divider)",
              "& .MuiTab-root": {
                textTransform: "none",
                fontWeight: 500,
                fontSize: "0.95rem",
                minWidth: "auto",
                padding: "12px 0",
                marginRight: "32px",
                color: "var(--text-secondary)",
                transition: "color 0.2s ease",
              },
              "& .Mui-selected": {
                color: "var(--text-primary) !important",
                fontWeight: 600,
              },
              "& .MuiTabs-indicator": {
                backgroundColor: "var(--text-primary)",
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
        <div
          role="alert"
          tabIndex={0}
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
            color: "white",
            fontSize: "1rem",
            boxShadow: "0 8px 20px rgba(0,0,0,0.35)",
            zIndex: 9999,
            cursor: "pointer",
            outline: "none",
          }}
        >
          {toast.msg}
        </div>
      )}
    </>
  );
}