import React from "react";
import PropTypes from "prop-types";
import "../../pages/auth.css";

export default function PrimaryButton({
  children,
  fullWidth = true,
  style,
  ...rest
}) {
  return (
    <button
      type="button"
      className="auth-btn"
      style={fullWidth ? style : { ...style, width: "auto" }}
      {...rest}
    >
      {children}
    </button>
  );
}

PrimaryButton.propTypes = {
  children: PropTypes.node,
  fullWidth: PropTypes.bool,
  style: PropTypes.object,
};
