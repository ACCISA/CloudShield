import PropTypes from "prop-types";
import EditIcon from "../../../assets/EditIcon";
import PopoverMenuButton from "../PopoverMenuButton/PopoverMenuButton";

function EditButton({ menuItems = [], disabled = false }) {
  return (
    <PopoverMenuButton
      menuItems={menuItems}
      disabled={disabled}
      ariaLabel="Edit menu"
    >
      <button
        disabled={disabled}
        type="button"
        style={{
          padding: "8px", // Added slight padding for a better click target
          backgroundColor: "transparent",
          color: "var(--text-primary)",
          border: "none",
          cursor: disabled ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: disabled ? 0.5 : 1,
          borderRadius: "8px",
          transition: "background-color 0.2s ease",
        }}
        onMouseEnter={(e) => {
          if (!disabled) e.currentTarget.style.backgroundColor = "var(--action-hover)";
        }}
        onMouseLeave={(e) => {
          if (!disabled) e.currentTarget.style.backgroundColor = "transparent";
        }}
      >
        <EditIcon width={16} height={16} color="var(--text-secondary)" />
      </button>
    </PopoverMenuButton>
  );
}

EditButton.propTypes = {
  menuItems: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      icon: PropTypes.node,
      color: PropTypes.string,
      onClick: PropTypes.func,
    }),
  ),
  disabled: PropTypes.bool,
};

EditButton.defaultProps = {
  menuItems: [],
  disabled: false,
};

export default EditButton;