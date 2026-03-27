import React, { useState } from "react";
import "../../pages/auth.css";

const EyeOpenIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeClosedIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

/**
 * Password input field with show/hide toggle.
 * @param {Object} props
 * @param {string} [props.label='Password'] - Label text
 * @param {string} props.value - Current password value
 * @param {Function} props.onChange - Change handler
 * @returns {JSX.Element} Password input with visibility toggle
 */
export default function PasswordField({
  label = "Password",
  value,
  onChange,
  onKeyDown,
}) {
  const [show, setShow] = useState(false);

  return (
    <div className="auth-input-wrap" style={{ marginBottom: 18 }}>
      <div className="auth-password-label-row">
        <label className="auth-label" style={{ margin: 0 }}>
          {label}
        </label>
        <button
          type="button"
          className="auth-show-toggle"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? <EyeOpenIcon /> : <EyeClosedIcon />}
          {show ? "Hide" : "Show"}
        </button>
      </div>
      <div className="auth-input-container">
        <input
          className="auth-input"
          type={show ? "text" : "password"}
          value={value}
          onChange={onChange}
          onKeyDown={onKeyDown}
          placeholder="••••••••••••"
        />
      </div>
    </div>
  );
}
