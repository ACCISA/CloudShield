import PropTypes from "prop-types";
import { useThemeColors } from "../../../hooks/useThemeColors.js";
import SaveIcon from "../../../assets/SaveIcon.jsx";

export default function SaveButton({
  onClick,
  disabled = false,
  saving = false,
  saved = false,
  label = "Save changes",
}) {
  const themeColors = useThemeColors();
  const isDisabled = disabled || saving;
  const iconColor = isDisabled
    ? themeColors.textSecondary
    : themeColors.primaryText;

  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      style={{
        backgroundColor: isDisabled
          ? themeColors.bgTertiary
          : themeColors.primary,
        color: isDisabled ? themeColors.textSecondary : themeColors.primaryText,
        fontWeight: 600,
        borderRadius: "10px",
        border: "none",
        padding: "10px 28px",
        cursor: isDisabled ? "not-allowed" : "pointer",
        fontSize: "1rem",
        display: "flex",
        alignItems: "center",
        gap: "8px",
        opacity: disabled && !saving ? 0.5 : 1,
        transition: "background-color 0.2s ease, opacity 0.2s ease",
      }}
    >
      <SaveIcon width={16} height={16} color={iconColor} />
      {saving ? "Saving..." : saved ? "Saved!" : label}
    </button>
  );
}

SaveButton.propTypes = {
  onClick: PropTypes.func,
  disabled: PropTypes.bool,
  saving: PropTypes.bool,
  saved: PropTypes.bool,
  label: PropTypes.string,
};
