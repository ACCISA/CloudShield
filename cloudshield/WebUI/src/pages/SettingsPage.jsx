import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { useThemeColors } from "../hooks/useThemeColors.js";
import PageShell from "../components/layout/PageShell.jsx";
import Skeleton from "../components/ui/Skeleton.jsx";

import BasicInfoTab from "../components/settings/BasicInfoTab.jsx";
import BillingTab from "../components/settings/BillingTab.jsx";
import NotificationsTab from "../components/settings/NotificationsTab.jsx";
import AppearanceTab from "../components/settings/AppearanceTab.jsx";

import { apiGet, apiPatch } from "../api/client.js";
import { safeAsync } from "../lib/safeAsync.js";

const TABS = ["Basic Info", "Plan & Billing", "Notifications", "Appearance"];

function SettingsLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="settings-loading"
      style={{ marginTop: 16 }}
    >
      <p
        style={{
          color: "var(--text-secondary)",
          marginBottom: 16,
          margin: "0 0 16px 0",
        }}
      >
        Loading settings...
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Skeleton height={24} width="24%" />
        <Skeleton height={14} width="100%" />
        <Skeleton height={14} width="72%" />
        <Skeleton height={220} width="100%" style={{ borderRadius: 16 }} />
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { currentUser, authLoading } = useAuth();
  const themeColors = useThemeColors();

  const [activeTab, setActiveTab] = useState(0);
  const [userData, setUserData] = useState(null);
  const [orgData, setOrgData] = useState(null);
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

    if (authLoading) {
      return () => {
        cancelled = true;
      };
    }

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
          const [userRes, orgRes] = await Promise.all([
            apiGet(`/users/${currentUser.id}`),
            apiGet("/organizations/me").catch(() => null),
          ]);

          const userData = await userRes.json();
          const orgData = orgRes ? await orgRes.json() : null;
          return { userData, orgData };
        });

        if (!cancelled) {
          setUserData(response.userData?.user || response.userData);
          setOrgData(response.orgData?.organization || null);
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
  }, [currentUser?.id, authLoading]);

  const handleUserUpdate = async (payload) => {
    if (!currentUser?.id) return false;

    try {
      const response = await safeAsync(
        async () => {
          const res = await apiPatch(`/users/${currentUser.id}`, payload);
          return res.json();
        },
        {
          toast: {
            error: (msg) => openToast(msg, "error"),
          },
        },
      );

      setUserData(response.user || response);
      openToast("Settings saved successfully", "success");
      return true;
    } catch {
      return false;
    }
  };

  const handleOrgUpdate = async (payload) => {
    try {
      const response = await safeAsync(
        async () => {
          const res = await apiPatch("/organizations/me", payload);
          return res.json();
        },
        {
          toast: {
            error: (msg) => openToast(msg, "error"),
          },
        },
      );

      const org = response.organization || response;
      setOrgData(org);
      try {
        localStorage.setItem(
          "org_cache",
          JSON.stringify({ name: org?.name, logo: org?.logo }),
        );
      } catch {
        /* ignore */
      }
      openToast("Settings saved successfully", "success");
      return true;
    } catch {
      return false;
    }
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case 0:
        return (
          <BasicInfoTab
            userData={userData}
            onSave={handleUserUpdate}
            orgData={orgData}
            onOrgSave={handleOrgUpdate}
          />
        );
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
      <div style={{ minHeight: "100vh", backgroundColor: "var(--bg-primary)" }}>
        <PageShell>
          <h1
            style={{
              fontWeight: 700,
              color: themeColors.textPrimary,
              marginBottom: 8,
              fontSize: "2rem",
              letterSpacing: "-0.5px",
              margin: "0 0 8px 0",
            }}
          >
            Settings
          </h1>

          <div
            role="tablist"
            style={{
              marginBottom: 16,
              borderBottom: `1px solid ${themeColors.borderLight}`,
              display: "flex",
            }}
          >
            {TABS.map((label, index) => (
              <button
                key={label}
                role="tab"
                aria-selected={activeTab === index}
                onClick={() => setActiveTab(index)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontWeight: activeTab === index ? 600 : 500,
                  fontSize: "0.95rem",
                  padding: "12px 0",
                  marginRight: "32px",
                  color:
                    activeTab === index
                      ? themeColors.textPrimary
                      : themeColors.textSecondary,
                  borderBottom:
                    activeTab === index
                      ? `2px solid ${themeColors.textPrimary}`
                      : "2px solid transparent",
                  marginBottom: -1,
                  transition: "color 0.2s ease",
                  outline: "none",
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <div style={{ flex: 1, minHeight: 0 }}>
            {loading ? <SettingsLoading /> : renderActiveTab()}
          </div>
        </PageShell>
      </div>

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
            color: "#ffffff",
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
