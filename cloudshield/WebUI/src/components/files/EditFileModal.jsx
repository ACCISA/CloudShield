import React, { useState, useEffect } from "react";
import { modalStyles } from "./modalStyles.jsx";
import AssignmentSection from "./AssignmentSection.jsx";
import { fetchUsers, fetchGroups } from "../../api/filesApi.js";
import { useAuth } from "../../context/AuthContext.jsx";

/**
 * Modal for editing existing file share metadata (users, groups, description, max size).
 * Pre-populates fields with current share data and provides delete functionality.
 * 
 * @param {boolean} isOpen - Whether modal is visible
 * @param {object} file - File share object with current data
 * @param {function} onClose - Callback to close modal
 * @param {function} onSave - Callback to save changes
 * @param {function} onDelete - Callback to delete share
 */
export default function EditFileModal({
  isOpen,
  file,
  onClose,
  onSave,
  onDelete,
}) {
  const { currentUser } = useAuth();
  const [description, setDescription] = useState("");
  const [maxSize, setMaxSize] = useState("");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [availableGroups, setAvailableGroups] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load file data and available users/groups when modal opens
  useEffect(() => {
    if (isOpen && file) {
      const loadData = async () => {
        try {
          // Get org_id from localStorage (set during login)
          const orgId = localStorage.getItem("org_id") || "default-org";
          console.log("EditFileModal - Loading users/groups for org_id:", orgId);
          
          const [users, groups] = await Promise.all([
            fetchUsers(orgId),
            fetchGroups(orgId)
          ]);
          console.log("EditFileModal - Fetched users:", users);
          console.log("EditFileModal - Fetched groups:", groups);
          
          // Extract usernames and remove duplicates
          const usernames = [...new Set(users.map(u => u.username || u.email || u.name).filter(Boolean))];
          const groupNames = [...new Set(groups.map(g => g.group_name).filter(Boolean))];
          
          console.log("EditFileModal - Processed usernames:", usernames);
          console.log("EditFileModal - Processed group names:", groupNames);
          
          setAvailableUsers(usernames);
          setAvailableGroups(groupNames);
          
          // Set current values from file
          setDescription(file.description || "");
          setMaxSize(file.max_size || ""); // Already in GB, no conversion needed
          setSelectedUsers(file.users || []);
          setSelectedGroups(file.groups || []);
        } catch (err) {
          console.error("Failed to load users/groups:", err);
        }
      };
      loadData();
    }
  }, [isOpen, file, currentUser]);

  const handleSave = async () => {
    setLoading(true);
    try {
      await onSave?.({
        description,
        maxSize,
        users: selectedUsers,
        groups: selectedGroups,
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modalOverlay">
      <div className="modal">
        <header className="modalHeader">
          <span>Files</span>
          <span className="sep">›</span>
          <span>Edit: {file?.name || "File Share"}</span>
          <button onClick={onClose}>✕</button>
        </header>

        <div className="filePreview">
          �
        </div>

        <div className="field">
          <label>Description (optional)</label>
          <input
            value={description}
            placeholder="Brief description of this file share"
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="field">
          <label>Max Size in GB (optional)</label>
          <input
            type="text"
            value={maxSize}
            placeholder="e.g., 100"
            onChange={(e) => setMaxSize(e.target.value)}
          />
        </div>

        <AssignmentSection
          title="Assign users"
          items={availableUsers}
          placeholder="Search for users"
          selectedItems={selectedUsers}
          onSelectionChange={setSelectedUsers}
        />

        <AssignmentSection
          title="Assign groups"
          items={availableGroups}
          placeholder="Search for groups"
          selectedItems={selectedGroups}
          onSelectionChange={setSelectedGroups}
        />

        <footer className="modalFooter space">
          <button className="danger" onClick={onDelete}>
            🗑 Delete
          </button>
          <button 
            className="primary" 
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? "Saving..." : "Save Changes"}
          </button>
        </footer>
      </div>

      {modalStyles}
    </div>
  );
}