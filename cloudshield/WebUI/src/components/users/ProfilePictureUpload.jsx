/**
 * ProfilePictureUpload.jsx
 *
 * Profile picture component with:
 * - Default random color avatar with initials
 * - Option to upload custom image
 * - Preview of uploaded image
 */

import { useState, useRef } from "react";
import { getRandomAvatarColor, getInitials } from "../../utils/avatarUtils";

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "12px",
  },
  avatarWrapper: {
    position: "relative",
    width: "96px",
    height: "96px",
  },
  avatar: {
    width: "100%",
    height: "100%",
    borderRadius: "16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    fontWeight: 700,
    fontSize: "2rem",
    border: "2px solid rgba(255,255,255,0.12)",
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  uploadButton: {
    position: "absolute",
    bottom: "-8px",
    right: "-8px",
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    backgroundColor: "#3B82F6",
    border: "2px solid #1A1A1A",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    fontSize: "18px",
    transition: "all 0.2s",
  },
  uploadButtonHover: {
    backgroundColor: "#2563EB",
    transform: "scale(1.05)",
  },
  hiddenInput: {
    display: "none",
  },
  changeButton: {
    backgroundColor: "transparent",
    border: "1px solid rgba(255,255,255,0.2)",
    color: "rgba(255,255,255,0.7)",
    padding: "6px 16px",
    borderRadius: "8px",
    fontSize: "0.8rem",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  changeButtonHover: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderColor: "rgba(255,255,255,0.35)",
    color: "#fff",
  },
};

export default function ProfilePictureUpload({
  firstName,
  lastName,
  onImageChange,
}) {
  const [profileImage, setProfileImage] = useState(null);
  const [avatarColor] = useState(getRandomAvatarColor());
  const fileInputRef = useRef(null);

  const initials = getInitials(`${firstName} ${lastName}`);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setProfileImage(event.target.result);
        onImageChange?.(file);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleChangeClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div style={styles.container}>
      <div style={styles.avatarWrapper}>
        <div
          style={{
            ...styles.avatar,
            backgroundColor: profileImage ? "transparent" : avatarColor,
          }}
        >
          {profileImage ? (
            <img src={profileImage} alt="Profile" style={styles.avatarImage} />
          ) : (
            initials
          )}
        </div>

        {!profileImage && (
          <button
            onClick={handleUploadClick}
            style={styles.uploadButton}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor =
                styles.uploadButtonHover.backgroundColor;
              e.currentTarget.style.transform =
                styles.uploadButtonHover.transform;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor =
                styles.uploadButton.backgroundColor;
              e.currentTarget.style.transform = "scale(1)";
            }}
            aria-label="Upload profile picture"
          >
            +
          </button>
        )}
      </div>

      {profileImage && (
        <button
          onClick={handleChangeClick}
          style={styles.changeButton}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor =
              styles.changeButtonHover.backgroundColor;
            e.currentTarget.style.borderColor =
              styles.changeButtonHover.borderColor;
            e.currentTarget.style.color = styles.changeButtonHover.color;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor =
              styles.changeButton.backgroundColor;
            e.currentTarget.style.borderColor = styles.changeButton.borderColor;
            e.currentTarget.style.color = styles.changeButton.color;
          }}
        >
          Change Photo
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        style={styles.hiddenInput}
      />
    </div>
  );
}
