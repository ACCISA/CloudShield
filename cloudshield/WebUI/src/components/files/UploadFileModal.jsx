import React, { useState, useCallback } from "react";
import { modalStyles } from "./modalStyles.jsx";

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