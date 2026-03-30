import React, { useEffect, useState } from "react";
import { createTicket } from "../../api/ticketsApi";
import "./CreateTicketModal.css";

const CATEGORY_OPTIONS = [
  { value: "Network", label: "Network / VPN" },
  { value: "Hardware", label: "Workstation" },
  { value: "Access", label: "Access / IAM" },
  { value: "General", label: "General" },
];

const PRIORITY_OPTIONS = [
  { value: "Low", label: "Low" },
  { value: "Medium", label: "Medium" },
  { value: "High", label: "High / Urgent" },
];

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

  if (!isOpen) return null;

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setPriority("Medium");
    setCategory("General");
    setError(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    const fullDescription = `[Category: ${category}]\n\n${description}`;

    try {
      await createTicket({ title, description: fullDescription, priority });
      resetForm();
      onSuccess?.();
      onClose?.();
    } catch (err) {
      setError(err?.message || "Failed to create ticket");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackdropClick = (event) => {
    if (event.target === event.currentTarget && !isSubmitting) {
      onClose?.();
    }
  };

  return (
    <div
      className="ticket-modal-overlay"
      onClick={handleBackdropClick}
      role="presentation"
    >
      <div
        className="ticket-modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ticket-modal-title"
      >
        <header className="ticket-modal-header">
          <div>
            <nav className="ticket-modal-breadcrumb" aria-label="Breadcrumb">
              <span className="ticket-modal-breadcrumb-item inactive">
                Support
              </span>
              <span className="ticket-modal-breadcrumb-separator">›</span>
              <span className="ticket-modal-breadcrumb-item active">
                New Ticket
              </span>
            </nav>
            <h2 id="ticket-modal-title" className="ticket-modal-title">
              Submit a Request
            </h2>
          </div>
          <button
            type="button"
            className="ticket-modal-close-btn"
            onClick={onClose}
            aria-label="Close"
            disabled={isSubmitting}
          >
            ×
          </button>
        </header>

        <form className="ticket-modal-form" onSubmit={handleSubmit}>
          <main className="ticket-modal-content">
            {error && <div className="ticket-modal-error">{error}</div>}

            <div className="ticket-modal-section">
              <label className="ticket-modal-label" htmlFor="ticket-title">
                1. What do you need help with?
              </label>
              <input
                id="ticket-title"
                type="text"
                required
                className="ticket-modal-input"
                placeholder="e.g. Cannot connect to Workstation VPN"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                disabled={isSubmitting}
              />
            </div>

            <div className="ticket-modal-section">
              <span className="ticket-modal-label">2. Issue Category</span>
              <div className="ticket-modal-pill-grid" role="group">
                {CATEGORY_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`ticket-modal-pill ${
                      category === option.value ? "selected" : ""
                    }`}
                    onClick={() => setCategory(option.value)}
                    disabled={isSubmitting}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="ticket-modal-section">
              <span className="ticket-modal-label">3. Priority Level</span>
              <div className="ticket-modal-pill-grid" role="group">
                {PRIORITY_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`ticket-modal-pill ticket-modal-pill--priority-${option.value.toLowerCase()} ${
                      priority === option.value ? "selected" : ""
                    }`}
                    onClick={() => setPriority(option.value)}
                    disabled={isSubmitting}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="ticket-modal-section">
              <label
                className="ticket-modal-label"
                htmlFor="ticket-description"
              >
                4. Description
              </label>
              <textarea
                id="ticket-description"
                required
                rows={5}
                className="ticket-modal-textarea"
                placeholder="Please provide steps to reproduce, error codes, or any relevant details..."
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </main>

          <footer className="ticket-modal-actions">
            <button
              type="button"
              className="ticket-modal-btn ticket-modal-btn-cancel"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="ticket-modal-btn ticket-modal-btn-primary"
              disabled={isSubmitting || !title.trim() || !description.trim()}
            >
              {isSubmitting ? "Submitting..." : "Submit Request"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
};

export default CreateTicketModal;
