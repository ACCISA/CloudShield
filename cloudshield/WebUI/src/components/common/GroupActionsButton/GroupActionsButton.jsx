import React from "react";
import PropTypes from "prop-types";
import HandshakeIcon from "../../../assets/HandshakeIcon";
import PopoverMenuButton from "../PopoverMenuButton/PopoverMenuButton";

const GroupActionsButton = ({
  selectedCount = 0,
  buttonText = "Group Actions",
  menuItems = [],
  disabled = false,
}) => {
  // Only render when 2 or more items are selected
  if (selectedCount < 2) {
    return null;
  }

  const buttonContainerStyle = {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: "12px 24px",
    gap: "8px",
    minWidth: "120px",
    height: "48px",
    background: "#1a1a1a",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    borderRadius: "8px",
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: "16px",
    fontWeight: "500",
    color: "#ffffff",
    transition: "all 0.2s ease",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
    opacity: disabled ? 0.4 : 1,
  };

  return (
    <PopoverMenuButton
      menuItems={menuItems}
      disabled={disabled}
      ariaLabel={`${buttonText} (${selectedCount} selected)`}
    >
      <button
        style={buttonContainerStyle}
        disabled={disabled}
        aria-label={`${buttonText} (${selectedCount} selected)`}
        onMouseEnter={(e) => {
          if (!disabled) {
            e.currentTarget.style.background = "#242424";
            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.2)";
          }
        }}
        onMouseLeave={(e) => {
          if (!disabled) {
            e.currentTarget.style.background = "#1a1a1a";
            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
          }
        }}
      >
        <HandshakeIcon size={20} />
        {buttonText}
        {selectedCount > 0 && (
          <span
            style={{
              backgroundColor: "#fff",
              color: "#000",
              fontSize: "11px",
              fontWeight: "600",
              padding: "2px 6px",
              borderRadius: "12px",
              marginLeft: "4px",
            }}
          >
            {selectedCount}
          </span>
        )}
      </button>
    </PopoverMenuButton>
  );
};

GroupActionsButton.propTypes = {
  selectedCount: PropTypes.number,
  buttonText: PropTypes.string,
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

GroupActionsButton.defaultProps = {
  selectedCount: 0,
  buttonText: "Group Actions",
  menuItems: [],
  disabled: false,
};

export default GroupActionsButton;
