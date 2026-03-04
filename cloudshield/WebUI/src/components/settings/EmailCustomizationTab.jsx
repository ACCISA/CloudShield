import { useState, useRef } from "react";
import {
  Box, Typography, TextField, Button, Switch, Divider,
  Avatar, IconButton,
} from "@mui/material";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import MailOutlineOutlinedIcon from "@mui/icons-material/MailOutlineOutlined";

const inputSx = {
  "& .MuiOutlinedInput-root": {
    backgroundColor: "#161616",
    borderRadius: "8px",
    color: "#fff",
    "& fieldset": { borderColor: "rgba(255,255,255,0.12)" },
    "&:hover fieldset": { borderColor: "rgba(255,255,255,0.25)" },
    "&.Mui-focused fieldset": { borderColor: "rgba(255,255,255,0.4)" },
  },
  "& .MuiInputLabel-root": { color: "#9E9E9E" },
  "& .MuiInputLabel-root.Mui-focused": { color: "#fff" },
};

const SectionLabel = ({ title, subtitle }) => (
  <Box sx={{ width: 240, flexShrink: 0 }}>
    <Typography sx={{ color: "#fff", fontWeight: 600, fontSize: "0.95rem" }}>{title}</Typography>
    {subtitle && (
      <Typography sx={{ color: "#9E9E9E", fontSize: "0.8rem", mt: 0.5, lineHeight: 1.4 }}>
        {subtitle}
      </Typography>
    )}
  </Box>
);

const NOTIFICATION_TYPES = [
  { key: "welcome_email", label: "Welcome email", desc: "Sent when a new org is provisioned" },
  { key: "employee_invite", label: "Employee invite", desc: "Sent when an employee is added" },
  { key: "workstation_ready", label: "Workstation ready", desc: "Sent when a workstation finishes provisioning" },
  { key: "security_alert", label: "Security alert", desc: "Sent on suspicious login or access event" },
  { key: "password_reset", label: "Password reset", desc: "Sent when a password reset is requested" },
];

// Live email preview component
const EmailPreview = ({ senderName, brandColor, logoImage, footerText }) => (
  <Box
    sx={{
      backgroundColor: "#f9f9f9",
      borderRadius: "10px",
      overflow: "hidden",
      border: "1px solid rgba(255,255,255,0.08)",
      minWidth: 320,
      maxWidth: 420,
      flexShrink: 0,
    }}
  >
    {/* Preview label */}
    <Box sx={{ backgroundColor: "#1a1a1a", padding: "8px 14px" }}>
      <Typography sx={{ color: "#9E9E9E", fontSize: "0.72rem", fontWeight: 500 }}>
        LIVE PREVIEW
      </Typography>
    </Box>

    {/* Email content */}
    <Box sx={{ padding: "24px 28px" }}>
      {/* Header bar */}
      <Box
        sx={{
          backgroundColor: brandColor || "#1a1a2e",
          borderRadius: "8px 8px 0 0",
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          gap: 2,
          mb: 0,
        }}
      >
        {logoImage ? (
          <Box
            component="img"
            src={logoImage}
            sx={{ height: 32, width: 32, borderRadius: "6px", objectFit: "cover" }}
          />
        ) : (
          <Box
            sx={{
              height: 32,
              width: 32,
              borderRadius: "6px",
              backgroundColor: "rgba(255,255,255,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <MailOutlineOutlinedIcon sx={{ color: "#fff", fontSize: "1rem" }} />
          </Box>
        )}
        <Typography sx={{ color: "#fff", fontWeight: 700, fontSize: "0.95rem" }}>
          {senderName || "CloudShield"}
        </Typography>
      </Box>

      {/* Body */}
      <Box
        sx={{
          backgroundColor: "#fff",
          padding: "20px",
          borderRadius: "0 0 8px 8px",
          mb: 1,
        }}
      >
        <Typography sx={{ color: "#222", fontWeight: 700, fontSize: "1rem", mb: 1 }}>
          Welcome to {senderName || "CloudShield"} 👋
        </Typography>
        <Typography sx={{ color: "#555", fontSize: "0.82rem", lineHeight: 1.6, mb: 2 }}>
          Your account has been set up and is ready to use. Click the button below to get started.
        </Typography>
        <Box
          sx={{
            display: "inline-block",
            backgroundColor: brandColor || "#1a1a2e",
            color: "#fff",
            padding: "8px 20px",
            borderRadius: "6px",
            fontSize: "0.82rem",
            fontWeight: 600,
            mb: 2,
          }}
        >
          Get Started
        </Box>
        <Divider sx={{ borderColor: "#eee", mb: 1.5 }} />
        <Typography sx={{ color: "#aaa", fontSize: "0.72rem", lineHeight: 1.5 }}>
          {footerText || "You're receiving this because you have an account with us. If you have any questions, contact support."}
        </Typography>
      </Box>
    </Box>
  </Box>
);

export default function EmailCustomizationTab({ orgData, onSave }) {
  const branding = orgData?.email_branding || {};

  const [senderName, setSenderName] = useState(branding.sender_name || "");
  const [brandColor, setBrandColor] = useState(branding.brand_color || "#1a1a2e");
  const [logoImage, setLogoImage] = useState(branding.logo_image || null);
  const [footerText, setFooterText] = useState(branding.footer_text || "");
  const [notifToggles, setNotifToggles] = useState(
    branding.notification_toggles ||
      Object.fromEntries(NOTIFICATION_TYPES.map((n) => [n.key, true]))
  );
  const [saving, setSaving] = useState(false);
  const logoRef = useRef();

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setLogoImage(ev.target.result);
    reader.readAsDataURL(file);
  };

  const toggleNotif = (key) =>
    setNotifToggles((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleSave = async () => {
    setSaving(true);
    await onSave({
      email_branding: {
        sender_name: senderName,
        brand_color: brandColor,
        logo_image: logoImage,
        footer_text: footerText,
        notification_toggles: notifToggles,
      },
    });
    setSaving(false);
  };

  return (
    <Box>
      <Typography sx={{ color: "#fff", fontWeight: 700, fontSize: "1.1rem", mb: 0.5 }}>
        Email Customization
      </Typography>
      <Typography sx={{ color: "#9E9E9E", fontSize: "0.85rem", mb: 3 }}>
        Customize the branding and content of system emails sent to your employees
      </Typography>

      <Divider sx={{ borderColor: "rgba(255,255,255,0.06)", mb: 3 }} />

      {/* Two-column layout: form left, preview right */}
      <Box sx={{ display: "flex", gap: 4, alignItems: "flex-start" }}>
        {/* Left: form */}
        <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 0 }}>

          {/* Sender Name */}
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 3, mb: 3 }}>
            <SectionLabel
              title="Sender name"
              subtitle="Name that appears as email sender"
            />
            <TextField
              label="Sender name"
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              fullWidth
              sx={inputSx}
            />
          </Box>

          <Divider sx={{ borderColor: "rgba(255,255,255,0.06)", mb: 3 }} />

          {/* Brand Color */}
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 3, mb: 3 }}>
            <SectionLabel
              title="Brand color"
              subtitle="Used in email headers and buttons"
            />
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: "8px",
                  backgroundColor: brandColor,
                  border: "2px solid rgba(255,255,255,0.15)",
                  flexShrink: 0,
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                <input
                  type="color"
                  value={brandColor}
                  onChange={(e) => setBrandColor(e.target.value)}
                  style={{
                    position: "absolute",
                    inset: 0,
                    opacity: 0,
                    width: "100%",
                    height: "100%",
                    cursor: "pointer",
                    border: "none",
                  }}
                />
              </Box>
              <TextField
                value={brandColor}
                onChange={(e) => setBrandColor(e.target.value)}
                placeholder="#1a1a2e"
                size="small"
                sx={{ ...inputSx, width: 140 }}
              />
            </Box>
          </Box>

          <Divider sx={{ borderColor: "rgba(255,255,255,0.06)", mb: 3 }} />

          {/* Logo */}
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 3, mb: 3 }}>
            <SectionLabel
              title="Email logo"
              subtitle="Displayed in email header (recommended 64×64)"
            />
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Box sx={{ position: "relative" }}>
                <Avatar
                  src={logoImage || undefined}
                  variant="rounded"
                  sx={{ width: 56, height: 56, backgroundColor: "#2a2a2a", borderRadius: "8px" }}
                >
                  <MailOutlineOutlinedIcon sx={{ color: "#555" }} />
                </Avatar>
                <IconButton
                  onClick={() => logoRef.current?.click()}
                  sx={{
                    position: "absolute",
                    bottom: -4,
                    right: -4,
                    backgroundColor: "#222",
                    border: "2px solid #0A0A0A",
                    padding: "3px",
                    "&:hover": { backgroundColor: "#333" },
                  }}
                  size="small"
                >
                  <EditOutlinedIcon sx={{ fontSize: "0.75rem", color: "#fff" }} />
                </IconButton>
                <input
                  ref={logoRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={handleLogoChange}
                />
              </Box>
              {logoImage && (
                <Button
                  onClick={() => setLogoImage(null)}
                  size="small"
                  sx={{
                    color: "#ef5350",
                    textTransform: "none",
                    fontSize: "0.8rem",
                    "&:hover": { backgroundColor: "rgba(239,83,80,0.08)" },
                  }}
                >
                  Remove
                </Button>
              )}
            </Box>
          </Box>

          <Divider sx={{ borderColor: "rgba(255,255,255,0.06)", mb: 3 }} />

          {/* Footer Text */}
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 3, mb: 3 }}>
            <SectionLabel
              title="Email footer"
              subtitle="Appears at the bottom of every email"
            />
            <TextField
              label="Footer text"
              value={footerText}
              onChange={(e) => setFooterText(e.target.value)}
              fullWidth
              multiline
              rows={3}
              sx={inputSx}
              inputProps={{ maxLength: 300 }}
              helperText={
                <Typography sx={{ color: "#555", fontSize: "0.72rem" }}>
                  {footerText.length}/300
                </Typography>
              }
            />
          </Box>

          <Divider sx={{ borderColor: "rgba(255,255,255,0.06)", mb: 3 }} />

          {/* Notification Type Toggles */}
          <Box sx={{ mb: 3 }}>
            <Typography sx={{ color: "#fff", fontWeight: 600, fontSize: "0.95rem", mb: 0.5 }}>
              Email notifications
            </Typography>
            <Typography sx={{ color: "#9E9E9E", fontSize: "0.8rem", mb: 2 }}>
              Choose which system emails are sent to your employees
            </Typography>
            <Box
              sx={{
                backgroundColor: "#111",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: "12px",
                overflow: "hidden",
              }}
            >
              {NOTIFICATION_TYPES.map((notif, idx) => (
                <Box key={notif.key}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "14px 20px",
                      backgroundColor:
                        idx % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent",
                    }}
                  >
                    <Box>
                      <Typography sx={{ color: "#fff", fontSize: "0.88rem", fontWeight: 500 }}>
                        {notif.label}
                      </Typography>
                      <Typography sx={{ color: "#9E9E9E", fontSize: "0.78rem" }}>
                        {notif.desc}
                      </Typography>
                    </Box>
                    <Switch
                      checked={notifToggles[notif.key] ?? true}
                      onChange={() => toggleNotif(notif.key)}
                      sx={{
                        "& .MuiSwitch-switchBase.Mui-checked": { color: "#fff" },
                        "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                          backgroundColor: "#555",
                        },
                        "& .MuiSwitch-track": { backgroundColor: "#333" },
                      }}
                    />
                  </Box>
                  {idx < NOTIFICATION_TYPES.length - 1 && (
                    <Divider sx={{ borderColor: "rgba(255,255,255,0.04)" }} />
                  )}
                </Box>
              ))}
            </Box>
          </Box>

          <Button
            onClick={handleSave}
            disabled={saving}
            variant="contained"
            sx={{
              backgroundColor: "#fff",
              color: "#000",
              fontWeight: 600,
              borderRadius: "10px",
              textTransform: "none",
              padding: "10px 28px",
              alignSelf: "flex-start",
              "&:hover": { backgroundColor: "#e0e0e0" },
              "&:disabled": { backgroundColor: "#333", color: "#666" },
            }}
          >
            {saving ? "Saving..." : "Save changes"}
          </Button>
        </Box>

        {/* Right: Live preview */}
        <Box sx={{ position: "sticky", top: 20 }}>
          <EmailPreview
            senderName={senderName}
            brandColor={brandColor}
            logoImage={logoImage}
            footerText={footerText}
          />
        </Box>
      </Box>
    </Box>
  );
}