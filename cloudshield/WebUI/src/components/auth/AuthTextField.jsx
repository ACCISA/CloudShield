import React from "react";
import PropTypes from "prop-types";
import "../../pages/auth.css";

export default function AuthTextField({
  label,
  placeholder,
  value,
  onChange,
  type = "text",
  endAdornment,
  onKeyDown,
}) {
  return (
    <div className="auth-input-wrap">
      <label className="auth-label">{label}</label>
      <div className="auth-input-container">
        <input
          className="auth-input"
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={onChange}
          onKeyDown={onKeyDown}
          style={endAdornment ? { paddingRight: 44 } : undefined}
        />
        {endAdornment && <div className="auth-input-end">{endAdornment}</div>}
      </div>
    </div>
  );
}

AuthTextField.propTypes = {
  label: PropTypes.string.isRequired,
  placeholder: PropTypes.string,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onChange: PropTypes.func.isRequired,
  type: PropTypes.string,
  endAdornment: PropTypes.node,
  onKeyDown: PropTypes.func,
};
