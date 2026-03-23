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
        style={{
          padding: "0",
          backgroundColor: "transparent",
          color: "#fff",
          border: "none",
          cursor: disabled ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <EditIcon width={15} height={16} color="#BCBCBC" />
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
