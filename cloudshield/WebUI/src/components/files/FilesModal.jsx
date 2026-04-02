import React, { useState, useEffect, useMemo } from "react";
import SubmittingOverlay from "../common/SubmittingOverlay/SubmittingOverlay.jsx";
import PropTypes from "prop-types";
import DisplayIcon from "../common/DisplayIcon/DisplayIcon.jsx";
import Checkbox from "../common/Checkbox/Checkbox.jsx";
import TrashIcon from "../../assets/TrashIcon.jsx";
import "./FilesModal.css";

import {
  validateShareName,
  validateShareSize,
} from "../../utils/validation.js";

// Use the same modal helper utilities as EmployeesModal and GroupsModal
import { useAuth } from "../../context/AuthContext.jsx";
import {
  resolveOrgId,
  fetchUsers,
  fetchGroups,
  createToggleSelectionHandler,
  createRemoveSelectionHandler,
  createFilteredItems,
  createNavigationHandler,
  createDeleteHandler,
  createRenderStepContent,
} from "../../utils/modalHelpers.jsx";

const STEPS = ["Basic Info", "Users", "Groups"];

/**
 * FilesModal - Multi-step wizard for creating/editing file shares
 * Follows the same pattern as GroupsModal and EmployeesModal
 */
export default function FilesModal({
  open,
  onClose,
  fileData = null,
  onSubmit,
  onDelete,
  onRefresh,
}) {
  const { accessToken, currentUser } = useAuth();

  const isEditMode = Boolean(fileData);
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
    allUsers: false,
    allGroups: false,
  });

  // Search State
  const [searchTerms, setSearchTerms] = useState({
    users: "",
    groups: "",
  });

  // Available options (fetched)
  const [allUsers, setAllUsers] = useState([]);
  const [allGroups, setAllGroups] = useState([]);

  const openToast = (msg) => {
    console.warn(msg);
  };

  // --- USERS ---
  const fetchAllUsers = async () => {
    await fetchUsers(accessToken, setAllUsers, openToast);
  };

  // --- GROUPS ---
  const fetchAllGroups = async () => {
    const orgId = await resolveOrgId(currentUser);
    await fetchGroups(orgId, accessToken, setAllGroups, openToast);
  };

  // Initialize form data + fetch all options when modal opens
  useEffect(() => {
    if (!open) return;

    if (isEditMode && fileData) {
      setFormData({
        shareName: fileData.name || "",
        description: fileData.description || "",
        maxSize: fileData.maxSize || fileData.max_size || "",
        selectedUsers: [],
        selectedGroups: [],
        allUsers: false,
        allGroups: false,
        _pendingUserEmails: Array.isArray(fileData.users) ? fileData.users : [],
        _pendingGroupNames: Array.isArray(fileData.groups)
          ? fileData.groups
          : [],
      });
    } else {
      setFormData({
        shareName: "",
        description: "",
        maxSize: "",
        selectedUsers: [],
        selectedGroups: [],
        allUsers: false,
        allGroups: false,
      });
    }

    setCurrentStep(0);
    setSearchTerms({ users: "", groups: "" });

    fetchAllUsers();
    fetchAllGroups();
  }, [open, fileData, isEditMode, accessToken]);

  // Populate selectedUsers once allUsers is loaded (match by email)
  useEffect(() => {
    if (
      !formData._pendingUserEmails ||
      allUsers.length === 0 ||
      formData.selectedUsers.length > 0
    )
      return;

    const matchedUsers = allUsers.filter((user) =>
      formData._pendingUserEmails.includes(user.email),
    );

    if (matchedUsers.length > 0) {
      setFormData((prev) => ({
        ...prev,
        selectedUsers: matchedUsers,
        _pendingUserEmails: undefined,
      }));
    }
  }, [allUsers, formData._pendingUserEmails, formData.selectedUsers.length]);

  // Populate selectedGroups once allGroups is loaded (match by name)
  useEffect(() => {
    if (
      !formData._pendingGroupNames ||
      allGroups.length === 0 ||
      formData.selectedGroups.length > 0
    )
      return;

    const matchedGroups = allGroups.filter((group) =>
      formData._pendingGroupNames.includes(group.name),
    );

    if (matchedGroups.length > 0) {
      setFormData((prev) => ({
        ...prev,
        selectedGroups: matchedGroups,
        _pendingGroupNames: undefined,
      }));
    }
  }, [allGroups, formData._pendingGroupNames, formData.selectedGroups.length]);

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

  const filteredGroups = useMemo(
    () => createFilteredItems(allGroups, searchTerms.groups, ["name"]),
    [allGroups, searchTerms.groups],
  );

  // Handlers
  const handleNavigate = createNavigationHandler(setCurrentStep, STEPS.length);

  const handleSubmit = async () => {
    if (isSubmitting) return;

    // Validate share name
    if (!isEditMode) {
      const nameResult = validateShareName(formData.shareName);
      if (!nameResult.valid) {
        setFieldErrors({ shareName: nameResult.error });
        return;
      }
    }

    // Validate max size
    if (formData.maxSize) {
      const sizeResult = validateShareSize(formData.maxSize);
      if (!sizeResult.valid) {
        setFieldErrors({ maxSize: sizeResult.error });
        return;
      }
    }

    setFieldErrors({});
    setIsSubmitting(true);

    try {
      // Extract emails for users and names for groups
      const userEmails = formData.selectedUsers
        .map((u) => u.email)
        .filter(Boolean);
      const groupNames = formData.selectedGroups
        .map((g) => g.name)
        .filter(Boolean);

      await onSubmit?.({
        shareName: formData.shareName.trim(),
        description: formData.description,
        maxSize: formData.maxSize,
        users: userEmails,
        groups: groupNames,
      });
      onRefresh?.();
      onClose();
    } catch (error) {
      console.error("Failed to submit share:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = createDeleteHandler({
    onDelete: async () => {
      if (!fileData?.name) return;
      await onDelete?.(fileData.name);
    },
    setIsSubmitting,
    onClose,
  });

  const toggleSelection = createToggleSelectionHandler(setFormData);
  const removeSelection = createRemoveSelectionHandler(setFormData);

  const progressPercent = ((currentStep + 1) / STEPS.length) * 100;

  if (!open) return null;

  // Render Step Content using shared factory
  const renderStepContent = createRenderStepContent({
    steps: [{ isEditMode }, { type: "users" }, { type: "groups" }],
    currentStep,
    formData,
    setFormData,
    searchTerms,
    setSearchTerms,
    filteredData: {
      users: filteredUsers,
      groups: filteredGroups,
    },
    allData: {
      users: allUsers,
      groups: allGroups,
    },
    toggleSelection,
    removeSelection,
    BasicInfoStep,
    SelectionStep,
    fieldErrors,
  });

  const isNextDisabled =
    currentStep === 0 &&
    (!formData.shareName.trim() ||
      (!isEditMode && !validateShareName(formData.shareName).valid));

  const submitLabel = isSubmitting
    ? "Saving..."
    : isEditMode
      ? "Save Changes"
      : "Create Share";

  return (
    <div className="files-modal-overlay">
      <div className="files-modal-dialog">
        {/* Header */}
        <header className="files-modal-header">
          <nav className="files-modal-breadcrumb">
            <span className="files-modal-breadcrumb-item inactive">Shares</span>
            <span className="files-modal-breadcrumb-separator">›</span>
            <span className="files-modal-breadcrumb-item active">
              {isEditMode ? "Edit Share" : "New Share"}
            </span>
          </nav>
          <button
            className="files-modal-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </header>

        {/* Progress Bar */}
        <div className="files-modal-stepper">
          <div className="files-modal-progress-track">
            <div
              className="files-modal-progress-fill"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="files-modal-step-labels">
            {STEPS.map((step, index) => (
              <div
                key={step}
                className={`files-modal-step-label ${
                  index === currentStep ? "active" : ""
                } ${index < currentStep ? "completed" : ""}`}
              >
                {step}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <main className="files-modal-content">
          {isSubmitting ? (
            <SubmittingOverlay
              label={isEditMode ? "Saving changes..." : "Creating share..."}
            />
          ) : (
            renderStepContent()
          )}
        </main>

        {/* Footer */}
        <footer className="files-modal-actions">
          <div className="files-modal-actions-left">
            <button
              className="files-modal-btn files-modal-btn-cancel"
              onClick={onClose}
            >
              Cancel
            </button>
            {isEditMode && currentStep === 0 && (
              <button
                className="files-modal-btn files-modal-btn-delete"
                onClick={() => {
                  if (
                    window.confirm(
                      "Are you sure you want to delete this share? This action cannot be undone.",
                    )
                  ) {
                    handleDelete();
                  }
                }}
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                <TrashIcon width={14} height={14} color="#DC2626" /> Delete
              </button>
            )}
          </div>
          <div className="files-modal-actions-right">
            <button
              className="files-modal-btn files-modal-btn-secondary"
              onClick={() => handleNavigate(-1)}
              disabled={currentStep === 0}
            >
              Back
            </button>
            {currentStep < STEPS.length - 1 ? (
              <button
                className="files-modal-btn files-modal-btn-primary"
                onClick={() => handleNavigate(1)}
                disabled={isNextDisabled}
                style={{
                  backgroundColor: "var(--text-primary)",
                  color: "var(--bg-primary)",
                }}
              >
                Next
              </button>
            ) : (
              <button
                className="files-modal-btn files-modal-btn-primary"
                onClick={handleSubmit}
                disabled={isSubmitting}
                style={{
                  backgroundColor: "var(--text-primary)",
                  color: "var(--bg-primary)",
                }}
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

// Sub-components
function BasicInfoStep({
  formData,
  setFormData,
  isEditMode,
  fieldErrors = {},
}) {
  return (
    <div className="files-modal-step">
      <div className="files-modal-form-group">
        <label className="files-modal-label">Share Name *</label>
        <input
          type="text"
          className={`files-modal-input${fieldErrors.shareName ? " input-error" : ""}`}
          value={formData.shareName}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, shareName: e.target.value }))
          }
          placeholder="Enter share name"
          maxLength={64}
          disabled={isEditMode}
        />
        {fieldErrors.shareName && (
          <span className="files-modal-field-error">
            {fieldErrors.shareName}
          </span>
        )}
        {isEditMode && (
          <span className="files-modal-field-hint">
            Share name cannot be changed after creation
          </span>
        )}
      </div>

      <div className="files-modal-form-group">
        <label className="files-modal-label">Description</label>
        <textarea
          className="files-modal-textarea"
          value={formData.description}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, description: e.target.value }))
          }
          placeholder="Enter a brief description of the share"
          rows={3}
        />
      </div>

      <div className="files-modal-form-group">
        <label className="files-modal-label">Maximum Size (GB)</label>
        <input
          type="number"
          className={`files-modal-input${fieldErrors.maxSize ? " input-error" : ""}`}
          value={formData.maxSize}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, maxSize: e.target.value }))
          }
          placeholder="Enter maximum size in GB (optional)"
          min="1"
        />
        {fieldErrors.maxSize && (
          <span className="files-modal-field-error">{fieldErrors.maxSize}</span>
        )}
      </div>
    </div>
  );
}

BasicInfoStep.propTypes = {
  formData: PropTypes.object.isRequired,
  setFormData: PropTypes.func.isRequired,
  isEditMode: PropTypes.bool,
  fieldErrors: PropTypes.object,
};

function SelectionStep({
  type,
  searchTerm,
  setSearchTerm,
  filteredItems,
  selectedItems,
  allSelected,
  onToggle,
  onRemove,
  onAllChange,
  totalItems,
}) {
  const config = {
    users: {
      label: "Add Users",
      placeholder: "Search users...",
      renderItem: (item) => ({
        icon: <DisplayIcon type="user" data={item} size="small" />,
        name: `${item.firstName} ${item.lastName}`,
        detail: item.email,
      }),
    },
    groups: {
      label: "Add Groups",
      placeholder: "Search groups...",
      renderItem: (item) => ({
        icon: <DisplayIcon type="group" data={item} size="small" />,
        name: item.name,
        detail: `${item.member_count || item.members?.length || 0} members`,
      }),
    },
  }[type];

  const items = Array.isArray(filteredItems) ? filteredItems : [];
  const hasSelected = selectedItems.length > 0;
  const allAreSelected =
    selectedItems.length === totalItems.length && totalItems.length > 0;
  const isIndeterminate = hasSelected && !allAreSelected;

  return (
    <div className="files-modal-step">
      <div className="files-modal-search-section">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "8px",
          }}
        >
          <label className="files-modal-label" style={{ marginBottom: 0 }}>
            {config.label}
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Checkbox
              checked={allAreSelected}
              indeterminate={isIndeterminate}
              onChange={onAllChange}
            />
            <span style={{ fontSize: "0.9rem", color: "var(--text-primary)" }}>
              {type === "users" && "All Users"}
              {type === "groups" && "All Groups"}
            </span>
          </div>
        </div>
        <input
          type="text"
          className="files-modal-search"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={config.placeholder}
        />

        {/* Always render selectable list */}
        <div className="files-modal-dropdown">
          {items.length === 0 ? (
            <div
              className="files-modal-dropdown-item"
              style={{
                opacity: 0.7,
                cursor: "default",
                color: "var(--text-secondary)",
              }}
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
                  className={`files-modal-dropdown-item ${isSelected ? "selected" : ""}`}
                  onClick={() => onToggle(item)}
                >
                  {rendered.icon}
                  <div className="files-modal-dropdown-item-info">
                    <div className="files-modal-dropdown-item-name">
                      {rendered.name}
                    </div>
                    <div className="files-modal-dropdown-item-detail">
                      {rendered.detail}
                    </div>
                  </div>
                  {isSelected && (
                    <span className="files-modal-checkmark">✓</span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {selectedItems.length > 0 && (
        <div className="files-modal-selected-section">
          <div className="files-modal-selected-header">
            Selected {type.charAt(0).toUpperCase() + type.slice(1)} (
            {selectedItems.length})
          </div>
          <div className="files-modal-selected-cards">
            {selectedItems.map((item) => {
              const rendered = config.renderItem(item);
              return (
                <div key={item.id} className="files-modal-selected-card">
                  <button
                    type="button"
                    className="files-modal-card-remove-btn"
                    onClick={() => onRemove(item.id)}
                  >
                    ×
                  </button>
                  {rendered.icon}
                  <span className="files-modal-selected-card-name">
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

FilesModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  fileData: PropTypes.object,
  onSubmit: PropTypes.func,
  onDelete: PropTypes.func,
  onRefresh: PropTypes.func,
};

SelectionStep.propTypes = {
  type: PropTypes.string.isRequired,
  searchTerm: PropTypes.string.isRequired,
  setSearchTerm: PropTypes.func.isRequired,
  filteredItems: PropTypes.array.isRequired,
  selectedItems: PropTypes.array.isRequired,
  allSelected: PropTypes.bool,
  onToggle: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
  onAllChange: PropTypes.func.isRequired,
  totalItems: PropTypes.array.isRequired,
};
