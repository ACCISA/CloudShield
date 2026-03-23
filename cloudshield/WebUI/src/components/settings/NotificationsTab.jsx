import { useState } from "react";
import {
  Box, Typography, Switch, TextField, Button, Checkbox,
  Divider, InputAdornment, IconButton,
} from "@mui/material";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import FilterListOutlinedIcon from "@mui/icons-material/FilterListOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import { useThemeColors } from "../../hooks/useThemeColors.js";

const MOCK_ALERTS = Array.from({ length: 5 }, (_, i) => ({
  id: `alert-${i}`,
  message: "You've been logged into a new device",
  date: "10/11/2025 11:36 pm",
}));

const getInputSx = (themeColors) => ({
  "& .MuiOutlinedInput-root": {
    backgroundColor: themeColors.inputBg,
    borderRadius: "8px",
    color: themeColors.text,
    "& fieldset": { borderColor: themeColors.borderLight },
    "&:hover fieldset": { borderColor: themeColors.border },
    "&.Mui-focused fieldset": { borderColor: themeColors.borderStrong },
  },
  "& .MuiInputLabel-root": { color: themeColors.textSecondary },
  "& .MuiInputLabel-root.Mui-focused": { color: themeColors.text },
  "& input::placeholder": { color: themeColors.textSecondary },
});

export default function NotificationsTab({ userData, onSave }) {
  const themeColors = useThemeColors();
  
  // FIX: Actually initialize inputSx using the theme colors!
  const inputSx = getInputSx(themeColors);

  const prefs = userData?.notification_preferences || {};

  const [emailAlerts, setEmailAlerts] = useState(prefs.email_alerts ?? false);
  const [alertEmail, setAlertEmail] = useState(prefs.alert_email || userData?.email || "");
  const [inAppAlerts, setInAppAlerts] = useState(prefs.in_app_alerts ?? true);
  const [alerts, setAlerts] = useState(MOCK_ALERTS);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState([]);
  const [saving, setSaving] = useState(false);

  const filtered = alerts.filter((a) =>
    a.message.toLowerCase().includes(search.toLowerCase())
  );

  const toggleAll = () =>
    setSelected(selected.length === filtered.length ? [] : filtered.map((a) => a.id));

  const toggleOne = (id) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const deleteSelected = () => {
    setAlerts((prev) => prev.filter((a) => !selected.includes(a.id)));
    setSelected([]);
  };

  const deleteOne = (id) => setAlerts((prev) => prev.filter((a) => a.id !== id));

  const handleEmailAlertsToggle = async (newValue) => {
    setEmailAlerts(newValue);
    setSaving(true);
    try {
      await onSave({
        notification_preferences: {
          email_alerts: newValue,
          alert_email: alertEmail,
          in_app_alerts: inAppAlerts,
        },
      });
    } catch (e) {
      setEmailAlerts(!newValue); // Revert on failure
      console.error("Failed to save email alerts preference", e);
    } finally {
      setSaving(false);
    }
  };

  const handleInAppAlertsToggle = async (newValue) => {
    setInAppAlerts(newValue);
    setSaving(true);
    try {
      await onSave({
        notification_preferences: {
          email_alerts: emailAlerts,
          alert_email: alertEmail,
          in_app_alerts: newValue,
        },
      });
    } catch (e) {
      setInAppAlerts(!newValue); // Revert on failure
      console.error("Failed to save in-app alerts preference", e);
    } finally {
      setSaving(false);
    }
  };

  const handleEmailChange = (e) => {
    setAlertEmail(e.target.value);
  };

  const handleSaveEmail = async () => {
    setSaving(true);
    try {
      await onSave({
        notification_preferences: {
          email_alerts: emailAlerts,
          alert_email: alertEmail,
          in_app_alerts: inAppAlerts,
        },
      });
    } catch (e) {
      console.error("Failed to save email address", e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <Typography sx={{ color: themeColors.textPrimary, fontWeight: 700, fontSize: "1.1rem", mb: 0.5 }}>
        Notification Centre
      </Typography>
      <Typography sx={{ color: themeColors.textSecondary, fontSize: "0.85rem", mb: 3 }}>
        Take a look at your notifications
      </Typography>

      <Divider sx={{ borderColor: themeColors.borderLight, mb: 3 }} />

      {/* Email Alerts */}
      <Box sx={{ display: "flex", alignItems: "flex-start", gap: 4, mb: 3 }}>
        <Box sx={{ width: 200 }}>
          <Typography sx={{ color: themeColors.textPrimary, fontWeight: 600, fontSize: "0.95rem" }}>
            Email alerts
          </Typography>
          <Typography sx={{ color: themeColors.textSecondary, fontSize: "0.8rem", mt: 0.5 }}>
            Activate email alerts
          </Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, flex: 1 }}>
          <TextField
            value={alertEmail}
            onChange={handleEmailChange}
            onBlur={handleSaveEmail}
            placeholder="Email"
            size="small"
            disabled={!emailAlerts || saving}
            sx={{ ...inputSx, width: 280 }}
          />
          <Switch
            checked={emailAlerts}
            onChange={(e) => handleEmailAlertsToggle(e.target.checked)}
            disabled={saving}
            sx={{
              "& .MuiSwitch-switchBase.Mui-checked": { 
                color: themeColors.success,
                "&:hover": { backgroundColor: "rgba(76, 175, 80, 0.08)" }
              },
              "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                backgroundColor: themeColors.success,
              },
              "& .MuiSwitch-track": { backgroundColor: themeColors.textSecondary },
            }}
          />
        </Box>
      </Box>

      <Divider sx={{ borderColor: themeColors.borderLight, mb: 3 }} />

      {/* In-App Alerts */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 4, mb: 4 }}>
        <Box sx={{ width: 200 }}>
          <Typography sx={{ color: themeColors.textPrimary, fontWeight: 600, fontSize: "0.95rem" }}>
            In-App alerts
          </Typography>
          <Typography sx={{ color: themeColors.textSecondary, fontSize: "0.8rem", mt: 0.5 }}>
            Activate pop-up alerts
          </Typography>
        </Box>
        <Switch
          checked={inAppAlerts}
          onChange={(e) => handleInAppAlertsToggle(e.target.checked)}
          disabled={saving}
          sx={{
            "& .MuiSwitch-switchBase.Mui-checked": { 
              color: themeColors.success,
              "&:hover": { backgroundColor: "rgba(76, 175, 80, 0.08)" }
            },
            "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
              backgroundColor: themeColors.success,
            },
            "& .MuiSwitch-track": { backgroundColor: themeColors.textSecondary },
          }}
        />
      </Box>

      <Divider sx={{ borderColor: themeColors.borderLight, mb: 3 }} />

      {/* Alerts Table */}
      <Box
        sx={{
          backgroundColor: themeColors.bgSecondary,
          border: `1px solid ${themeColors.borderLight}`,
          borderRadius: "14px",
          overflow: "hidden",
          mb: 3,
        }}
      >
        {/* Toolbar */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            padding: "14px 20px",
            borderBottom: `1px solid ${themeColors.borderLight}`,
          }}
        >
          <TextField
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search alerts"
            size="small"
            fullWidth
            sx={inputSx}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchOutlinedIcon sx={{ color: themeColors.textSecondary, fontSize: "1rem" }} />
                </InputAdornment>
              ),
            }}
          />
          <Button
            startIcon={<FilterListOutlinedIcon />}
            sx={{
              color: themeColors.textSecondary,
              border: `1px solid ${themeColors.borderLight}`,
              borderRadius: "8px",
              textTransform: "none",
              fontSize: "0.85rem",
              padding: "6px 14px",
              whiteSpace: "nowrap",
              "&:hover": { backgroundColor: themeColors.lightOverlaySubtle },
            }}
          >
            Filter
          </Button>
          <Button
            startIcon={<DeleteOutlineOutlinedIcon />}
            onClick={deleteSelected}
            disabled={selected.length === 0}
            sx={{
              color: themeColors.error,
              border: `1px solid ${themeColors.error}40`,
              borderRadius: "8px",
              textTransform: "none",
              fontSize: "0.85rem",
              padding: "6px 14px",
              whiteSpace: "nowrap",
              "&:hover": { backgroundColor: `${themeColors.error}15` },
              "&:disabled": { color: themeColors.textDisabled, borderColor: themeColors.borderLight },
            }}
          >
            Delete All
          </Button>
        </Box>

        {/* Header */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "40px 1fr 200px 48px",
            padding: "10px 20px",
            borderBottom: `1px solid ${themeColors.borderLight}`,
          }}
        >
          <Checkbox
            checked={selected.length === filtered.length && filtered.length > 0}
            onChange={toggleAll}
            size="small"
            sx={{ color: themeColors.textSecondary, "&.Mui-checked": { color: themeColors.textPrimary }, padding: 0 }}
          />
          <Typography sx={{ color: themeColors.textSecondary, fontSize: "0.8rem" }}>alert</Typography>
          <Typography sx={{ color: themeColors.textSecondary, fontSize: "0.8rem" }}>Date:</Typography>
          <span />
        </Box>

        {/* Rows */}
        {filtered.map((alert, idx) => (
          <Box
            key={alert.id}
            sx={{
              display: "grid",
              gridTemplateColumns: "40px 1fr 200px 48px",
              padding: "14px 20px",
              alignItems: "center",
              backgroundColor: idx % 2 === 0 ? themeColors.lightOverlaySubtle : "transparent",
              borderBottom: `1px solid ${themeColors.borderLight}`,
              "&:hover": { backgroundColor: themeColors.lightOverlay },
            }}
          >
            <Checkbox
              checked={selected.includes(alert.id)}
              onChange={() => toggleOne(alert.id)}
              size="small"
              sx={{ color: themeColors.textSecondary, "&.Mui-checked": { color: themeColors.textPrimary }, padding: 0 }}
            />
            <Typography sx={{ color: themeColors.textPrimary, fontSize: "0.88rem" }}>{alert.message}</Typography>
            <Typography sx={{ color: themeColors.textSecondary, fontSize: "0.82rem" }}>{alert.date}</Typography>
            <IconButton
              size="small"
              onClick={() => deleteOne(alert.id)}
              sx={{ color: themeColors.error, "&:hover": { color: themeColors.error } }}
            >
              <DeleteOutlineOutlinedIcon sx={{ fontSize: "1rem" }} />
            </IconButton>
          </Box>
        ))}

        {filtered.length === 0 && (
          <Box sx={{ padding: "32px 20px", textAlign: "center" }}>
            <Typography sx={{ color: themeColors.textSecondary, fontSize: "0.85rem" }}>No alerts found</Typography>
          </Box>
        )}
      </Box>

      <Button
        disabled={saving}
        variant="contained"
        sx={{
          backgroundColor: saving ? themeColors.textDisabled : themeColors.primary,
          color: themeColors.primaryText,
          fontWeight: 600,
          borderRadius: "10px",
          textTransform: "none",
          padding: "10px 28px",
          "&:hover": { backgroundColor: saving ? themeColors.textDisabled : themeColors.primaryHover },
          "&:disabled": { backgroundColor: themeColors.bgHover, color: themeColors.textDisabled },
        }}
      >
        {saving ? "Auto-saving..." : "Settings saved"}
      </Button>
    </Box>
  );
}