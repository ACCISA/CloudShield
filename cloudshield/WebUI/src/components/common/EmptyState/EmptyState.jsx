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
 *   - Theme-aware styling for light and dark modes
 *   - data-testid attributes for easy testing
 */
import React from "react";
import PropTypes from "prop-types";
import { useThemeColors } from "../../../hooks/useThemeColors.js";

const getStyles = (themeColors) => ({
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "16px",
    border: `1px solid ${themeColors.borderLight}`,
    backgroundColor: themeColors.lightOverlaySubtle,
    padding: "40px 20px",
    textAlign: "center",
  },
  iconWrapper: {
    marginBottom: "16px",
    color: themeColors.textSecondary,
  },
  message: {
    fontSize: "1rem",
    fontWeight: 600,
    color: themeColors.text,
    margin: 0,
    marginBottom: "8px",
  },
  description: {
    marginTop: "8px",
    fontSize: "0.9rem",
    color: themeColors.textSecondary,
    margin: 0,
    lineHeight: "1.5",
  },
});

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
  const themeColors = useThemeColors();
  const styles = getStyles(themeColors);

  return (
    <div data-testid={testId} style={styles.container}>
      {icon && (
        <div style={styles.iconWrapper} data-testid="empty-state-icon">
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
