import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { createTicket } from "../../api/ticketsApi";
import CreateButton from "../common/CreateButton/CreateButton.jsx";
import "./CreateTicketModal.css";

const CreateTicketModal = ({ isOpen, onClose, onSuccess }) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [category, setCategory] = useState("General");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !isSubmitting) {
        onClose?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  const handleBackdropClick = (event) => {
    if (event.target === event.currentTarget && !isSubmitting) {
      onClose?.();
    }
  };

  const handleSubmit = async (event) => {
    if (event) event.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    // Smart Hack: We prepend the category to the description so we don't
    // have to rewrite the Python backend database schema just for this UI upgrade!
    const fullDescription = `[Category: ${category}]\n\n${description}`;

    try {
      await createTicket({ title, description: fullDescription, priority });
      // Reset form
      setTitle("");
      setDescription("");
      setPriority("Medium");
      setCategory("General");
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || "Failed to create ticket");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="tickets-modal-overlay"
      onClick={handleBackdropClick}
      role="presentation"
    >
      <div 
        className="tickets-modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ticket-modal-title"
      >
        <form onSubmit={handleSubmit}>
          {/* HEADER */}
          <header className="tickets-modal-header">
            <nav className="tickets-modal-breadcrumb">
              <span className="tickets-modal-breadcrumb-item inactive">
                Tickets
              </span>
              <span className="tickets-modal-breadcrumb-separator">›</span>
              <span id="ticket-modal-title" className="tickets-modal-breadcrumb-item active">
                Submit a Request
              </span>
            </nav>
            <button
              type="button"
              className="tickets-modal-close-btn"
              onClick={onClose}
              disabled={isSubmitting}
              aria-label="Close"
            >
              ×
            </button>
          </header>

          {/* BODY */}
          <main className="tickets-modal-content">
            {error && <div className="tickets-modal-error">{error}</div>}

            <div className="tickets-modal-form-group">
              <label htmlFor="ticket-title" className="tickets-modal-label">
                1. What do you need help with?
              </label>
              <input
                id="ticket-title"
                type="text"
                className="tickets-modal-input"
                required
                placeholder="e.g. Cannot connect to Workstation VPN"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <fieldset className="tickets-modal-form-group">
              <legend className="tickets-modal-label">2. Issue Category</legend>
              <div className="tickets-modal-toggle-group">
                <button
                  type="button"
                  className={`tickets-modal-toggle-btn ${category === "Network" ? "selected" : ""}`}
                  onClick={() => setCategory("Network")}
                >
                  Network / VPN
                </button>
                <button
                  type="button"
                  className={`tickets-modal-toggle-btn ${category === "Hardware" ? "selected" : ""}`}
                  onClick={() => setCategory("Hardware")}
                >
                  Workstation
                </button>
                <button
                  type="button"
                  className={`tickets-modal-toggle-btn ${category === "Access" ? "selected" : ""}`}
                  onClick={() => setCategory("Access")}
                >
                  Access / IAM
                </button>
                <button
                  type="button"
                  className={`tickets-modal-toggle-btn ${category === "General" ? "selected" : ""}`}
                  onClick={() => setCategory("General")}
                >
                  General
                </button>
              </div>
            </fieldset>

            <fieldset className="tickets-modal-form-group">
              <legend className="tickets-modal-label">3. Priority Level</legend>
              <div className="tickets-modal-toggle-group">
                <button
                  type="button"
                  className={`tickets-modal-toggle-btn ${priority === "Low" ? "selected priority-low" : ""}`}
                  onClick={() => setPriority("Low")}
                >
                  Low
                </button>
                <button
                  type="button"
                  className={`tickets-modal-toggle-btn ${priority === "Medium" ? "selected priority-medium" : ""}`}
                  onClick={() => setPriority("Medium")}
                >
                  Medium
                </button>
                <button
                  type="button"
                  className={`tickets-modal-toggle-btn ${priority === "High" ? "selected priority-high" : ""}`}
                  onClick={() => setPriority("High")}
                >
                  High / Urgent
                </button>
              </div>
            </fieldset>

            <div className="tickets-modal-form-group">
              <label
                htmlFor="ticket-description"
                className="tickets-modal-label"
              >
                4. Description
              </label>
              <textarea
                id="ticket-description"
                className="tickets-modal-textarea"
                required
                placeholder="Please provide steps to reproduce, error codes, or any relevant details..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </main>

          {/* FOOTER */}
          <footer className="tickets-modal-actions">
            <div className="tickets-modal-actions-right">
              <button
                type="button"
                className="tickets-modal-btn tickets-modal-btn-navigate"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <CreateButton
                buttonText={isSubmitting ? "Submitting..." : "Submit Request"}
                onClick={handleSubmit}
                disabled={isSubmitting || !title.trim() || !description.trim()}
              />
            </div>
          </footer>
        </form>
      </div>
    </div>
  );
};

CreateTicketModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func.isRequired,
};

export default CreateTicketModal;
