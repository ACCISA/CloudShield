/**
 * StyledInput.jsx
 *
 * Purpose:
 *   Reusable styled input field for workstation dialogs.
 *
 * Props:
 *   - label: input label text
 *   - value: input value
 *   - onChange: change handler
 *   - placeholder: placeholder text
 */
import React from "react";

const styles = {
  container: {},
  label: {
    marginBottom: "4px",
    fontWeight: 500,
    color: "#fff",
  },
  input: {
    width: "100%",
    backgroundColor: "#161616",
    borderRadius: "12px",
    color: "#fff",
    border: "1px solid rgba(255,255,255,0.18)",
    padding: "10px 14px",
    fontSize: "1rem",
    outline: "none",
  },
};

/**
 * Styled input field with label for dark theme dialogs.
 * @param {Object} props
 * @param {string} props.label - Input label
 * @param {string} props.value - Input value
 * @param {Function} props.onChange - Change handler
 * @param {string} props.placeholder - Placeholder text
 * @returns {JSX.Element} Styled input field
 */
export default function StyledInput({
  label,
  value,
  onChange,
  placeholder,
  ...props
}) {
  return (
    <div style={styles.container}>
      <div style={styles.label}>{label}</div>
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        style={styles.input}
        {...props}
      />
    </div>
  );
}
