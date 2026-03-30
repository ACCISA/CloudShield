import React, { useState, useEffect, useMemo } from "react";
import SubmittingOverlay from "../common/SubmittingOverlay/SubmittingOverlay.jsx";
import PropTypes from "prop-types";
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

function getModalItemId(item) {
  if (item === null || item === undefined) return "";
  if (typeof item === "string" || typeof item === "number") {
    return String(item);
  }

  return String(
    item.id ||
      item._id ||
      item.email ||
      item.username ||
      item.name ||
      item.group_name ||
      item.groupName ||
      item.workstationName ||
      item.hostname ||
      item.shareName ||
      "",
  );
}

function getModalItemAliases(item) {
  if (item === null || item === undefined) return [];
  if (typeof item === "string" || typeof item === "number") {
    return [String(item).toLowerCase()];
  }

  const aliases = [
    item.id,
    item._id,
    item.email,
    item.username,
    item.name,
    item.group_name,
    item.groupName,
    item.workstationName,
    item.hostname,
    item.shareName,
  ];

  if (item.firstName || item.lastName) {
    aliases.push(`${item.firstName || ""} ${item.lastName || ""}`.trim());
  }

  return Array.from(
    new Set(
      aliases
        .filter(Boolean)
        .map((value) => String(value).trim().toLowerCase())
        .filter(Boolean),
    ),
  );
}

function reconcileSelectedItems(selectedItems, availableItems, normalizeFallback) {
  const available = Array.isArray(availableItems) ? availableItems : [];
  const selected = Array.isArray(selectedItems) ? selectedItems : [];

  if (selected.length === 0 || available.length === 0) {
    return selected.map((item) => normalizeFallback(item));
  }

  const lookup = new Map();
  available.forEach((item) => {
    getModalItemAliases(item).forEach((alias) => {
      if (!lookup.has(alias)) {
        lookup.set(alias, item);
      }
    });
  });

  const seen = new Set();
  const resolved = [];

  selected.forEach((item) => {
    const match = getModalItemAliases(item)
      .map((alias) => lookup.get(alias))
      .find(Boolean);
    const normalized = match || normalizeFallback(item);
    const key = getModalItemId(normalized) || getModalItemAliases(normalized)[0];

    if (!key || seen.has(key)) return;
    seen.add(key);
    resolved.push(normalized);
  });

  return resolved;
}

function areSelectionsEqual(left, right) {
  if (left === right) return true;
  if (!Array.isArray(left) || !Array.isArray(right)) return false;
  if (left.length !== right.length) return false;

  return left.every(
    (item, index) => getModalItemId(item) === getModalItemId(right[index]),
  );
}

function normalizeUserSelection(item) {
  if (typeof item === "string" || typeof item === "number") {
    const value = String(item);
    return {
      id: value,
      _id: value,
      firstName: value,
      lastName: "",
      email: "",
      title: "",
    };
  }

  const id = getModalItemId(item);
  return {
    ...item,
    id,
    _id: String(item?._id || id),
    firstName: item?.firstName || "",
    lastName: item?.lastName || "",
    email: item?.email || "",
    title: item?.title || item?.role || "",
  };
}

function normalizeWorkstationSelection(item) {
  if (typeof item === "string" || typeof item === "number") {
    const value = String(item);
    return { id: value, _id: value, name: value, workstationName: value };
  }

  const id = getModalItemId(item);
  const name = item?.name || item?.workstationName || item?.hostname || id;
  return {
    ...item,
    id,
    _id: String(item?._id || id),
    name,
    workstationName: name,
    ipAddress: item?.ipAddress || item?.ip_address || "",
    online: Boolean(item?.online || item?.status === "online"),
  };
}

function normalizeFileSelection(item) {
  if (typeof item === "string" || typeof item === "number") {
    const value = String(item);
    return {
      id: value,
      _id: value,
      name: value,
      shareName: value,
      type: "document",
      size: "",
      drive: "",
      description: "",
    };
  }

  const id = getModalItemId(item);
  const name = item?.name || item?.shareName || item?.drive || id;
  return {
    ...item,
    id,
    _id: String(item?._id || id),
    name,
    shareName: name,
    type: item?.type || "document",
    size: item?.size || (item?.drive ? `Drive ${item.drive}` : ""),
    drive: item?.drive || "",
    description: item?.description || "",
  };
}

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
        allUsers: false,
        allWorkstations: false,
        allFiles: false,
      });
    } else {
      setFormData({
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
    }

    setCurrentStep(0);
    setSearchTerms({ users: "", workstations: "", files: "" });

    fetchUsersAll();
    fetchWorkstationsAll();
    fetchFileSharesAll();
  }, [open, groupData, isEditMode, accessToken]);

  useEffect(() => {
    if (!open || allUsers.length === 0) return;

    setFormData((prev) => {
      const nextUsers = reconcileSelectedItems(
        prev.selectedUsers,
        allUsers,
        normalizeUserSelection,
      );

      if (areSelectionsEqual(prev.selectedUsers, nextUsers)) {
        return prev;
      }

      return {
        ...prev,
        selectedUsers: nextUsers,
      };
    });
  }, [open, allUsers]);

  useEffect(() => {
    if (!open || allWorkstations.length === 0) return;

    setFormData((prev) => {
      const nextWorkstations = reconcileSelectedItems(
        prev.selectedWorkstations,
        allWorkstations,
        normalizeWorkstationSelection,
      );

      if (areSelectionsEqual(prev.selectedWorkstations, nextWorkstations)) {
        return prev;
      }

      return {
        ...prev,
        selectedWorkstations: nextWorkstations,
      };
    });
  }, [open, allWorkstations]);

  useEffect(() => {
    if (!open || allFiles.length === 0) return;

    setFormData((prev) => {
      const nextFiles = reconcileSelectedItems(
        prev.selectedFiles,
        allFiles,
        normalizeFileSelection,
      );

      if (areSelectionsEqual(prev.selectedFiles, nextFiles)) {
        return prev;
      }

      return {
        ...prev,
        selectedFiles: nextFiles,
      };
    });
  }, [open, allFiles]);

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
      if (!groupData?._id && !groupData?._id) return;
      await onDelete?.(groupData._id || groupData.id);
    },
    setIsSubmitting,
    onClose,
  });

  const handleImageUpload = createImageUploadHandler(
    setFormData,
    "groupImage",
    { maxWidth: 256, maxHeight: 256 },
  );
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

  const isNextDisabled =
    currentStep === 0 &&
    (!formData.groupName.trim() ||
      !validateGroupName(formData.groupName).valid);

  const submitLabel = isSubmitting
    ? "Saving..."
    : isEditMode
      ? "Save Changes"
      : "Create Group";

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
        <main className="groups-modal-content">
          {isSubmitting ? (
            <SubmittingOverlay
              label={isEditMode ? "Saving changes..." : "Creating group..."}
            />
          ) : (
            renderStepContent()
          )}
        </main>

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
                style={{
                  backgroundColor: "var(--text-primary)",
                  color: "var(--bg-primary)",
                }}
              >
                Next
              </button>
            ) : (
              <button
                className="groups-modal-btn groups-modal-btn-primary"
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
  handleImageUpload,
  fieldErrors = {},
}) {
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
          <span className="groups-modal-field-error">
            {fieldErrors.groupName}
          </span>
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
                  <UploadIcon
                    width={48}
                    height={48}
                    fill="var(--text-tertiary)"
                  />
                </span>
                <span style={{ color: "var(--text-secondary)" }}>
                  Upload Image
                </span>
              </div>
            </label>
          )}
        </div>
      </div>
    </div>
  );
}

BasicInfoStep.propTypes = {
  formData: PropTypes.object.isRequired,
  setFormData: PropTypes.func.isRequired,
  handleImageUpload: PropTypes.func,
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
            <span style={{ fontSize: "0.9rem", color: "var(--text-primary)" }}>
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
              const itemId = getModalItemId(item);
              const isSelected = selectedItems.some(
                (i) => getModalItemId(i) === itemId,
              );
              const rendered = config.renderItem(item);

              return (
                <div
                  key={itemId}
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
              const itemId = getModalItemId(item);
              return (
                <div key={itemId} className="groups-modal-selected-card">
                  <button
                    type="button"
                    className="groups-modal-card-remove-btn"
                    onClick={() => onRemove(itemId)}
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

GroupsModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  groupData: PropTypes.object,
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
