import { useState, useRef, useEffect } from "react";
import { Box, Typography, TextField, Button, Avatar, Divider, IconButton } from "@mui/material";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";

const SectionLabel = ({ title, subtitle }) => (
  <Box sx={{ width: 260, flexShrink: 0 }}>
    <Typography sx={{ color: "#fff", fontWeight: 600, fontSize: "0.95rem" }}>{title}</Typography>
    {subtitle && (
      <Typography sx={{ color: "#9E9E9E", fontSize: "0.8rem", mt: 0.5, lineHeight: 1.4 }}>
        {subtitle}
      </Typography>
    )}
  </Box>
);

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

export default function BasicInfoTab({ userData, onSave }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
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
      const nameParts = (userData.full_name || "").split(" ");
      setFirstName(nameParts[0] || "");
      setLastName(nameParts.slice(1).join(" ") || "");
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
    if (!firstName.trim()) errs.firstName = "First name is required";
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
    const newFullName = `${firstName.trim()} ${lastName.trim()}`.trim();
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
      <Typography sx={{ color: "#fff", fontWeight: 700, fontSize: "1.1rem", mb: 0.5 }}>
        Basic Info
      </Typography>
      <Typography sx={{ color: "#9E9E9E", fontSize: "0.85rem", mb: 3 }}>
        Take a look at your personal information
      </Typography>

      <Divider sx={{ borderColor: "rgba(255,255,255,0.06)", mb: 3 }} />

      {/* Profile Picture and Name Side by Side */}
      <Box sx={{ display: "flex", alignItems: "flex-start", mb: 4, gap: 4 }}>
        {/* Profile Picture */}
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1, flexShrink: 0 }}>
          <Typography sx={{ color: "#fff", fontWeight: 600, fontSize: "0.9rem", mb: 1 }}>
            Profile picture
          </Typography>
          <Box sx={{ position: "relative" }}>
            <Avatar
              src={profileImage || undefined}
              sx={{ width: 80, height: 80, backgroundColor: "#2a2a2a", fontSize: "1.5rem" }}
            >
              {!profileImage && (firstName?.[0] || "U").toUpperCase()}
            </Avatar>
            <IconButton
              onClick={() => fileRef.current?.click()}
              sx={{
                position: "absolute",
                bottom: -4,
                right: -4,
                backgroundColor: "#222",
                border: "2px solid #0A0A0A",
                padding: "4px",
                "&:hover": { backgroundColor: "#333" },
              }}
              size="small"
            >
              <EditOutlinedIcon sx={{ fontSize: "0.85rem", color: "#fff" }} />
            </IconButton>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleImageChange} />
          </Box>
        </Box>

        {/* Name Fields */}
        <Box sx={{ display: "flex", flexDirection: "column", flex: 1, gap: 2 }}>
          <SectionLabel
            title="Name"
            subtitle="Your name which appears throughout"
          />
          <Box sx={{ display: "flex", gap: 2, flex: 1 }}>
            <TextField
              label="First Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              error={!!errors.firstName}
              helperText={errors.firstName}
              fullWidth
              sx={inputSx}
            />
            <TextField
              label="Last Name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              fullWidth
              sx={inputSx}
            />
          </Box>
        </Box>
      </Box>

      <Divider sx={{ borderColor: "rgba(255,255,255,0.06)", mb: 3 }} />

      {/* Email */}
      <Box sx={{ display: "flex", alignItems: "flex-start", mb: 4, gap: 4 }}>
        <SectionLabel
          title="Email"
          subtitle="Your email which appears throughout and for receiving notifications"
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

      <Divider sx={{ borderColor: "rgba(255,255,255,0.06)", mb: 3 }} />

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
          "&:hover": { backgroundColor: "#e0e0e0" },
          "&:disabled": { backgroundColor: "#333", color: "#666" },
        }}
      >
        {saving ? "Saving..." : "Save changes"}
      </Button>
    </Box>
  );
}