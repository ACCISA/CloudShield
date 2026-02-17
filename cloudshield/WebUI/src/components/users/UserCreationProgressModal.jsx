/**
 * UserCreationProgressModal
 *
 * Modal component for displaying user creation progress.
 * Shows the status of DC user creation task with real-time updates via polling.
 */

import React from "react";
import PropTypes from "prop-types";
import "./UserCreationProgressModal.css";

export default function UserCreationProgressModal({
  open,
  status,
  message,
  progress,
  onClose,
}) {
  if (!open) return null;

  const isRunning = status === "running";
  const isSucceeded = status === "succeeded";
  const isFailed = status === "failed";

  // Determine progress percentage
  let progressPercent = 0;
  if (typeof progress === "number") {
    progressPercent = Math.min(100, Math.max(0, progress));
  } else if (isSucceeded) {
    progressPercent = 100;
  } else if (isRunning) {
    progressPercent = 50; // Default mid-point for indeterminate progress
  }

  // Determine status text and color
  const getStatusDisplay = () => {
    if (isRunning) {
      return { text: "Creating User...", color: "#3B82F6" };
    } else if (isSucceeded) {
      return { text: "User Created Successfully!", color: "#10B981" };
    } else if (isFailed) {
      return { text: "User Creation Failed", color: "#EF4444" };
    }
    return { text: "Initializing...", color: "#6B7280" };
  };

  const statusDisplay = getStatusDisplay();

  return (
    <div className="user-creation-modal-overlay">
      <div className="user-creation-modal-container">
        <header className="user-creation-modal-header">
          <h2>Creating User</h2>
          {!isFailed && (
            <button
              className="user-creation-modal-close"
              onClick={onClose}
              disabled={isRunning}
              title={isRunning ? "Wait for creation to complete" : "Close"}
            >
              ×
            </button>
          )}
        </header>

        <div className="user-creation-modal-content">
          {/* Progress Bar */}
          <div className="user-creation-progress-section">
            <div className="user-creation-progress-track">
              <div
                className="user-creation-progress-fill"
                style={{
                  width: `${progressPercent}%`,
                  backgroundColor: statusDisplay.color,
                }}
              />
            </div>
            <span className="user-creation-progress-text">
              {progressPercent}%
            </span>
          </div>

          {/* Status Display */}
          <div className="user-creation-status-section">
            <div
              className="user-creation-status-indicator"
              style={{ backgroundColor: statusDisplay.color }}
            >
              {isRunning && <div className="user-creation-spinner" />}
              {isSucceeded && <span className="user-creation-checkmark">✓</span>}
              {isFailed && <span className="user-creation-errormark">✕</span>}
            </div>
            <p className="user-creation-status-text">{statusDisplay.text}</p>
          </div>

          {/* Message/Detail */}
          {message && (
            <div className="user-creation-message-section">
              <p className="user-creation-message">{message}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="user-creation-modal-footer">
          {isFailed && (
            <button
              className="user-creation-btn user-creation-btn-close"
              onClick={onClose}
            >
              Close
            </button>
          )}
          {isSucceeded && (
            <button
              className="user-creation-btn user-creation-btn-close"
              onClick={onClose}
            >
              Done
            </button>
          )}
          {isRunning && (
            <p className="user-creation-waiting-text">
              Please wait while the user is being created on the domain...
            </p>
          )}
        </footer>
      </div>
    </div>
  );
}

UserCreationProgressModal.propTypes = {
  open: PropTypes.bool,
  status: PropTypes.oneOf(["idle", "running", "succeeded", "failed"]),
  message: PropTypes.string,
  progress: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  onClose: PropTypes.func.isRequired,
};

UserCreationProgressModal.defaultProps = {
  open: false,
  status: "idle",
  message: "",
  progress: 0,
};
