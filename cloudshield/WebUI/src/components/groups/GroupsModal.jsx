import React, { useState, useEffect, useMemo } from "react";
import DisplayIcon from "../common/DisplayIcon/DisplayIcon.jsx";
import UploadIcon from "../../assets/ImageUploadIcon.jsx";
import "./GroupsModal.css";

// Use the same Users API logic as EmployeesPage
import { listUsers } from "../../services/usersApi.js";
import { useAuth } from "../../context/AuthContext.jsx";

const STEPS = ["Basic Info", "Users", "Workstations", "Files"];

// Minimal mock until workstations API is ready
const MOCK_WORKSTATIONS_MIN = [
  {
    id: "ws-1",
    name: "Workstation Alpha",
    online: true,
    ipAddress: "10.0.0.12",
  },
  {
    id: "ws-2",
    name: "Workstation Beta",
    online: false,
    ipAddress: "10.0.0.21",
  },
];

/**
 * GroupsModal - Multi-step wizard for creating/editing groups
 */
export default function GroupsModal({
  open,
  onClose,
  groupData = null,
  onSubmit,
  onRefresh,
}) {
  const { accessToken, currentUser } = useAuth();

  const isEditMode = Boolean(groupData);
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Data
  const [formData, setFormData] = useState({
    groupName: "",
    description: "",
    groupImage: null,
    selectedUsers: [],
    selectedWorkstations: [],
    selectedFiles: [],
  });

  // Search State
  const [searchTerms, setSearchTerms] = useState({
    users: "",
    workstations: "",
    files: "",
  });

  // Available options (fetched)
  const [allUsers, setAllUsers] = useState([]);
  const [allWorkstations, setAllWorkstations] = useState([]);
  const [allFiles, setAllFiles] = useState([]); // file shares

  const openToast = (msg) => {
    console.warn(msg);
  };

  const resolveOrgId = async () => {
    const fromUser = currentUser?.org_id;
    if (fromUser) return fromUser;

    const fromStorage = localStorage.getItem("org_id");
    if (fromStorage) return fromStorage;

    return null;
  };

  const safeSplitName = (fullName) => {
    const raw = (fullName || "").trim();
    if (!raw) return { firstName: "Unknown", lastName: "" };
    const parts = raw.split(/\s+/);
    if (parts.length === 1) return { firstName: parts[0], lastName: "" };
    return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
  };

  // --- USERS (use the same logic/pattern as EmployeesPage) ---
  const fetchUsersAll = async () => {
    if (!accessToken) {
      setAllUsers([]);
      return;
    }

    try {
      const data = await listUsers({
        token: accessToken,
        search: "",
        limit: 200,
        offset: 0,
      });

      const normalized = (Array.isArray(data) ? data : []).map((u) => {
        const id = String(u._id || u.id || "");
        const { firstName, lastName } = safeSplitName(
          u.full_name || u.name || "",
        );
        return {
          id,
          _id: id,
          email: u.email,
          firstName,
          lastName,
          title: u.role || u.title || "",
          role: u.role,
        };
      });

      setAllUsers(normalized.filter((u) => u.id));
    } catch (e) {
      setAllUsers([]);
      openToast(e?.message || "Failed to load users");
    }
  };

  // --- FILE SHARES ---
  const fetchFileSharesAll = async () => {
    try {
      const orgId = await resolveOrgId();
      if (!orgId) {
        setAllFiles([]);
        openToast("Missing org_id for file_shares fetch");
        return;
      }

      const res = await fetch(
        `http://127.0.0.1:5050/api/file_shares?org_id=${encodeURIComponent(orgId)}`,
        {
          method: "GET",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        },
      );

      if (!res.ok) {
        setAllFiles([]);
        return;
      }

      const data = await res.json();
      const shares = Array.isArray(data.shares) ? data.shares : [];

      const normalized = shares
        .map((x) => x?.share)
        .filter(Boolean)
        .map((s) => ({
          id: String(s.id || ""),
          name: s.name || "Untitled Share",
          type: "document",
          size: s.drive ? `Drive ${s.drive}` : "",
          drive: s.drive,
          description: s.description || "",
          owner: s.owner,
          groups: s.groups || [],
          created_at: s.created_at,
          updated_at: s.updated_at,
        }))
        .filter((s) => s.id);

      setAllFiles(normalized);
    } catch (e) {
      setAllFiles([]);
    }
  };

  // --- WORKSTATIONS (mock for now) ---
  const fetchWorkstationsAll = async () => {
    setAllWorkstations(MOCK_WORKSTATIONS_MIN);
  };

  // Initialize form data + fetch all options when modal opens
  useEffect(() => {
    if (!open) return;

    if (isEditMode && groupData) {
      const seedFiles =
        Array.isArray(groupData.fileShareIds) &&
        groupData.fileShareIds.length > 0
          ? groupData.fileShareIds.map((id) => ({
              id,
              name: id,
              type: "document",
              size: "",
            }))
          : [];

      setFormData({
        groupName: groupData.name || "",
        description: groupData.description || "",
        groupImage: groupData.image || null,
        selectedUsers: groupData.users || [],
        selectedWorkstations: groupData.workstations || [],
        selectedFiles: seedFiles,
      });
    } else {
      setFormData({
        groupName: "",
        description: "",
        groupImage: null,
        selectedUsers: [],
        selectedWorkstations: [],
        selectedFiles: [],
      });
    }

    setCurrentStep(0);
    setSearchTerms({ users: "", workstations: "", files: "" });

    fetchUsersAll();
    fetchWorkstationsAll();
    fetchFileSharesAll();
  }, [open, groupData, isEditMode, accessToken]);

  // Filter lists
  const filteredUsers = useMemo(() => {
    const q = searchTerms.users.trim().toLowerCase();
    if (!q) return allUsers;
    return allUsers.filter((u) =>
      [`${u.firstName} ${u.lastName}`, u.email, u.title]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [allUsers, searchTerms.users]);

  const filteredWorkstations = useMemo(() => {
    const q = searchTerms.workstations.trim().toLowerCase();
    if (!q) return allWorkstations;
    return allWorkstations.filter((ws) =>
      [ws.name, ws.ipAddress]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [allWorkstations, searchTerms.workstations]);

  const filteredFiles = useMemo(() => {
    const q = searchTerms.files.trim().toLowerCase();
    if (!q) return allFiles;
    return allFiles.filter((f) =>
      [f.name, f.description, f.drive, f.owner]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [allFiles, searchTerms.files]);

  // Handlers
  const handleNavigate = (direction) => {
    setCurrentStep((prev) =>
      Math.max(0, Math.min(STEPS.length - 1, prev + direction)),
    );
  };


  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onSubmit?.({
        name: formData.groupName,
        description: formData.description,
        image: formData.groupImage,
        users: formData.selectedUsers,
        workstations: formData.selectedWorkstations,
        files: formData.selectedFiles,
      });
      onRefresh?.();
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData((prev) => ({ ...prev, groupImage: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const toggleSelection = (type, item) => {
    setFormData((prev) => {
      const key = `selected${type.charAt(0).toUpperCase() + type.slice(1)}`;
      const selected = prev[key];
      const isSelected = selected.some((i) => i.id === item.id);

      return {
        ...prev,
        [key]: isSelected
          ? selected.filter((i) => i.id !== item.id)
          : [...selected, item],
      };
    });
  };

  const removeSelection = (type, id) => {
    setFormData((prev) => {
      const key = `selected${type.charAt(0).toUpperCase() + type.slice(1)}`;
      return {
        ...prev,
        [key]: prev[key].filter((i) => i.id !== id),
      };
    });
  };

  const progressPercent = ((currentStep + 1) / STEPS.length) * 100;

  if (!open) return null;

  // Render Step Content
  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <BasicInfoStep
            formData={formData}
            setFormData={setFormData}
            handleImageUpload={handleImageUpload}
          />
        );
      case 1:
        return (
          <SelectionStep
            type="users"
            searchTerm={searchTerms.users}
            setSearchTerm={(val) =>
              setSearchTerms((prev) => ({ ...prev, users: val }))
            }
            filteredItems={filteredUsers}
            selectedItems={formData.selectedUsers}
            onToggle={(item) => toggleSelection("users", item)}
            onRemove={(id) => removeSelection("users", id)}
          />
        );
      case 2:
        return (
          <SelectionStep
            type="workstations"
            searchTerm={searchTerms.workstations}
            setSearchTerm={(val) =>
              setSearchTerms((prev) => ({ ...prev, workstations: val }))
            }
            filteredItems={filteredWorkstations}
            selectedItems={formData.selectedWorkstations}
            onToggle={(item) => toggleSelection("workstations", item)}
            onRemove={(id) => removeSelection("workstations", id)}
          />
        );
      case 3:
        return (
          <SelectionStep
            type="files"
            searchTerm={searchTerms.files}
            setSearchTerm={(val) =>
              setSearchTerms((prev) => ({ ...prev, files: val }))
            }
            filteredItems={filteredFiles}
            selectedItems={formData.selectedFiles}
            onToggle={(item) => toggleSelection("files", item)}
            onRemove={(id) => removeSelection("files", id)}
          />
        );
      default:
        return null;
    }
  };

  const isNextDisabled = currentStep === 0 && !formData.groupName.trim();

  return (
    <div className="groups-modal-overlay">
      <div className="groups-modal-dialog">
        {/* Header */}
        <header className="groups-modal-header">
          <nav className="groups-modal-breadcrumb">
            <span className="groups-modal-breadcrumb-item inactive">
              Groups
            </span>
            <span className="groups-modal-breadcrumb-separator">›</span>
            <span className="groups-modal-breadcrumb-item active">
              {isEditMode ? "Edit Group" : "New Group"}
            </span>
          </nav>
          <button
            className="groups-modal-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </header>

        {/* Progress Bar */}
        <div className="groups-modal-stepper">
          <div className="groups-modal-progress-track">
            <div
              className="groups-modal-progress-fill"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="groups-modal-step-labels">
            {STEPS.map((step, index) => (
              <div
                key={step}
                className={`groups-modal-step-label ${
                  index === currentStep ? "active" : ""
                } ${index < currentStep ? "completed" : ""}`}
              >
                {step}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <main className="groups-modal-content">{renderStepContent()}</main>

        {/* Footer */}
        <footer className="groups-modal-actions">
          <button
            className="groups-modal-btn groups-modal-btn-secondary"
            onClick={() => handleNavigate(-1)}
            disabled={currentStep === 0}
          >
            Back
          </button>
          <div className="groups-modal-actions-right">
            <button
              className="groups-modal-btn groups-modal-btn-cancel"
              onClick={onClose}
            >
              Cancel
            </button>
            {currentStep < STEPS.length - 1 ? (
              <button
                className="groups-modal-btn groups-modal-btn-primary"
                onClick={() => handleNavigate(1)}
                disabled={isNextDisabled}
              >
                Next
              </button>
            ) : (
              <button
                className="groups-modal-btn groups-modal-btn-primary"
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Saving..." : isEditMode ? "Save Changes" : "Create Group"}
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}

// Sub-components
function BasicInfoStep({ formData, setFormData, handleImageUpload }) {
  return (
    <div className="groups-modal-step">
      <div className="groups-modal-form-group">
        <label className="groups-modal-label">Group Name *</label>
        <input
          type="text"
          className="groups-modal-input"
          value={formData.groupName}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, groupName: e.target.value }))
          }
          placeholder="Enter group name"
        />
      </div>

      <div className="groups-modal-form-group">
        <label className="groups-modal-label">Description</label>
        <textarea
          className="groups-modal-textarea"
          value={formData.description}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, description: e.target.value }))
          }
          placeholder="Enter a brief description of the group"
          rows={3}
        />
      </div>

      <div className="groups-modal-form-group">
        <label className="groups-modal-label">Group Icon</label>
        <div className="groups-modal-image-upload">
          {formData.groupImage ? (
            <div className="groups-modal-image-preview">
              <img src={formData.groupImage} alt="Group icon" />
              <button
                type="button"
                className="groups-modal-image-remove"
                onClick={() =>
                  setFormData((prev) => ({ ...prev, groupImage: null }))
                }
              >
                ×
              </button>
            </div>
          ) : (
            <label className="groups-modal-image-upload-label">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                style={{ display: "none" }}
              />
              <div className="groups-modal-image-placeholder">
                <span className="groups-modal-image-icon">
                  <UploadIcon width={48} height={48} fill="#9e9e9e" />
                </span>
                <span>Upload Image</span>
              </div>
            </label>
          )}
        </div>
      </div>
    </div>
  );
}

function SelectionStep({
  type,
  searchTerm,
  setSearchTerm,
  filteredItems,
  selectedItems,
  onToggle,
  onRemove,
}) {
  const config = {
    users: {
      label: "Add Users",
      placeholder: "Search users...",
      renderItem: (item) => ({
        icon: <DisplayIcon type="user" data={item} size="small" />,
        name: `${item.firstName} ${item.lastName}`,
        detail: item.title,
      }),
    },
    workstations: {
      label: "Add Workstations",
      placeholder: "Search workstations...",
      renderItem: (item) => ({
        icon: <DisplayIcon type="workstation" data={item} size="small" />,
        name: item.name,
        detail: `${item.online ? "🟢 Online" : "🔴 Offline"} • ${item.ipAddress}`,
      }),
    },
    files: {
      label: "Add Files",
      placeholder: "Search files...",
      renderItem: (item) => {
        const icon =
          {
            spreadsheet: "📊",
            presentation: "📽️",
            document: "📄",
            image: "🖼️",
          }[item.type] || "📁";
        return {
          icon: <div className="groups-modal-file-icon">{icon}</div>,
          name: item.name,
          detail: item.size,
          fileIcon: icon,
        };
      },
    },
  }[type];

  const items = Array.isArray(filteredItems) ? filteredItems : [];

  return (
    <div className="groups-modal-step">
      <div className="groups-modal-search-section">
        <label className="groups-modal-label">{config.label}</label>
        <input
          type="text"
          className="groups-modal-search"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={config.placeholder}
        />

        {/* Always render selectable list */}
        <div className="groups-modal-dropdown">
          {items.length === 0 ? (
            <div
              className="groups-modal-dropdown-item"
              style={{ opacity: 0.7, cursor: "default" }}
            >
              No results
            </div>
          ) : (
            items.map((item) => {
              const isSelected = selectedItems.some((i) => i.id === item.id);
              const rendered = config.renderItem(item);

              return (
                <div
                  key={item.id}
                  className={`groups-modal-dropdown-item ${isSelected ? "selected" : ""}`}
                  onClick={() => onToggle(item)}
                >
                  {rendered.icon}
                  <div className="groups-modal-dropdown-item-info">
                    <div className="groups-modal-dropdown-item-name">
                      {rendered.name}
                    </div>
                    <div className="groups-modal-dropdown-item-detail">
                      {rendered.detail}
                    </div>
                  </div>
                  {isSelected && (
                    <span className="groups-modal-checkmark">✓</span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {selectedItems.length > 0 && (
        <div className="groups-modal-selected-section">
          <div className="groups-modal-selected-header">
            Selected {type.charAt(0).toUpperCase() + type.slice(1)} (
            {selectedItems.length})
          </div>
          <div className="groups-modal-selected-cards">
            {selectedItems.map((item) => {
              const rendered = config.renderItem(item);
              return (
                <div key={item.id} className="groups-modal-selected-card">
                  <button
                    type="button"
                    className="groups-modal-card-remove-btn"
                    onClick={() => onRemove(item.id)}
                  >
                    ×
                  </button>
                  {type === "files" ? (
                    <div className="groups-modal-file-card-icon">
                      {rendered.fileIcon}
                    </div>
                  ) : (
                    rendered.icon
                  )}
                  <span className="groups-modal-selected-card-name">
                    {rendered.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
