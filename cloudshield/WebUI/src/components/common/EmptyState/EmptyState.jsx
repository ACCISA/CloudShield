/**
 * EmptyState.jsx
 *
 * Purpose:
 *   Reusable "no data" component shown when a fetch returns empty results.
 *   Examples: "No workstations found", "No users found", "No groups found".
 *
 * Features:
 *   - Optional icon above the message
 *   - Optional description below the message
 *   - Consistent dark-theme styling matching the app aesthetic
 *   - data-testid attributes for easy testing
 */
import React from "react";
import PropTypes from "prop-types";

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "16px",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    padding: "40px 20px",
    textAlign: "center",
  },
  iconWrapper: {
    marginBottom: "16px",
    color: "rgba(255, 255, 255, 0.4)",
  },
  message: {
    fontSize: "0.875rem",
    fontWeight: 500,
    color: "rgba(255, 255, 255, 0.7)",
    margin: 0,
  },
  description: {
    marginTop: "8px",
    fontSize: "0.75rem",
    color: "rgba(255, 255, 255, 0.5)",
    margin: 0,
  },
};

/**
 * EmptyState component for displaying "no data" messages.
 *
 * @param {string} message - Main message to display
 * @param {React.ReactNode} icon - Optional icon to show above the message
 * @param {string} description - Optional additional description below the message
 * @param {string} testId - Test ID for testing purposes (default: "empty-state")
 */
export default function EmptyState({
  message,
  icon,
  description,
  testId = "empty-state",
}) {
  return (
    <div data-testid={testId} style={styles.container}>
      {icon && (
        <div style={styles.iconWrapper} data-testid={`${testId}-icon`}>
          {icon}
        </div>
      )}
      <p style={styles.message} data-testid={`${testId}-message`}>
        {message}
      </p>
      {description && (
        <p style={styles.description} data-testid={`${testId}-description`}>
          {description}
        </p>
      )}
    </div>
  );
}

EmptyState.propTypes = {
  /** Main message to display */
  message: PropTypes.string.isRequired,
  /** Optional icon to show above the message */
  icon: PropTypes.node,
  /** Optional additional description below the message */
  description: PropTypes.string,
  /** Test ID for testing purposes */
  testId: PropTypes.string,
};
