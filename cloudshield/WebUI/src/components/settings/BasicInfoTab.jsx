import { useState, useRef, useEffect } from "react";
import { Box, Typography, TextField, Button, Avatar, Divider, IconButton } from "@mui/material";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import { useThemeColors } from "../../hooks/useThemeColors.js";

const SectionLabel = ({ title, subtitle, themeColors }) => (
  <Box sx={{ width: 260, flexShrink: 0 }}>
    <Typography sx={{ color: themeColors.text, fontWeight: 600, fontSize: "0.95rem" }}>{title}</Typography>
    {subtitle && (
      <Typography sx={{ color: themeColors.textSecondary, fontSize: "0.8rem", mt: 0.5, lineHeight: 1.4 }}>
        {subtitle}
      </Typography>
    )}
  </Box>
);

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
});

export default function BasicInfoTab({ userData, onSave }) {
  const themeColors = useThemeColors();
  const inputSx = getInputSx(themeColors);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profileImage, setProfileImage] = useState(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const fileRef = useRef();

  // Watch for userData changes to auto-populate the fields
  useEffect(() => {
    if (userData) {
      setFullName(userData.full_name || "");
      setEmail(userData.email || "");
      setProfileImage(userData.profile_image || null);
    }
  }, [userData]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setProfileImage(ev.target.result);
    reader.readAsDataURL(file);
  };

  const validate = () => {
    const errs = {};
    if (!fullName.trim()) errs.fullName = "Name is required";
    if (!email.trim()) errs.email = "Email is required";
    if (newPassword && newPassword !== confirmPassword)
      errs.confirmPassword = "Passwords do not match"; //NOSONAR javascript:S2068
    if (newPassword && newPassword.length < 12)
      errs.newPassword = "Password must be at least 12 characters"; //NOSONAR javascript:S2068
    return errs;
  };

  const handleSave = async () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setSaving(true);

    const payload = {};
    const newFullName = fullName.trim();
    const newEmail = email.trim().toLowerCase();

    // Only send fields that actually changed
    if (newFullName !== userData?.full_name) payload.full_name = newFullName;
    if (newEmail !== userData?.email) payload.email = newEmail;
    if (newPassword) payload.password = newPassword;
    if (profileImage && profileImage !== userData?.profile_image) payload.profile_image = profileImage;

    // If nothing changed and no password is set, just return
    if (Object.keys(payload).length === 0) {
        setSaving(false);
        return;
    }

    await onSave(payload);
    setSaving(false);
    setNewPassword("");
    setConfirmPassword("");
  };

  return (
    <Box>
      <Typography sx={{ color: themeColors.text, fontWeight: 700, fontSize: "1.1rem", mb: 0.5 }}>
        Basic Info
      </Typography>
      <Typography sx={{ color: themeColors.textSecondary, fontSize: "0.85rem", mb: 3 }}>
        Take a look at your personal information
      </Typography>

      <Divider sx={{ borderColor: "rgba(255,255,255,0.06)", mb: 3 }} />

      {/* Profile Picture and Name Side by Side */}
      <Box sx={{ display: "flex", alignItems: "flex-start", mb: 4, gap: 4 }}>
        {/* Profile Picture */}
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1, flexShrink: 0 }}>
          <Typography sx={{ color: themeColors.text, fontWeight: 600, fontSize: "0.9rem", mb: 1 }}>
            Profile picture
          </Typography>
          <Box sx={{ position: "relative" }}>
            <Avatar
              src={profileImage || undefined}
              sx={{ width: 80, height: 80, backgroundColor: themeColors.bgTertiary, fontSize: "1.5rem" }}
            >
              {!profileImage && (fullName?.[0] || "U").toUpperCase()}
            </Avatar>
            <IconButton
              onClick={() => fileRef.current?.click()}
              sx={{
                position: "absolute",
                bottom: -4,
                right: -4,
                backgroundColor: themeColors.bgActive,
                border: `2px solid ${themeColors.bgPrimary}`,
                padding: "4px",
                "&:hover": { backgroundColor: themeColors.bgHover },
              }}
              size="small"
            >
              <EditOutlinedIcon sx={{ fontSize: "0.85rem", color: themeColors.text }} />
            </IconButton>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleImageChange} />
          </Box>
        </Box>

        {/* Name Fields */}
        <Box sx={{ display: "flex", flexDirection: "column", flex: 1, gap: 2 }}>
          <SectionLabel
            title="Name"
            subtitle="Your name as it appears throughout the platform"
            themeColors={themeColors}
          />
          <TextField
            label="Admin Name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            error={!!errors.fullName}
            helperText={errors.fullName}
            fullWidth
            sx={{ ...inputSx, flex: 1 }}
          />
        </Box>
      </Box>

      <Divider sx={{ borderColor: "rgba(255,255,255,0.06)", mb: 3 }} />

      {/* Email */}
      <Box sx={{ display: "flex", alignItems: "flex-start", mb: 4, gap: 4 }}>
        <SectionLabel
          title="Email"
          subtitle="Your email which appears throughout and for receiving notifications"
          themeColors={themeColors}
        />
        <TextField
          label="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={!!errors.email}
          helperText={errors.email}
          fullWidth
          sx={{ ...inputSx, flex: 1 }}
        />
      </Box>

      <Divider sx={{ borderColor: "rgba(255,255,255,0.06)", mb: 3 }} />

      {/* Password */}
      <Box sx={{ display: "flex", alignItems: "flex-start", mb: 4, gap: 4 }}>
        <SectionLabel
          title="Password"
          subtitle="Password to your account"
          themeColors={themeColors}
        />
        <Box sx={{ display: "flex", gap: 2, flex: 1 }}>
          <TextField
            label="New password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            error={!!errors.newPassword}
            helperText={errors.newPassword}
            fullWidth
            sx={inputSx}
          />
          <TextField
            label="Confirm password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            error={!!errors.confirmPassword}
            helperText={errors.confirmPassword}
            fullWidth
            sx={inputSx}
          />
        </Box>
      </Box>

      <Divider sx={{ borderColor: themeColors.borderLight, mb: 3 }} />

      <Button
        onClick={handleSave}
        disabled={saving}
        variant="contained"
        sx={{
          backgroundColor: themeColors.primary,
          color: themeColors.primaryText,
          fontWeight: 600,
          borderRadius: "10px",
          textTransform: "none",
          padding: "10px 28px",
          "&:hover": { backgroundColor: themeColors.primaryHover },
          "&:disabled": { backgroundColor: themeColors.bgTertiary, color: themeColors.textSecondary },
        }}
      >
        {saving ? "Saving..." : "Save changes"}
      </Button>
    </Box>
  );
}
