import React, { useState, useEffect, useMemo } from "react";
import PropTypes from "prop-types";
import TrashIcon from "../../assets/TrashIcon.jsx";
import UserSelectionPanel from "./UserSelectionPanel.jsx";
import GroupSelectionPanel from "./GroupSelectionPanel.jsx";
import { fetchUsers, fetchGroups } from "../../api/filesApi.js";
import { useAuth } from "../../context/AuthContext.jsx";
import {
  resolveOrgId,
  createDeleteHandler,
  createNavigationHandler,
} from "../../utils/modalHelpers.jsx";
import { validateShareName, validateShareSize } from "../../utils/validation.js";
import "./FileShareWizardModal.css";

const STEPS = ["Basic Info", "Users", "Groups"];

/**
 * Multi-step wizard modal for creating/editing shares
 * Inspired by GroupsModal with progress bar and navigation
 */
export default function FileShareWizardModal({
  isOpen,
  onClose,
  onSubmit,
  file = null, // If editing
  onDelete = null,
}) {
  const isEditMode = Boolean(file);
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  // Form Data
  const [formData, setFormData] = useState({
    shareName: "",
    description: "",
    maxSize: "",
    selectedUsers: [],
    selectedGroups: [],
  });

  // Search State
  const [searchTerms, setSearchTerms] = useState({
    users: "",
    groups: "",
  });

  // Available options (fetched)
  const [availableUsers, setAvailableUsers] = useState([]);
  const [availableGroups, setAvailableGroups] = useState([]);
  const { currentUser } = useAuth();

  const normalizeUsers = (usersData) =>
    (Array.isArray(usersData) ? usersData : []).map((u) => {
      const id = String(u._id || u.id || "");
      const fullName = u.full_name || u.name || "";
      const parts = fullName.trim().split(/\s+/);
      const email = u.email || "";
      return {
        id,
        _id: id,
        // Use full_name as the display label; use email as the stable identifier.
        username: fullName || email,
        email,
        full_name: fullName,
        firstName: parts[0] || "",
        lastName: parts.slice(1).join(" ") || "",
        title: u.role || u.title || "",
        role: u.role,
        active: u.active !== undefined ? u.active : true,
      };
    });

  const dedupeUsersById = (users) =>
    Array.from(
      new Map(users.filter((u) => u.id).map((u) => [u.id, u])).values(),
    );

  const normalizeGroups = (groups) =>
    groups.map((g) => {
      const groupName = g.group_name || g.name || "";
      return {
        ...g,
        id: g._id || g.id,
        name: groupName,
        groupName: groupName,
        group_name: groupName,
        member_count: (g.members_info || g.members || []).length,
      };
    });

  const mapSelectedUsers = (selected, normalizedUsers) => {
    const userObjectsRaw = (selected || []).map((username) => {
      const found = normalizedUsers.find(
        (u) =>
          u.username === username ||
          u.email === username ||
          (u.email && u.email.split("@")[0] === username),
      );
      return found || { username, id: username };
    });
    return Array.from(
      new Map(
        userObjectsRaw.map((u) => [String(u.id || u.username || u.email), u]),
      ).values(),
    );
  };

  const mapSelectedGroups = (selected, normalizedGroups) =>
    (selected || []).map((groupName) => {
      const found = normalizedGroups.find(
        (g) => g.name === groupName || g.group_name === groupName,
      );
      return found || { name: groupName, id: groupName, group_name: groupName };
    });

  // Fetch users and groups when modal opens
  useEffect(() => {
    if (!isOpen) return;

    const loadData = async () => {
      try {
        const orgId = await resolveOrgId(currentUser);
        const [usersData, groups] = await Promise.all([
          fetchUsers(orgId),
          fetchGroups(orgId),
        ]);

        const normalizedUsers = normalizeUsers(usersData);
        const uniqueUsers = dedupeUsersById(normalizedUsers);
        const normalizedGroups = normalizeGroups(groups);

        setAvailableUsers(uniqueUsers);
        setAvailableGroups(normalizedGroups);

        if (!isEditMode || !file) return;

        setFormData({
          shareName: file.name || "",
          description: file.description || "",
          maxSize: file.max_size_gb || "",
          selectedUsers: mapSelectedUsers(file.users, normalizedUsers),
          selectedGroups: mapSelectedGroups(file.groups, normalizedGroups),
        });
      } catch (err) {
        console.error("Failed to load users/groups:", err);
      }
    };

    loadData();
  }, [isOpen, isEditMode, file]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(0);
      setFormData({
        shareName: "",
        description: "",
        maxSize: "",
        selectedUsers: [],
        selectedGroups: [],
      });
      setSearchTerms({ users: "", groups: "" });
    }
  }, [isOpen]);

  const handleNavigate = createNavigationHandler(setCurrentStep, STEPS.length);

  const handleDelete = createDeleteHandler({
    onDelete: async () => {
      await onDelete?.();
    },
    setIsSubmitting,
    onClose,
  });

  const handleSubmit = async () => {
    // Validate inputs before submitting
    const errs = {};
    if (!isEditMode) {
      const snResult = validateShareName(formData.shareName);
      if (!snResult.valid) errs.shareName = snResult.error;
    }
    if (formData.maxSize && String(formData.maxSize).trim()) {
      const msResult = validateShareSize(String(formData.maxSize).trim() + "G");
      if (!msResult.valid) errs.maxSize = "Max size must be a positive number.";
    }
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }
    setFieldErrors({});
    setIsSubmitting(true);
    try {
      // Prefer stable identifiers (email) and de-duplicate.
      const userIds = Array.from(
        new Set(
          formData.selectedUsers
            .map((u) => {
              if (typeof u === "string") return u;
              return u.email || u.username || u.id || "";
            })
            .filter(Boolean),
        ),
      );
      const groupNames = formData.selectedGroups.map((g) =>
        typeof g === "string" ? g : g.name || g.groupName,
      );

      await onSubmit?.({
        shareName: formData.shareName,
        description: formData.description,
        maxSize: formData.maxSize,
        users: userIds,
        groups: groupNames,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter users/groups based on search
  const filteredUsers = useMemo(() => {
    if (!searchTerms.users.trim()) return availableUsers;
    const search = searchTerms.users.toLowerCase();
    return availableUsers.filter((user) => {
      const username = user.username || "";
      const fullName = user.full_name || "";
      const email = user.email || "";
      return (
        username.toLowerCase().includes(search) ||
        fullName.toLowerCase().includes(search) ||
        email.toLowerCase().includes(search)
      );
    });
  }, [availableUsers, searchTerms.users]);

  const filteredGroups = useMemo(() => {
    if (!searchTerms.groups.trim()) return availableGroups;
    const search = searchTerms.groups.toLowerCase();
    return availableGroups.filter((group) => {
      const groupName =
        typeof group === "string" ? group : group.name || group.groupName || "";
      return groupName.toLowerCase().includes(search);
    });
  }, [availableGroups, searchTerms.groups]);

  const progressPercent = ((currentStep + 1) / STEPS.length) * 100;
  const isNextDisabled =
    currentStep === 0 && !isEditMode && (!formData.shareName.trim() || !validateShareName(formData.shareName).valid);

  if (!isOpen) return null;

  // Render Step Content
  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <BasicInfoStep
            formData={formData}
            setFormData={setFormData}
            isEditMode={isEditMode}
            fieldErrors={fieldErrors}
          />
        );
      case 1:
        return (
          <UserSelectionPanel
            availableUsers={filteredUsers}
            selectedUsers={formData.selectedUsers}
            onSelectionChange={(users) =>
              setFormData((prev) => ({ ...prev, selectedUsers: users }))
            }
          />
        );
      case 2:
        return (
          <GroupSelectionPanel
            availableGroups={filteredGroups}
            selectedGroups={formData.selectedGroups}
            onSelectionChange={(groups) =>
              setFormData((prev) => ({ ...prev, selectedGroups: groups }))
            }
          />
        );
      default:
        return null;
    }
  };

  const submitLabel = isSubmitting
    ? "Saving..."
    : isEditMode
      ? "Save Changes"
      : "Create Share";

  return (
    <div className="file-wizard-overlay">
      <div className="file-wizard-dialog">
        {/* Header */}
        <header className="file-wizard-header">
          <nav className="file-wizard-breadcrumb">
            <span className="file-wizard-breadcrumb-item inactive">Shares</span>
            <span className="file-wizard-breadcrumb-separator">›</span>
            <span className="file-wizard-breadcrumb-item active">
              {isEditMode ? `Edit: ${file?.name || "Share"}` : "New Share"}
            </span>
          </nav>
          <button
            className="file-wizard-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </header>

        {/* Progress Bar */}
        <div className="file-wizard-stepper">
          <div className="file-wizard-progress-track">
            <div
              className="file-wizard-progress-fill"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="file-wizard-step-labels">
            {STEPS.map((step, index) => (
              <div
                key={step}
                className={`file-wizard-step-label ${
                  index === currentStep ? "active" : ""
                } ${index < currentStep ? "completed" : ""}`}
              >
                {step}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <main className="file-wizard-content">{renderStepContent()}</main>

        {/* Footer */}
        <footer className="file-wizard-actions">
          <div className="file-wizard-actions-left">
            <button
              className="file-wizard-btn file-wizard-btn-cancel"
              onClick={onClose}
            >
              Cancel
            </button>
            {isEditMode && currentStep === 0 && onDelete && (
              <button
                className="file-wizard-btn file-wizard-btn-delete"
                onClick={() => {
                  if (
                    window.confirm(
                      "Are you sure you want to delete this share? This action cannot be undone.",
                    )
                  ) {
                    handleDelete();
                  }
                }}
              >
                <TrashIcon width={14} height={14} color="#DC2626" /> Delete
              </button>
            )}
          </div>
          <div className="file-wizard-actions-right">
            <button
              className="file-wizard-btn file-wizard-btn-secondary"
              onClick={() => handleNavigate(-1)}
              disabled={currentStep === 0}
            >
              Back
            </button>
            {currentStep < STEPS.length - 1 ? (
              <button
                className="file-wizard-btn file-wizard-btn-primary"
                onClick={() => handleNavigate(1)}
                disabled={isNextDisabled}
              >
                Next
              </button>
            ) : (
              <button
                className="file-wizard-btn file-wizard-btn-primary"
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {submitLabel}
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}

const formDataShape = PropTypes.shape({
  shareName: PropTypes.string,
  description: PropTypes.string,
  maxSize: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  selectedUsers: PropTypes.array,
  selectedGroups: PropTypes.array,
});

const fileShape = PropTypes.shape({
  name: PropTypes.string,
  description: PropTypes.string,
  max_size_gb: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  users: PropTypes.array,
  groups: PropTypes.array,
});

FileShareWizardModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func,
  onSubmit: PropTypes.func,
  file: fileShape,
  onDelete: PropTypes.func,
};

FileShareWizardModal.defaultProps = {
  onClose: undefined,
  onSubmit: undefined,
  file: null,
  onDelete: null,
};

// Sub-component: Basic Info Step
function BasicInfoStep({ formData, setFormData, isEditMode, fieldErrors = {} }) {
  return (
    <div className="file-wizard-step">
      <div className="file-wizard-form-group">
        <label className="file-wizard-label">
          Share Name *
          {isEditMode && (
            <span
              style={{
                fontSize: "12px",
                color: "#9e9e9e",
                fontWeight: "normal",
                marginLeft: "8px",
              }}
            >
              (cannot be changed)
            </span>
          )}
        </label>
        <input
          type="text"
          className={`file-wizard-input${fieldErrors.shareName ? " input-error" : ""}`}
          value={formData.shareName}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, shareName: e.target.value }))
          }
          placeholder="e.g., TeamDocs, Projects, SharedData"
          autoFocus={!isEditMode}
          disabled={isEditMode}
          maxLength={64}
          style={
            isEditMode
              ? {
                  cursor: "not-allowed",
                  opacity: 0.6,
                  backgroundColor: "rgba(255, 255, 255, 0.02)",
                }
              : {}
          }
        />
        {fieldErrors.shareName && (
          <span className="file-wizard-field-error">{fieldErrors.shareName}</span>
        )}
      </div>

      <div className="file-wizard-form-group">
        <label className="file-wizard-label">Description (optional)</label>
        <textarea
          className="file-wizard-textarea"
          value={formData.description}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, description: e.target.value }))
          }
          placeholder="Brief description of this share"
          rows={3}
        />
      </div>

      <div className="file-wizard-form-group">
        <label className="file-wizard-label">Max Size in GB (optional)</label>
        <input
          type="text"
          className={`file-wizard-input${fieldErrors.maxSize ? " input-error" : ""}`}
          value={formData.maxSize}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, maxSize: e.target.value }))
          }
          placeholder="e.g., 100"
        />
        {fieldErrors.maxSize && (
          <span className="file-wizard-field-error">{fieldErrors.maxSize}</span>
        )}
      </div>
    </div>
  );
}

BasicInfoStep.propTypes = {
  formData: formDataShape.isRequired,
  setFormData: PropTypes.func.isRequired,
  isEditMode: PropTypes.bool,
  fieldErrors: PropTypes.object,
};

BasicInfoStep.defaultProps = {
  isEditMode: false,
};
