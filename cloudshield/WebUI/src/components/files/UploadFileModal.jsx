import React, { useState, useCallback } from "react";
import { modalStyles } from "./modalStyles.jsx";
import AssignmentSection from "./AssignmentSection.jsx";

const mockUsers = [
  "Michael Scott",
  "Jim Halpert",
  "Pam Beesly",
  "Dwight Schrute",
];

const mockGroups = ["Sales", "Finance", "Corporate", "Warehouse"];

export default function UploadFileModal({
  isOpen,
  onClose,
  onUpload,
}) {
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const [dragActive, setDragActive] = useState(false);

  const handleFile = (f) => {
    setFile(f);
    setFileName(f.name);
  };

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modalOverlay">
      <div className="modal">
        <header className="modalHeader">
          <span>Files</span>
          <span className="sep">›</span>
          <span>New file</span>
          <button onClick={onClose}>✕</button>
        </header>

        <div
          className={`dropZone ${dragActive ? "active" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={onDrop}
          role="button"
          tabIndex={0}
          onKeyDown={handleKeyDown}
          aria-label="Drag and drop area for file upload"
        >
          <div className="uploadIcon">⬆</div>
          <div>Drag and drop files here, or</div>
          <label className="browseBtn">
            Browse
            <input
              type="file"
              hidden
              onChange={(e) => handleFile(e.target.files[0])}
            />
          </label>
        </div>

        <div className="field">
          <label>File Name</label>
          <input
            value={fileName}
            placeholder="file name"
            onChange={(e) => setFileName(e.target.value)}
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

        <footer className="modalFooter">
          <button className="primary" onClick={() => onUpload?.({ file, fileName })}>
            Upload
          </button>
        </footer>
      </div>

      {modalStyles}
    </div>
  );
}