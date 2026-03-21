import React, { useState, useEffect, useMemo } from "react";
import PropTypes from "prop-types";
import DisplayIcon from "../common/DisplayIcon/DisplayIcon.jsx";
import UploadIcon from "../../assets/ImageUploadIcon.jsx";
import TrashIcon from "../../assets/TrashIcon.jsx";
import Checkbox from "../common/Checkbox/Checkbox.jsx";
import { useThemeColors } from "../../hooks/useThemeColors.js";
import "./EmployeesModal.css";

import {
  validateDisplayName,
  validateEmail,
  validatePassword,
  validateJobTitle,
} from "../../utils/validation.js";

// Use the same APIs as EmployeesPage
import { useAuth } from "../../context/AuthContext.jsx";
import {
  resolveOrgId,
  fetchGroups,
  fetchFileShares,
  fetchWorkstations,
  createImageUploadHandler,
  createToggleSelectionHandler,
  createRemoveSelectionHandler,
  createFilteredItems,
  createNavigationHandler,
  createDeleteHandler,
  createRenderStepContent,
} from "../../utils/modalHelpers.jsx";

const STEPS = ["Basic Info", "Workstations", "Groups", "Shares"];

/**
 * EmployeesModal - Multi-step wizard for creating/editing employees
 */
export default function EmployeesModal({
  open,
  onClose,
  employeeData = null,
  onSubmit,
  onDelete,
  creationStatus = null,
  creationProgress = null,
  creationMessage = null,
}) {
  const { accessToken, currentUser } = useAuth();
  const themeColors = useThemeColors();

  const isEditMode = Boolean(employeeData);
  const isCreating = creationStatus === "running" || creationStatus === "starting";
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Data
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    jobTitle: "",
    password: "",
    profileImage: null,
    selectedWorkstations: [],
    allWorkstations: false,
    selectedGroups: [],
    allGroups: false,
    selectedFiles: [],
    allFiles: false,
  });

  // Validation errors
  const [fieldErrors, setFieldErrors] = useState({});

  // Search State
  const [searchTerms, setSearchTerms] = useState({
    workstations: "",
    groups: "",
    files: "",
  });

  // Available options (fetched)
  const [allWorkstations, setAllWorkstations] = useState([]);
  const [allGroups, setAllGroups] = useState([]);
  const [allFiles, setAllFiles] = useState([]);

  const openToast = (msg) => {
    console.warn(msg);
  };

  // --- GROUPS ---
  const fetchGroupsAll = async () => {
    const orgId = await resolveOrgId(currentUser);
    await fetchGroups(orgId, accessToken, setAllGroups, openToast);
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

    if (isEditMode && employeeData) {
      const nameParts = employeeData.name ? employeeData.name.split(" ") : [];
      setFormData({
        firstName: nameParts[0] || "",
        lastName: nameParts.slice(1).join(" ") || "",
        email: employeeData.email || "",
        jobTitle: employeeData.title || "",
        password: "", // Don't populate password in edit mode
        profileImage: employeeData.profileImage || null,
        selectedWorkstations: employeeData.workstations || [],
        allWorkstations: false,
        selectedGroups: employeeData.groups || [],
        allGroups: false,
        selectedFiles: employeeData.files || [],
        allFiles: false,
      });
    } else {
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        jobTitle: "",
        password: "",
        profileImage: null,
        selectedWorkstations: [],
        allWorkstations: false,
        selectedGroups: [],
        allGroups: false,
        selectedFiles: [],
        allFiles: false,
      });
    }

    setCurrentStep(0);
    setSearchTerms({ workstations: "", groups: "", files: "" });

    fetchWorkstationsAll();
    fetchGroupsAll();
    fetchFileSharesAll();
  }, [open, employeeData, isEditMode, accessToken]);

  // Pre-select groups that contain the user being edited
  useEffect(() => {
    if (!open || !isEditMode || !employeeData?.id || allGroups.length === 0) return;

    const userId = employeeData.id;
    const userGroups = allGroups.filter((g) => {
      const members = Array.isArray(g.members) ? g.members : [];
      return members.some((m) => String(m) === String(userId));
    });

    if (userGroups.length > 0) {
      setFormData((prev) => ({
        ...prev,
        selectedGroups: userGroups,
      }));
    }
  }, [open, isEditMode, employeeData?.id, allGroups]);

  // Filter lists
  const filteredWorkstations = useMemo(
    () =>
      createFilteredItems(allWorkstations, searchTerms.workstations, [
        "name",
        "ipAddress",
      ]),
    [allWorkstations, searchTerms.workstations],
  );

  const filteredGroups = useMemo(
    () => createFilteredItems(allGroups, searchTerms.groups, ["name"]),
    [allGroups, searchTerms.groups],
  );

  const filteredFiles = useMemo(
    () =>
      createFilteredItems(allFiles, searchTerms.files, [
        "name",
        "description",
        "drive",
      ]),
    [allFiles, searchTerms.files],
  );

  // Handlers
  const handleNavigate = createNavigationHandler(setCurrentStep, STEPS.length);

  /** Validate all fields and return true if the form is valid. */
  const runValidation = () => {
    const errs = {};
    const fn = validateDisplayName(formData.firstName, "First name");
    if (!fn.valid) errs.firstName = fn.error;
    const ln = validateDisplayName(formData.lastName, "Last name");
    if (!ln.valid) errs.lastName = ln.error;
    const em = validateEmail(formData.email);
    if (!em.valid) errs.email = em.error;
    const jt = validateJobTitle(formData.jobTitle);
    if (!jt.valid) errs.jobTitle = jt.error;
    if (!isEditMode && formData.password) {
      const pw = validatePassword(formData.password);
      if (!pw.valid) errs.password = pw.error;
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    if (!runValidation()) return;
    setIsSubmitting(true);
    try {
      await onSubmit?.({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        jobTitle: formData.jobTitle.trim(),
        password: formData.password,
        profileImage: formData.profileImage,
        workstations: formData.selectedWorkstations,
        groups: formData.selectedGroups,
        files: formData.selectedFiles,
      });
      // Only auto-close for edit mode; create mode closes after job completes
      if (isEditMode) {
        onClose();
      }
    } catch (error) {
      console.error("Failed to submit employee:", error);
      setIsSubmitting(false);
    }
  };

  const handleDelete = createDeleteHandler({
    onDelete: async () => {
      await onDelete?.();
    },
    setIsSubmitting,
    onClose,
  });

  const handleImageUpload = createImageUploadHandler(
    setFormData,
    "profileImage",
  );
  const toggleSelection = createToggleSelectionHandler(setFormData);
  const removeSelection = createRemoveSelectionHandler(setFormData);

  const progressPercent = ((currentStep + 1) / STEPS.length) * 100;

  if (!open) return null;

  // Render Step Content using shared factory
  const renderStepContent = createRenderStepContent({
    steps: [
      { handleImageUpload, isEditMode },
      { type: "workstations" },
      { type: "groups" },
      { type: "files" },
    ],
    currentStep,
    formData,
    setFormData,
    searchTerms,
    setSearchTerms,
    filteredData: {
      workstations: filteredWorkstations,
      groups: filteredGroups,
      files: filteredFiles,
    },
    allData: {
      workstations: allWorkstations,
      groups: allGroups,
      files: allFiles,
    },
    toggleSelection,
    removeSelection,
    BasicInfoStep,
    SelectionStep,
    fieldErrors,
  });

  const isNextDisabled =
    currentStep === 0 &&
    (!formData.firstName.trim() ||
      !formData.lastName.trim() ||
      !formData.email.trim() ||
      !validateDisplayName(formData.firstName, "First name").valid ||
      !validateDisplayName(formData.lastName, "Last name").valid ||
      !validateEmail(formData.email).valid);

  return (
    <div className="employees-modal-overlay">
      <div className="employees-modal-dialog">
        {/* Header */}
        <header className="employees-modal-header">
          <nav className="employees-modal-breadcrumb">
            <span className="employees-modal-breadcrumb-item inactive">
              Users
            </span>
            <span className="employees-modal-breadcrumb-separator">›</span>
            <span className="employees-modal-breadcrumb-item active">
              {isEditMode ? "Edit User" : "New User"}
            </span>
          </nav>
          <button
            className="employees-modal-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </header>

        {/* Progress Bar */}
        <div className="employees-modal-stepper">
          <div className="employees-modal-progress-track">
            <div
              className="employees-modal-progress-fill"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="employees-modal-step-labels">
            {STEPS.map((step, index) => (
              <div
                key={step}
                className={`employees-modal-step-label ${
                  index === currentStep ? "active" : ""
                } ${index < currentStep ? "completed" : ""}`}
              >
                {step}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <main className="employees-modal-content">
          {isCreating ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "24px", padding: "48px 24px" }}>
              <div style={{ fontSize: "18px", fontWeight: 500, color: themeColors.textPrimary }}>
                Creating user...
              </div>
              <div style={{ width: "100%", maxWidth: "300px" }}>
                <div style={{ height: "4px", backgroundColor: themeColors.border, borderRadius: "2px", overflow: "hidden" }}>
                  <div style={{ 
                    height: "100%", 
                    backgroundColor: themeColors.success,
                    animation: "pulse 2s ease-in-out infinite",
                  }} />
                </div>
              </div>
              {creationMessage && (
                <div style={{ fontSize: "14px", color: themeColors.textSecondary, textAlign: "center" }}>
                  {creationMessage}
                </div>
              )}
              {typeof creationProgress === "number" && (
                <div style={{ fontSize: "14px", color: themeColors.textSecondary }}>
                  {creationProgress}%
                </div>
              )}
            </div>
          ) : (
            renderStepContent()
          )}
        </main>

        {/* Footer */}
        <footer className="employees-modal-actions" style={{ opacity: isCreating ? 0.5 : 1, pointerEvents: isCreating ? "none" : "auto" }}>
          <div className="employees-modal-actions-left">
            <button
              className="employees-modal-btn employees-modal-btn-cancel"
              onClick={onClose}
              disabled={isCreating}
            >
              Cancel
            </button>
            {isEditMode && currentStep === 0 && !isCreating && (
              <button
                className="employees-modal-btn employees-modal-btn-delete"
                onClick={() => {
                  if (
                    window.confirm(
                      "Are you sure you want to delete this user? This action cannot be undone.",
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
          {!isCreating && (
            <div className="employees-modal-actions-right">
              {currentStep > 0 && (
                <button
                  className="employees-modal-btn employees-modal-btn-secondary"
                  onClick={() => handleNavigate(-1)}
                >
                  Back
                </button>
              )}
              {currentStep < STEPS.length - 1 ? (
                <button
                  className="employees-modal-btn employees-modal-btn-primary"
                  onClick={() => handleNavigate(1)}
                  disabled={isNextDisabled}
                  style={{ backgroundColor: "var(--text-primary)", color: "var(--bg-primary)" }}
                >
                  Next
                </button>
              ) : (
                <button
                  className="employees-modal-btn employees-modal-btn-primary"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  style={{ backgroundColor: "var(--text-primary)", color: "var(--bg-primary)" }}
                >
                  {isSubmitting
                    ? "Saving..."
                    : isEditMode
                      ? "Save Changes"
                      : "Create User"}
                </button>
              )}
            </div>
          )}
        </footer>
      </div>
    </div>
  );
}

// Sub-components
function BasicInfoStep({
  formData,
  setFormData,
  handleImageUpload,
  isEditMode,
  fieldErrors = {},
}) {
  return (
    <div className="employees-modal-step">
      <div className="employees-modal-form-row">
        <div className="employees-modal-form-group">
          <label className="employees-modal-label">First Name *</label>
          <input
            type="text"
            className={`employees-modal-input${fieldErrors.firstName ? " input-error" : ""}`}
            value={formData.firstName}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, firstName: e.target.value }))
            }
            placeholder="John"
            maxLength={100}
          />
          {fieldErrors.firstName && (
            <span className="employees-modal-field-error">{fieldErrors.firstName}</span>
          )}
        </div>

        <div className="employees-modal-form-group">
          <label className="employees-modal-label">Last Name *</label>
          <input
            type="text"
            className={`employees-modal-input${fieldErrors.lastName ? " input-error" : ""}`}
            value={formData.lastName}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, lastName: e.target.value }))
            }
            placeholder="Doe"
            maxLength={100}
          />
          {fieldErrors.lastName && (
            <span className="employees-modal-field-error">{fieldErrors.lastName}</span>
          )}
        </div>
      </div>

      <div className="employees-modal-form-group">
        <label className="employees-modal-label">Email *</label>
        <input
          type="email"
          className={`employees-modal-input${fieldErrors.email ? " input-error" : ""}`}
          value={formData.email}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, email: e.target.value }))
          }
          placeholder="john.doe@example.com"
          maxLength={254}
        />
        {fieldErrors.email && (
          <span className="employees-modal-field-error">{fieldErrors.email}</span>
        )}
      </div>

      <div className="employees-modal-form-group">
        <label className="employees-modal-label">Job Title</label>
        <input
          type="text"
          className={`employees-modal-input${fieldErrors.jobTitle ? " input-error" : ""}`}
          value={formData.jobTitle}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, jobTitle: e.target.value }))
          }
          placeholder="Software Engineer"
          maxLength={100}
        />
        {fieldErrors.jobTitle && (
          <span className="employees-modal-field-error">{fieldErrors.jobTitle}</span>
        )}
      </div>

      <div className="employees-modal-form-group">
        <label className="employees-modal-label">Profile Picture</label>
        <div className="employees-modal-image-upload">
          {formData.profileImage ? (
            <div className="employees-modal-image-preview">
              <img src={formData.profileImage} alt="Profile" />
              <button
                type="button"
                className="employees-modal-image-remove"
                onClick={() =>
                  setFormData((prev) => ({ ...prev, profileImage: null }))
                }
              >
                ×
              </button>
            </div>
          ) : (
            <label className="employees-modal-image-upload-label">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                style={{ display: "none" }}
              />
              <div className="employees-modal-image-placeholder">
                <span className="employees-modal-image-icon">
                  <UploadIcon width={48} height={48} fill="var(--text-tertiary)" />
                </span>
                <span style={{color: "var(--text-secondary)"}}>Upload Image</span>
              </div>
            </label>
          )}
        </div>
      </div>

      {!isEditMode && (
        <div className="employees-modal-form-group">
          <label className="employees-modal-label">Password</label>
          <input
            type="password"
            className={`employees-modal-input${fieldErrors.password ? " input-error" : ""}`}
            value={formData.password}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, password: e.target.value }))
            }
            placeholder="Min 12 chars, upper+lower+digit+special"
            maxLength={128}
            data-testid="password-input"
          />
          {fieldErrors.password && (
            <span className="employees-modal-field-error">{fieldErrors.password}</span>
          )}
        </div>
      )}
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
    workstations: {
      label: "Add Workstations",
      placeholder: "Search workstations...",
      renderItem: (item) => ({
        icon: <DisplayIcon type="workstation" data={item} size="small" />,
        name: item.name,
        detail: `${item.online ? "🟢 Online" : "🔴 Offline"} • ${item.ipAddress}`,
      }),
    },
    groups: {
      label: "Add Groups",
      placeholder: "Search groups...",
      renderItem: (item) => ({
        icon: <DisplayIcon type="group" data={item} size="small" />,
        name: item.name,
        detail: `${item.members} members`,
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
          icon: <div className="employees-modal-file-icon">{icon}</div>,
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
    <div className="employees-modal-step">
      <div className="employees-modal-search-section">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "8px",
          }}
        >
          <label className="employees-modal-label" style={{ marginBottom: 0 }}>
            {config.label}
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Checkbox
              checked={allAreSelected}
              indeterminate={isIndeterminate}
              onChange={onAllChange}
            />
            <span style={{ fontSize: "0.9rem", color: "var(--text-primary)" }}>
              {type === "workstations" && "All Workstations"}
              {type === "groups" && "All Groups"}
              {type === "files" && "All Shares"}
            </span>
          </div>
        </div>
        <input
          type="text"
          className="employees-modal-search"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={config.placeholder}
        />

        {/* Always render selectable list */}
        <div className="employees-modal-dropdown">
          {items.length === 0 ? (
            <div
              className="employees-modal-dropdown-item"
              style={{ opacity: 0.7, cursor: "default", color: "var(--text-secondary)" }}
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
                  className={`employees-modal-dropdown-item ${isSelected ? "selected" : ""}`}
                  onClick={() => onToggle(item)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onToggle(item);
                    }
                  }}
                >
                  {rendered.icon}
                  <div className="employees-modal-dropdown-item-info">
                    <div className="employees-modal-dropdown-item-name">
                      {rendered.name}
                    </div>
                    <div className="employees-modal-dropdown-item-detail">
                      {rendered.detail}
                    </div>
                  </div>
                  {isSelected && (
                    <span className="employees-modal-checkmark">✓</span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {selectedItems.length > 0 && (
        <div className="employees-modal-selected-section">
          <div className="employees-modal-selected-header">
            Selected {type.charAt(0).toUpperCase() + type.slice(1)} (
            {selectedItems.length})
          </div>
          <div className="employees-modal-selected-cards">
            {selectedItems.map((item) => {
              const rendered = config.renderItem(item);
              return (
                <div key={item.id} className="employees-modal-selected-card">
                  <button
                    type="button"
                    className="employees-modal-card-remove-btn"
                    onClick={() => onRemove(item.id)}
                  >
                    ×
                  </button>
                  {type === "files" ? (
                    <div className="employees-modal-file-card-icon">
                      {rendered.fileIcon}
                    </div>
                  ) : (
                    rendered.icon
                  )}
                  <span className="employees-modal-selected-card-name">
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

BasicInfoStep.propTypes = {
  formData: PropTypes.object.isRequired,
  setFormData: PropTypes.func.isRequired,
  handleImageUpload: PropTypes.func,
  isEditMode: PropTypes.bool,
  fieldErrors: PropTypes.object,
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

EmployeesModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  employeeData: PropTypes.object,
  onSubmit: PropTypes.func.isRequired,
  onDelete: PropTypes.func,
  creationStatus: PropTypes.string,
  creationProgress: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  creationMessage: PropTypes.string,
};