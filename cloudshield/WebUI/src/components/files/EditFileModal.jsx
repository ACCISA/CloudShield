import React, { useState } from "react";
import { modalStyles } from "./modalStyles.jsx";
import AssignmentSection from "./AssignmentSection.jsx";

const mockUsers = [
  "Michael Scott",
  "Jim Halpert",
  "Pam Beesly",
  "Dwight Schrute",
];

const mockGroups = ["Sales", "Finance", "Reception", "Annex", "Manager"];

export default function EditFileModal({
  isOpen,
  file,
  onClose,
  onSave,
  onDelete,
}) {
  const [name, setName] = useState(file?.name || "");

  if (!isOpen) return null;

  return (
    <div className="modalOverlay">
      <div className="modal">
        <header className="modalHeader">
          <span>Shares</span>
          <span className="sep">›</span>
          <span>Edit Share</span>
          <button onClick={onClose}>✕</button>
        </header>

        <div className="filePreview">📄</div>

        <div className="field">
          <label>Share Name</label>
          <input
            value={name}
            placeholder="share name"
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <AssignmentSection
          title="Assign users"
          items={mockUsers}
          placeholder="Search for users"
        />

        <AssignmentSection
          title="Assign groups"
          items={mockGroups}
          placeholder="Search for groups"
        />

        <footer className="modalFooter space">
          <button className="danger" onClick={onDelete}>
            🗑 Delete
          </button>
          <button className="primary" onClick={() => onSave?.({ name })}>
            Edit
          </button>
        </footer>
      </div>

      {modalStyles}
    </div>
  );
}
