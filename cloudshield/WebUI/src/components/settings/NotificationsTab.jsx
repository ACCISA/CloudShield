import { useState, useMemo, useEffect } from "react";
import { useThemeColors } from "../../hooks/useThemeColors.js";
import SaveButton from "../common/SaveButton/SaveButton.jsx";
import SearchField from "../common/SearchField/SearchField.jsx";
import FilterButton from "../common/FilterButton/FilterButton.jsx";
import Pagination from "../common/Pagination/Pagination.jsx";
import Checkbox from "../common/Checkbox/Checkbox.jsx";
import { createFilterChangeHandler } from "../../utils/filterHelpers.js";
import { NOTIFICATION_FILTERS } from "../../config/filterConfigs.js";
import TrashIcon from "../../assets/TrashIcon.jsx";

const MOCK_ALERTS = Array.from({ length: 5 }, (_, i) => ({
  id: `alert-${i}`,
  message: "You've been logged into a new device",
  date: "10/11/2025 11:36 pm",
}));

export default function NotificationsTab({ userData, onSave }) {
  const themeColors = useThemeColors();

  const [emailAlerts, setEmailAlerts] = useState(false);
  const [alertEmail, setAlertEmail] = useState("");
  const [inAppAlerts, setInAppAlerts] = useState(true);
  const [saved, setSaved] = useState(false);
  const [initialPrefs, setInitialPrefs] = useState({
    emailAlerts: false,
    alertEmail: "",
    inAppAlerts: true,
  });

  useEffect(() => {
    if (userData) {
      const prefs = userData.notification_preferences || {};
      const email_alerts = prefs.email_alerts ?? false;
      const alert_email = prefs.alert_email || userData.email || "";
      const in_app_alerts = prefs.in_app_alerts ?? true;
      setEmailAlerts(email_alerts);
      setAlertEmail(alert_email);
      setInAppAlerts(in_app_alerts);
      setInitialPrefs({
        emailAlerts: email_alerts,
        alertEmail: alert_email,
        inAppAlerts: in_app_alerts,
      });
    }
  }, [userData]);
  const [alerts, setAlerts] = useState(MOCK_ALERTS);
  const [search, setSearch] = useState("");
  const [selectedAlerts, setSelectedAlerts] = useState(new Set());
  const [activeFilters, setActiveFilters] = useState({ type: new Set() });
  const [currentPage, setCurrentPage] = useState(1);
  const [saving, setSaving] = useState(false);
  const itemsPerPage = 6;

  const handleFilterChange = createFilterChangeHandler(setActiveFilters);

  const filtered = useMemo(() => {
    let result = alerts;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((a) => a.message.toLowerCase().includes(q));
    }
    return result;
  }, [alerts, search, activeFilters]);

  const paginatedAlerts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage]);

  const allVisible =
    paginatedAlerts.length > 0 &&
    paginatedAlerts.every((a) => selectedAlerts.has(a.id));
  const isIndeterminate =
    !allVisible && paginatedAlerts.some((a) => selectedAlerts.has(a.id));

  const toggleAll = () => {
    if (selectedAlerts.size > 0) {
      setSelectedAlerts(new Set());
    } else {
      setSelectedAlerts(new Set(paginatedAlerts.map((a) => a.id)));
    }
  };

  const toggleOne = (id) => {
    const next = new Set(selectedAlerts);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedAlerts(next);
  };

  const deleteSelected = () => {
    setAlerts((prev) => prev.filter((a) => !selectedAlerts.has(a.id)));
    setSelectedAlerts(new Set());
  };

  const deleteOne = (id) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    const next = new Set(selectedAlerts);
    next.delete(id);
    setSelectedAlerts(next);
  };

  const hasChanges =
    emailAlerts !== initialPrefs.emailAlerts ||
    alertEmail !== initialPrefs.alertEmail ||
    inAppAlerts !== initialPrefs.inAppAlerts;

  const handleEmailAlertsToggle = (newValue) => {
    setEmailAlerts(newValue);
  };

  const handleInAppAlertsToggle = (newValue) => {
    setInAppAlerts(newValue);
  };

  const handleEmailChange = (e) => {
    setAlertEmail(e.target.value);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        notification_preferences: {
          email_alerts: emailAlerts,
          alert_email: alertEmail,
          in_app_alerts: inAppAlerts,
        },
      });
      setInitialPrefs({ emailAlerts, alertEmail, inAppAlerts });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error("Failed to save notification preferences", e);
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    backgroundColor: themeColors.inputBg,
    borderRadius: "8px",
    color: themeColors.text,
    border: `1px solid ${themeColors.borderLight}`,
    padding: "7px 12px",
    fontSize: "0.9rem",
    outline: "none",
    boxSizing: "border-box",
  };

  return (
    <div>
      <p
        style={{
          color: themeColors.textPrimary,
          fontWeight: 700,
          fontSize: "1.1rem",
          margin: "0 0 4px 0",
          fontFamily: "inherit",
        }}
      >
        Notification Centre
      </p>
      <p
        style={{
          color: themeColors.textSecondary,
          fontSize: "0.85rem",
          margin: "0 0 24px 0",
          fontFamily: "inherit",
        }}
      >
        Take a look at your notifications
      </p>

      {/* Email Alerts */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 32,
          marginBottom: 24,
        }}
      >
        <div style={{ width: 200 }}>
          <p
            style={{
              color: themeColors.textPrimary,
              fontWeight: 600,
              fontSize: "0.95rem",
              margin: 0,
              fontFamily: "inherit",
            }}
          >
            Email alerts
          </p>
          <p
            style={{
              color: themeColors.textSecondary,
              fontSize: "0.8rem",
              margin: "4px 0 0 0",
              fontFamily: "inherit",
            }}
          >
            Activate email alerts
          </p>
        </div>
        <div
          style={{ display: "flex", alignItems: "center", gap: 16, flex: 1 }}
        >
          <input
            value={alertEmail}
            onChange={handleEmailChange}
            placeholder="Email"
            disabled={!emailAlerts || saving}
            style={{
              ...inputStyle,
              width: 280,
              opacity: !emailAlerts || saving ? 0.5 : 1,
            }}
          />
          {/* Toggle switch */}
          <button
            role="switch"
            aria-checked={emailAlerts}
            onClick={() => handleEmailAlertsToggle(!emailAlerts)}
            disabled={saving}
            style={{
              width: 44,
              height: 24,
              borderRadius: 12,
              border: "none",
              cursor: saving ? "not-allowed" : "pointer",
              backgroundColor: emailAlerts
                ? themeColors.success
                : themeColors.textSecondary,
              position: "relative",
              padding: 0,
              transition: "background-color 0.2s ease",
              flexShrink: 0,
            }}
          >
            <span
              style={{
                position: "absolute",
                top: 2,
                left: emailAlerts ? 22 : 2,
                width: 20,
                height: 20,
                borderRadius: "50%",
                backgroundColor: "#fff",
                transition: "left 0.2s ease",
              }}
            />
          </button>
        </div>
      </div>

      {/* In-App Alerts */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 32,
          marginBottom: 32,
        }}
      >
        <div style={{ width: 200 }}>
          <p
            style={{
              color: themeColors.textPrimary,
              fontWeight: 600,
              fontSize: "0.95rem",
              margin: 0,
              fontFamily: "inherit",
            }}
          >
            In-App alerts
          </p>
          <p
            style={{
              color: themeColors.textSecondary,
              fontSize: "0.8rem",
              margin: "4px 0 0 0",
              fontFamily: "inherit",
            }}
          >
            Activate pop-up alerts
          </p>
        </div>
        <button
          role="switch"
          aria-checked={inAppAlerts}
          onClick={() => handleInAppAlertsToggle(!inAppAlerts)}
          disabled={saving}
          style={{
            width: 44,
            height: 24,
            borderRadius: 12,
            border: "none",
            cursor: saving ? "not-allowed" : "pointer",
            backgroundColor: inAppAlerts
              ? themeColors.success
              : themeColors.textSecondary,
            position: "relative",
            padding: 0,
            transition: "background-color 0.2s ease",
            flexShrink: 0,
          }}
        >
          <span
            style={{
              position: "absolute",
              top: 2,
              left: inAppAlerts ? 22 : 2,
              width: 20,
              height: 20,
              borderRadius: "50%",
              backgroundColor: "#fff",
              transition: "left 0.2s ease",
            }}
          />
        </button>
      </div>

      {/* Alerts Table */}
      <div
        style={{
          backgroundColor: themeColors.bgSecondary,
          border: `1px solid ${themeColors.borderLight}`,
          borderRadius: "16px",
          overflow: "hidden",
          marginBottom: 24,
        }}
      >
        {/* Toolbar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 16px",
            borderBottom: `1px solid ${themeColors.borderLight}`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                color: themeColors.textPrimary,
                fontWeight: 600,
                fontSize: "0.95rem",
              }}
            >
              Alert History
            </span>
            <span
              style={{
                backgroundColor: themeColors.lightOverlay,
                color: themeColors.textPrimary,
                fontSize: "0.8rem",
                fontWeight: 500,
                padding: "2px 8px",
                borderRadius: "12px",
              }}
            >
              {filtered.length}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <SearchField
              placeholder="Search alerts"
              value={search}
              onChange={(val) => {
                setSearch(val);
                setCurrentPage(1);
              }}
              width="240px"
            />
            <FilterButton
              filterGroups={NOTIFICATION_FILTERS}
              activeFilters={activeFilters}
              onFilterChange={handleFilterChange}
            />
            <button
              onClick={deleteSelected}
              disabled={selectedAlerts.size === 0}
              style={{
                color:
                  selectedAlerts.size === 0
                    ? themeColors.textDisabled
                    : themeColors.error,
                border: `1px solid ${
                  selectedAlerts.size === 0
                    ? themeColors.borderLight
                    : `${themeColors.error}40`
                }`,
                borderRadius: "8px",
                fontSize: "16px",
                fontWeight: "500",
                padding: "12px 24px",
                height: "48px",
                whiteSpace: "nowrap",
                background: "none",
                cursor: selectedAlerts.size === 0 ? "not-allowed" : "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
              }}
            >
              <TrashIcon width={13} height={15} color="currentColor" />
              Delete
            </button>
          </div>
        </div>

        {/* Header */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "40px 1fr 200px 48px",
            padding: "10px 16px",
            backgroundColor: themeColors.bgSecondary,
            position: "sticky",
            top: 0,
            zIndex: 10,
            borderBottom: `1px solid ${themeColors.borderLight}`,
            alignItems: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Checkbox
              checked={allVisible}
              indeterminate={isIndeterminate}
              onChange={toggleAll}
            />
          </div>
          <span
            style={{
              color: themeColors.textSecondary,
              fontSize: "0.75rem",
              fontWeight: 600,
              letterSpacing: "0.5px",
            }}
          >
            alert
          </span>
          <span
            style={{
              color: themeColors.textSecondary,
              fontSize: "0.75rem",
              fontWeight: 600,
              letterSpacing: "0.5px",
            }}
          >
            date
          </span>
          <span />
        </div>

        {/* Rows */}
        <div
          style={{ display: "flex", flexDirection: "column", minHeight: 200 }}
        >
          {filtered.length === 0 ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                minHeight: 200,
                gap: 8,
              }}
            >
              <span
                style={{
                  color: themeColors.textSecondary,
                  fontSize: "16px",
                  fontWeight: 500,
                }}
              >
                No alerts found
              </span>
              <span
                style={{ color: themeColors.textSecondary, fontSize: "14px" }}
              >
                Try adjusting your search or filter criteria
              </span>
            </div>
          ) : (
            paginatedAlerts.map((alert, idx) => (
              <div
                key={alert.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "40px 1fr 200px 48px",
                  padding: "12px 16px",
                  alignItems: "center",
                  backgroundColor:
                    idx % 2 === 0
                      ? themeColors.lightOverlaySubtle
                      : "transparent",
                  borderBottom: `1px solid ${themeColors.borderLight}`,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Checkbox
                    checked={selectedAlerts.has(alert.id)}
                    onChange={() => toggleOne(alert.id)}
                  />
                </div>
                <span
                  style={{
                    color: themeColors.textPrimary,
                    fontSize: "0.88rem",
                  }}
                >
                  {alert.message}
                </span>
                <span
                  style={{
                    color: themeColors.textSecondary,
                    fontSize: "0.82rem",
                  }}
                >
                  {alert.date}
                </span>
                <button
                  onClick={() => deleteOne(alert.id)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 4,
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <TrashIcon width={13} height={15} color={themeColors.error} />
                </button>
              </div>
            ))
          )}
        </div>

        <div style={{ padding: "12px 16px" }}>
          <Pagination
            totalItems={filtered.length}
            itemsPerPage={itemsPerPage}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            itemLabel="alerts"
          />
        </div>
      </div>

      <div style={{ marginTop: 24 }}>
        <SaveButton
          onClick={handleSave}
          disabled={!hasChanges && !saved}
          saving={saving}
          saved={saved}
        />
      </div>
    </div>
  );
}
