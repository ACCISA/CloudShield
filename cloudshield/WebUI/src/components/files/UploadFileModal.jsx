import React, { useState, useEffect } from "react";
import { modalStyles } from "./modalStyles.jsx";
import AssignmentSection from "./AssignmentSection.jsx";
import { fetchUsers, fetchGroups } from "../../api/filesApi.js";
import { useAuth } from "../../context/AuthContext.jsx";

/**
 * Modal for creating a new file share with name, description, size limit, and user/group assignments.
 * Fetches available users and groups from the organization when opened.
 * 
 * @param {boolean} isOpen - Whether modal is visible
 * @param {function} onClose - Callback to close modal
 * @param {function} onUpload - Callback to create the share with form data
 */
export default function UploadFileModal({
  isOpen,
  onClose,
  onUpload,
}) {
  const { currentUser } = useAuth();
  const [shareName, setShareName] = useState("");
  const [description, setDescription] = useState("");
  const [maxSize, setMaxSize] = useState("");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [availableGroups, setAvailableGroups] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch users and groups when modal opens
  useEffect(() => {
    if (isOpen) {
      const loadData = async () => {
        try {
          // Get org_id from localStorage (set during login)
          const orgId = localStorage.getItem("org_id") || "default-org";
          console.log("UploadFileModal - Loading users/groups for org_id:", orgId);
          
          const [users, groups] = await Promise.all([
            fetchUsers(orgId),
            fetchGroups(orgId)
          ]);
          console.log("UploadFileModal - Fetched users:", users);
          console.log("UploadFileModal - Fetched groups:", groups);
          
          // Extract usernames and remove duplicates
          const usernames = [...new Set(users.map(u => u.username || u.email || u.name).filter(Boolean))];
          const groupNames = [...new Set(groups.map(g => g.group_name).filter(Boolean))];
          
          console.log("UploadFileModal - Processed usernames:", usernames);
          console.log("UploadFileModal - Processed group names:", groupNames);
          
          setAvailableUsers(usernames);
          setAvailableGroups(groupNames);
        } catch (err) {
          console.error("Failed to load users/groups:", err);
        }
      };
      loadData();
    }
  }, [isOpen, currentUser]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setShareName("");
      setDescription("");
      setMaxSize("");
      setSelectedUsers([]);
      setSelectedGroups([]);
    }
  }, [isOpen]);

  const handleCreate = async () => {
    setLoading(true);
    try {
      await onUpload?.({
        shareName,
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
          <span>New File Share</span>
          <button onClick={onClose}>✕</button>
        </header>

        <div className="field">
          <label>Share Name *</label>
          <input
            value={shareName}
            placeholder="e.g., TeamDocs, Projects, SharedData"
            onChange={(e) => setShareName(e.target.value)}
          />
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

        <footer className="modalFooter">
          <button 
            className="primary" 
            onClick={handleCreate}
            disabled={!shareName.trim() || loading}
          >
            {loading ? "Creating..." : "Create Share"}
          </button>
        </footer>
      </div>

      {modalStyles}
    </div>
  );
}