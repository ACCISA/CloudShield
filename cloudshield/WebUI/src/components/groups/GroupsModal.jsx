import React, { useState, useEffect, useMemo } from "react";
import DisplayIcon from "../common/DisplayIcon/DisplayIcon.jsx";
import Checkbox from "../common/Checkbox/Checkbox.jsx";
import UploadIcon from "../../assets/ImageUploadIcon.jsx";
import TrashIcon from "../../assets/TrashIcon.jsx";
import "./GroupsModal.css";

import { validateGroupName } from "../../utils/validation.js";

// Use the same Users API logic as EmployeesPage
import { useAuth } from "../../context/AuthContext.jsx";
import {
  resolveOrgId,
  fetchFileShares,
  safeSplitName,
  fetchUsers,
  fetchWorkstations,
  createImageUploadHandler,
  createToggleSelectionHandler,
  createRemoveSelectionHandler,
  createFilteredItems,
  createNavigationHandler,
  createDeleteHandler,
  createRenderStepContent,
} from "../../utils/modalHelpers.jsx";

const STEPS = ["Basic Info", "Users", "Workstations", "Shares"];

/**
 * GroupsModal - Multi-step wizard for creating/editing groups
 */
export default function GroupsModal({
  open,
  onClose,
  groupData = null,
  onSubmit,
  onDelete,
  onRefresh,
}) {
  const { accessToken, currentUser } = useAuth();

  const isEditMode = Boolean(groupData);
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  // Form Data
  const [formData, setFormData] = useState({
    groupName: "",
    description: "",
    groupImage: null,
    selectedUsers: [],
    selectedWorkstations: [],
    selectedFiles: [],
    allUsers: false,
    allWorkstations: false,
    allFiles: false,
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

  // --- USERS (use the same logic/pattern as EmployeesPage) ---
  const fetchUsersAll = async () => {
    await fetchUsers(accessToken, setAllUsers, openToast);
  };

  // --- FILE SHARES ---
  const fetchFileSharesAll = async () => {
    const orgId = await resolveOrgId(currentUser);
    await fetchFileShares(orgId, setAllFiles, openToast);
  };

  // --- WORKSTATIONS ---
  const fetchWorkstationsAll = async () => {
    const orgId = await resolveOrgId(currentUser);
    await fetchWorkstations(orgId, accessToken, setAllWorkstations, openToast);
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

  const filteredWorkstations = useMemo(
    () =>
      createFilteredItems(allWorkstations, searchTerms.workstations, [
        "name",
        "ipAddress",
      ]),
    [allWorkstations, searchTerms.workstations],
  );

  const filteredFiles = useMemo(
    () =>
      createFilteredItems(allFiles, searchTerms.files, [
        "name",
        "description",
        "drive",
        "owner",
      ]),
    [allFiles, searchTerms.files],
  );

  // Handlers
  const handleNavigate = createNavigationHandler(setCurrentStep, STEPS.length);

  const handleSubmit = async () => {
    if (isSubmitting) return;
    // Validate group name before submitting
    const gnResult = validateGroupName(formData.groupName);
    if (!gnResult.valid) {
      setFieldErrors({ groupName: gnResult.error });
      return;
    }
    setFieldErrors({});
    setIsSubmitting(true);
    try {
      await onSubmit?.({
        name: formData.groupName.trim(),
        description: formData.description,
        image: formData.groupImage,
        users: formData.selectedUsers,
        workstations: formData.selectedWorkstations,
        files: formData.selectedFiles,
      });
      onRefresh?.();
      onClose();
    } catch (error) {
      console.error("Failed to submit group:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = createDeleteHandler({
    onDelete: async () => {
      if (!groupData?._id && !groupData?.id) return;
      await onDelete?.(groupData._id || groupData.id);
    },
    setIsSubmitting,
    onClose,
  });

  const handleImageUpload = createImageUploadHandler(setFormData, "groupImage");
  const toggleSelection = createToggleSelectionHandler(setFormData);
  const removeSelection = createRemoveSelectionHandler(setFormData);

  const progressPercent = ((currentStep + 1) / STEPS.length) * 100;

  if (!open) return null;

  // Render Step Content using shared factory
  const renderStepContent = createRenderStepContent({
    steps: [
      { handleImageUpload, isEditMode },
      { type: "users" },
      { type: "workstations" },
      { type: "files" },
    ],
    currentStep,
    formData,
    setFormData,
    searchTerms,
    setSearchTerms,
    filteredData: {
      users: filteredUsers,
      workstations: filteredWorkstations,
      files: filteredFiles,
    },
    allData: {
      users: allUsers,
      workstations: allWorkstations,
      files: allFiles,
    },
    toggleSelection,
    removeSelection,
    BasicInfoStep,
    SelectionStep,
    fieldErrors,
  });

  const isNextDisabled = currentStep === 0 && (!formData.groupName.trim() || !validateGroupName(formData.groupName).valid);

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
          <div className="groups-modal-actions-left">
            <button
              className="groups-modal-btn groups-modal-btn-cancel"
              onClick={onClose}
            >
              Cancel
            </button>
            {isEditMode && currentStep === 0 && (
              <button
                className="groups-modal-btn groups-modal-btn-delete"
                onClick={() => {
                  if (
                    window.confirm(
                      "Are you sure you want to delete this group? This action cannot be undone.",
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
          <div className="groups-modal-actions-right">
            <button
              className="groups-modal-btn groups-modal-btn-secondary"
              onClick={() => handleNavigate(-1)}
              disabled={currentStep === 0}
            >
              Back
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
                {isSubmitting
                  ? "Saving..."
                  : isEditMode
                    ? "Save Changes"
                    : "Create Group"}
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}

// Sub-components
function BasicInfoStep({ formData, setFormData, handleImageUpload, fieldErrors = {} }) {
  return (
    <div className="groups-modal-step">
      <div className="groups-modal-form-group">
        <label className="groups-modal-label">Group Name *</label>
        <input
          type="text"
          className={`groups-modal-input${fieldErrors.groupName ? " input-error" : ""}`}
          value={formData.groupName}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, groupName: e.target.value }))
          }
          placeholder="Enter group name"
          maxLength={64}
        />
        {fieldErrors.groupName && (
          <span className="groups-modal-field-error">{fieldErrors.groupName}</span>
        )}
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
      label: "Add Shares",
      placeholder: "Search shares...",
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
  const hasSelected = selectedItems.length > 0;
  const allAreSelected =
    selectedItems.length === totalItems.length && totalItems.length > 0;
  const isIndeterminate = hasSelected && !allAreSelected;

  return (
    <div className="groups-modal-step">
      <div className="groups-modal-search-section">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "8px",
          }}
        >
          <label className="groups-modal-label" style={{ marginBottom: 0 }}>
            {config.label}
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Checkbox
              checked={allAreSelected}
              indeterminate={isIndeterminate}
              onChange={onAllChange}
            />
            <span style={{ fontSize: "0.9rem", color: "#ffffff" }}>
              {type === "users" && "All Users"}
              {type === "workstations" && "All Workstations"}
              {type === "files" && "All Shares"}
            </span>
          </div>
        </div>
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
