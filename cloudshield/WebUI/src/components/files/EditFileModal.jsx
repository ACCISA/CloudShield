import React, { useState } from "react";
import { modalStyles } from "./modalStyles.jsx";

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
          <span>Files</span>
          <span className="sep">›</span>
          <span>Edit File</span>
          <button onClick={onClose}>✕</button>
        </header>

        <div className="filePreview">
          📄
        </div>

        <div className="field">
          <label>File Name</label>
          <input
            value={name}
            placeholder="file name"
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="section">
          <div className="sectionHeader">
            <span>Assign users</span>
            <label><input type="checkbox" /> All users</label>
          </div>

          <input placeholder="Search for users" />
          <div className="suggested">suggested</div>

          <div className="chips">
            {mockUsers.map((u) => (
              <label key={u}>
                <input type="checkbox" /> {u}
              </label>
            ))}
          </div>
        </div>

        <div className="section">
          <div className="sectionHeader">
            <span>Assign groups</span>
            <label><input type="checkbox" /> All groups</label>
          </div>

          <input placeholder="Search for groups" />
          <div className="suggested">suggested</div>

          <div className="chips">
            {mockGroups.map((g) => (
              <label key={g}>
                <input type="checkbox" /> {g}
              </label>
            ))}
          </div>
        </div>

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