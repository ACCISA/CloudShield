import { useState, useRef, useEffect } from "react";
import { compressImage } from "../../lib/compressImage.js";
import { useThemeColors } from "../../hooks/useThemeColors.js";
import SaveButton from "../common/SaveButton/SaveButton.jsx";

const SectionLabel = ({ title, subtitle, themeColors }) => (
  <div style={{ width: 260, flexShrink: 0 }}>
    <p
      style={{
        color: themeColors.text,
        fontWeight: 600,
        fontSize: "0.95rem",
        margin: 0,
      }}
    >
      {title}
    </p>
    {subtitle && (
      <p
        style={{
          color: themeColors.textSecondary,
          fontSize: "0.8rem",
          marginTop: 4,
          lineHeight: 1.4,
          margin: "4px 0 0 0",
        }}
      >
        {subtitle}
      </p>
    )}
  </div>
);

export default function BasicInfoTab({ userData, onSave, orgData, onOrgSave }) {
  const themeColors = useThemeColors();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profileImage, setProfileImage] = useState(null);
  const [orgLogo, setOrgLogo] = useState(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const fileRef = useRef();
  const logoRef = useRef();

  // Watch for userData changes to auto-populate the fields
  useEffect(() => {
    if (userData) {
      setFullName(userData.full_name || "");
      setEmail(userData.email || "");
      setProfileImage(userData.profile_image || null);
    }
  }, [userData]);

  useEffect(() => {
    if (orgData) {
      setOrgLogo(orgData.logo || null);
    }
  }, [orgData]);

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const dataUrl = await compressImage(file, {
        maxWidth: 256,
        maxHeight: 256,
      });
      setProfileImage(dataUrl);
    } catch {
      const reader = new FileReader();
      reader.onload = (ev) => setProfileImage(ev.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleLogoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const dataUrl = await compressImage(file, {
        maxWidth: 256,
        maxHeight: 256,
      });
      setOrgLogo(dataUrl);
    } catch {
      const reader = new FileReader();
      reader.onload = (ev) => setOrgLogo(ev.target.result);
      reader.readAsDataURL(file);
    }
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
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setSaving(true);

    const userPayload = {};
    const newFullName = fullName.trim();
    const newEmail = email.trim().toLowerCase();

    // Only send fields that actually changed
    if (newFullName !== userData?.full_name)
      userPayload.full_name = newFullName;
    if (newEmail !== userData?.email) userPayload.email = newEmail;
    if (newPassword) userPayload.password = newPassword;
    if (profileImage && profileImage !== userData?.profile_image)
      userPayload.profile_image = profileImage;

    const orgPayload = {};
    if (orgLogo !== (orgData?.logo ?? null)) orgPayload.logo = orgLogo;

    const saves = [];
    if (Object.keys(userPayload).length > 0) saves.push(onSave(userPayload));
    if (Object.keys(orgPayload).length > 0 && onOrgSave)
      saves.push(onOrgSave(orgPayload));

    await Promise.all(saves);

    setSaving(false);
    setNewPassword("");
    setConfirmPassword("");
  };

  const inputStyle = {
    backgroundColor: themeColors.inputBg,
    borderRadius: "8px",
    color: themeColors.text,
    border: `1px solid ${themeColors.borderLight}`,
    padding: "10px 12px",
    fontSize: "0.95rem",
    width: "100%",
    boxSizing: "border-box",
    outline: "none",
  };

  return (
    <div>
      <p
        style={{
          color: themeColors.text,
          fontWeight: 700,
          fontSize: "1.1rem",
          margin: "0 0 4px 0",
        }}
      >
        Basic Info
      </p>
      <p
        style={{
          color: themeColors.textSecondary,
          fontSize: "0.85rem",
          margin: "0 0 24px 0",
        }}
      >
        Take a look at your personal information
      </p>

      <hr
        style={{
          borderColor: "rgba(255,255,255,0.06)",
          borderStyle: "solid",
          borderWidth: "0 0 1px 0",
          margin: "0 0 24px 0",
        }}
      />

      {/* Profile Picture and Name Side by Side */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          marginBottom: 32,
          gap: 32,
        }}
      >
        {/* Profile Picture */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
            flexShrink: 0,
          }}
        >
          <p
            style={{
              color: themeColors.text,
              fontWeight: 600,
              fontSize: "0.9rem",
              margin: "0 0 8px 0",
            }}
          >
            Profile picture
          </p>
          <div style={{ position: "relative" }}>
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: "50%",
                backgroundColor: themeColors.bgTertiary,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.5rem",
                color: themeColors.text,
                overflow: "hidden",
              }}
            >
              {profileImage ? (
                <img
                  src={profileImage}
                  alt="Profile"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                (fullName?.[0] || "U").toUpperCase()
              )}
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              style={{
                position: "absolute",
                bottom: -4,
                right: -4,
                backgroundColor: themeColors.bgActive,
                border: `2px solid ${themeColors.bgPrimary}`,
                padding: "4px",
                borderRadius: "50%",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 24,
                height: 24,
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill={themeColors.text}
              >
                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
              </svg>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleImageChange}
            />
          </div>
        </div>

        {/* Name Fields */}
        <div
          style={{ display: "flex", flexDirection: "column", flex: 1, gap: 16 }}
        >
          <SectionLabel
            title="Name"
            subtitle="Your name as it appears throughout the platform"
            themeColors={themeColors}
          />
          <div>
            <input
              placeholder="Admin Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              style={{
                ...inputStyle,
                borderColor: errors.fullName
                  ? themeColors.error
                  : themeColors.borderLight,
              }}
            />
            {errors.fullName && (
              <p
                style={{
                  color: themeColors.error,
                  fontSize: "0.75rem",
                  margin: "4px 0 0 0",
                }}
              >
                {errors.fullName}
              </p>
            )}
          </div>
        </div>
      </div>

      <hr
        style={{
          borderColor: "rgba(255,255,255,0.06)",
          borderStyle: "solid",
          borderWidth: "0 0 1px 0",
          margin: "0 0 24px 0",
        }}
      />

      {/* Business Logo */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          marginBottom: 32,
          gap: 32,
        }}
      >
        <SectionLabel
          title="Business logo"
          subtitle="Displayed in the sidebar next to your organisation name"
          themeColors={themeColors}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ position: "relative" }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "12px",
                backgroundColor: themeColors.bgTertiary,
                border: `1px solid ${themeColors.borderLight}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}
            >
              {orgLogo ? (
                <img
                  src={orgLogo}
                  alt="Business logo"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill={themeColors.textSecondary}
                >
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" />
                </svg>
              )}
            </div>
            <button
              onClick={() => logoRef.current?.click()}
              style={{
                position: "absolute",
                bottom: -4,
                right: -4,
                backgroundColor: themeColors.bgActive,
                border: `2px solid ${themeColors.bgPrimary}`,
                padding: "4px",
                borderRadius: "50%",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 24,
                height: 24,
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill={themeColors.text}
              >
                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
              </svg>
            </button>
            <input
              ref={logoRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleLogoChange}
            />
          </div>
          {orgLogo && (
            <button
              onClick={() => setOrgLogo(null)}
              style={{
                background: "none",
                border: "none",
                color: themeColors.error,
                cursor: "pointer",
                fontSize: "0.85rem",
                padding: 0,
              }}
            >
              Remove
            </button>
          )}
        </div>
      </div>

      <hr
        style={{
          borderColor: "rgba(255,255,255,0.06)",
          borderStyle: "solid",
          borderWidth: "0 0 1px 0",
          margin: "0 0 24px 0",
        }}
      />

      {/* Email */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          marginBottom: 32,
          gap: 32,
        }}
      >
        <SectionLabel
          title="Email"
          subtitle="Your email which appears throughout and for receiving notifications"
          themeColors={themeColors}
        />
        <div style={{ flex: 1 }}>
          <input
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              ...inputStyle,
              borderColor: errors.email
                ? themeColors.error
                : themeColors.borderLight,
            }}
          />
          {errors.email && (
            <p
              style={{
                color: themeColors.error,
                fontSize: "0.75rem",
                margin: "4px 0 0 0",
              }}
            >
              {errors.email}
            </p>
          )}
        </div>
      </div>

      <hr
        style={{
          borderColor: "rgba(255,255,255,0.06)",
          borderStyle: "solid",
          borderWidth: "0 0 1px 0",
          margin: "0 0 24px 0",
        }}
      />

      {/* Password */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          marginBottom: 32,
          gap: 32,
        }}
      >
        <SectionLabel
          title="Password"
          subtitle="Password to your account"
          themeColors={themeColors}
        />
        <div style={{ display: "flex", gap: 16, flex: 1 }}>
          <div style={{ flex: 1 }}>
            <input
              placeholder="New password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              style={{
                ...inputStyle,
                borderColor: errors.newPassword
                  ? themeColors.error
                  : themeColors.borderLight,
              }}
            />
            {errors.newPassword && (
              <p
                style={{
                  color: themeColors.error,
                  fontSize: "0.75rem",
                  margin: "4px 0 0 0",
                }}
              >
                {errors.newPassword}
              </p>
            )}
          </div>
          <div style={{ flex: 1 }}>
            <input
              placeholder="Confirm password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={{
                ...inputStyle,
                borderColor: errors.confirmPassword
                  ? themeColors.error
                  : themeColors.borderLight,
              }}
            />
            {errors.confirmPassword && (
              <p
                style={{
                  color: themeColors.error,
                  fontSize: "0.75rem",
                  margin: "4px 0 0 0",
                }}
              >
                {errors.confirmPassword}
              </p>
            )}
          </div>
        </div>
      </div>

      <hr
        style={{
          borderColor: themeColors.borderLight,
          borderStyle: "solid",
          borderWidth: "0 0 1px 0",
          margin: "0 0 24px 0",
        }}
      />

      <SaveButton onClick={handleSave} saving={saving} />
    </div>
  );
}
