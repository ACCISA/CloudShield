import React, { useState, useEffect, useMemo } from "react";
import PropTypes from "prop-types";
import DisplayIcon from "../common/DisplayIcon/DisplayIcon.jsx";
import UploadIcon from "../../assets/ImageUploadIcon.jsx";
import TrashIcon from "../../assets/TrashIcon.jsx";
import Checkbox from "../common/Checkbox/Checkbox.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import {
  resolveOrgId,
  fetchUsers,
  fetchGroups,
  fetchSoftware,
  createImageUploadHandler,
  createToggleSelectionHandler,
  createRemoveSelectionHandler,
  createFilteredItems,
  createNavigationHandler,
  createDeleteHandler,
  createRenderStepContent,
} from "../../utils/modalHelpers.jsx";
import {
  CpuIcon,
  RamIcon,
  StorageIcon,
  BasicTierIcon,
  ProTierIcon,
  UltimateTierIcon,
} from "../../assets/workstation";
import "./WorkstationModal.css";

const STEPS = ["Basic Info", "Users", "Groups", "Software"];

/**
 * WorkstationModal - Multi-step wizard for creating/editing workstations
 */
export default function WorkstationModal({
  open,
  onClose,
  workstationData = null,
  onSubmit,
  onDelete,
}) {
  const { accessToken, currentUser } = useAuth();
  const isEditMode = Boolean(workstationData);
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Available options (fetched)
  const [allUsers, setAllUsers] = useState([]);
  const [allGroups, setAllGroups] = useState([]);
  const [allSoftware, setAllSoftware] = useState([]); // Replace with fetch if needed

  // Form Data
  const [formData, setFormData] = useState({
    name: "",
    strength: "basic",
    workstationImage: null,
    desktopBackground: null,
    selectedGroups: [],
    selectedUsers: [],
    allUsers: false,
    allGroups: false,
    selectedSoftware: [],
    allSoftware: false,
    wallpaper: null,
  });

  // Search State
  const [searchTerms, setSearchTerms] = useState({
    groups: "",
    users: "",
    software: "",
  });

  const openToast = (msg) => {
    console.warn(msg);
  };

  // --- USERS ---
  const fetchUsersAll = async () => {
    await fetchUsers(accessToken, setAllUsers, openToast);
  };

  // --- GROUPS ---
  const fetchGroupsAll = async () => {
    const orgId = await resolveOrgId(currentUser);
    await fetchGroups(orgId, accessToken, setAllGroups, openToast);
  };

  const fetchSoftwareAll = async () => {
    const orgId = await resolveOrgId(currentUser);
    await fetchSoftware(orgId, accessToken, setAllSoftware, openToast);
  };

  // Initialize form data and fetch users and groups
  useEffect(() => {
    if (!open) return;

    fetchUsersAll();
    fetchGroupsAll();
    fetchSoftwareAll();
    if (isEditMode && workstationData) {
      setFormData({
        name: workstationData.name || "",
        strength: workstationData.strength || "basic",
        workstationImage: workstationData.image || null,
        desktopBackground: workstationData.desktopBackground || null,
        selectedGroups: workstationData.groups || [],
        selectedUsers: workstationData.users || [],
        allUsers: workstationData.allUsers || false,
        allGroups: workstationData.allGroups || false,
        selectedSoftware: workstationData.software || [],
        allSoftware: workstationData.allSoftware || false,
        wallpaper: workstationData.wallpaper || null,
      });
    } else {
      setFormData({
        name: "",
        strength: "basic",
        workstationImage: null,
        desktopBackground: null,
        selectedGroups: [],
        selectedUsers: [],
        allUsers: false,
        allGroups: false,
        selectedSoftware: [],
        allSoftware: false,
        wallpaper: null,
      });
    }

    setCurrentStep(0);
    setSearchTerms({ groups: "", users: "", software: "" });
  }, [open, workstationData, isEditMode]);

  // Filter lists
  const filteredUsers = useMemo(
    () =>
      createFilteredItems(allUsers, searchTerms.users, [
        "firstName",
        "lastName",
        "email",
      ]),
    [allUsers, searchTerms.users],
  );

  const filteredGroups = useMemo(
    () => createFilteredItems(allGroups, searchTerms.groups, ["name"]),
    [allGroups, searchTerms.groups],
  );

  const filteredSoftware = useMemo(
    () => createFilteredItems(allSoftware, searchTerms.software, ["name"]),
    [allSoftware, searchTerms.software],
  );

  // Handlers
  const handleNavigate = createNavigationHandler(setCurrentStep, STEPS.length);

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onSubmit?.({
        name: formData.name,
        description: formData.strength,
        image: formData.workstationImage,
        desktopBackground: formData.desktopBackground,
        access_groups: formData.selectedGroups,
        members: formData.selectedUsers,
        allUsers: formData.allUsers,
        allGroups: formData.allGroups,
        software: formData.selectedSoftware,
        allSoftware: formData.allSoftware,
        wallpaper: formData.wallpaper,
      });
      onClose();
    } catch (error) {
      console.error("Failed to submit workstation:", error);
    } finally {
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

  const handleWorkstationImageUpload = createImageUploadHandler(
    setFormData,
    "workstationImage",
  );
  const handleDesktopBackgroundUpload = createImageUploadHandler(
    setFormData,
    "desktopBackground",
  );
  const toggleSelection = createToggleSelectionHandler(setFormData);
  const removeSelection = createRemoveSelectionHandler(setFormData);

  const progressPercent = ((currentStep + 1) / STEPS.length) * 100;

  if (!open) return null;

  // Create a generic SelectionStep wrapper for workstation-specific styling
  const WorkstationSelectionStep = ({ type, ...props }) => {
    if (type === "software") {
      return <SoftwareStep {...props} />;
    }
    return <GenericSelectionStep type={type} {...props} />;
  };

  // Render Step Content using shared factory
  const renderStepContent = createRenderStepContent({
    steps: [
      {
        handleImageUpload: {
          workstationImage: handleWorkstationImageUpload,
          desktopBackground: handleDesktopBackgroundUpload,
        },
        isEditMode,
      },
      { type: "users" },
      { type: "groups" },
      { type: "software" },
    ],
    currentStep,
    formData,
    setFormData,
    searchTerms,
    setSearchTerms,
    filteredData: {
      users: filteredUsers,
      groups: filteredGroups,
      software: filteredSoftware,
    },
    allData: {
      users: allUsers,
      groups: allGroups,
      software: allSoftware,
    },
    toggleSelection,
    removeSelection,
    BasicInfoStep,
    SelectionStep: WorkstationSelectionStep,
  });

  const isNextDisabled = currentStep === 0 && !formData.name.trim();

  return (
    <div className="workstation-modal-overlay">
      <div className="workstation-modal-dialog">
        {/* Header */}
        <header className="workstation-modal-header">
          <nav className="workstation-modal-breadcrumb">
            <span className="workstation-modal-breadcrumb-item inactive">
              Workstations
            </span>
            <span className="workstation-modal-breadcrumb-separator">›</span>
            <span className="workstation-modal-breadcrumb-item active">
              {isEditMode ? "Edit Workstation" : "New Workstation"}
            </span>
          </nav>
          <button
            className="workstation-modal-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </header>

        {/* Progress Bar */}
        <div className="workstation-modal-stepper">
          <div className="workstation-modal-progress-track">
            <div
              className="workstation-modal-progress-fill"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="workstation-modal-step-labels">
            {STEPS.map((step, index) => (
              <div
                key={step}
                className={`workstation-modal-step-label ${
                  index === currentStep ? "active" : ""
                } ${index < currentStep ? "completed" : ""}`}
              >
                {step}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <main className="workstation-modal-content">{renderStepContent()}</main>

        {/* Footer */}
        <footer className="workstation-modal-actions">
          <div className="workstation-modal-actions-left">
            <button
              className="workstation-modal-btn workstation-modal-btn-cancel"
              onClick={onClose}
            >
              Cancel
            </button>
            {isEditMode && currentStep === 0 && (
              <button
                className="workstation-modal-btn workstation-modal-btn-delete"
                onClick={() => {
                  if (
                    window.confirm(
                      "Are you sure you want to delete this workstation? This action cannot be undone.",
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
          <div className="workstation-modal-actions-right">
            <button
              className="workstation-modal-btn workstation-modal-btn-secondary"
              onClick={() => handleNavigate(-1)}
              disabled={currentStep === 0}
            >
              Back
            </button>
            {currentStep < STEPS.length - 1 ? (
              <button
                className="workstation-modal-btn workstation-modal-btn-primary"
                onClick={() => handleNavigate(1)}
                disabled={isNextDisabled}
                style={{ backgroundColor: "var(--text-primary)", color: "var(--bg-primary)" }}
              >
                Next
              </button>
            ) : (
              <button
                className="workstation-modal-btn workstation-modal-btn-primary"
                onClick={handleSubmit}
                disabled={isSubmitting}
                style={{ backgroundColor: "var(--text-primary)", color: "var(--bg-primary)" }}
              >
                {isSubmitting
                  ? "Saving..."
                  : isEditMode
                    ? "Save Changes"
                    : "Create Workstation"}
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}

const modalItemShape = PropTypes.shape({
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  _id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  name: PropTypes.string,
  firstName: PropTypes.string,
  lastName: PropTypes.string,
  email: PropTypes.string,
  title: PropTypes.string,
  members: PropTypes.oneOfType([PropTypes.array, PropTypes.number]),
  category: PropTypes.string,
  icon: PropTypes.node,
});

const workstationDataShape = PropTypes.shape({
  name: PropTypes.string,
  strength: PropTypes.string,
  image: PropTypes.string,
  desktopBackground: PropTypes.string,
  groups: PropTypes.arrayOf(modalItemShape),
  users: PropTypes.arrayOf(modalItemShape),
  software: PropTypes.arrayOf(modalItemShape),
  allUsers: PropTypes.bool,
  allGroups: PropTypes.bool,
  allSoftware: PropTypes.bool,
  wallpaper: PropTypes.string,
});

WorkstationModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  workstationData: workstationDataShape,
  onSubmit: PropTypes.func,
  onDelete: PropTypes.func,
};

// Sub-components
function BasicInfoStep({ formData, setFormData, handleImageUpload }) {
  // Extract the handlers if it's an object (WorkstationModal case)
  const workstationImageHandler =
    typeof handleImageUpload === "object"
      ? handleImageUpload.workstationImage
      : handleImageUpload;
  const desktopBackgroundHandler =
    typeof handleImageUpload === "object"
      ? handleImageUpload.desktopBackground
      : handleImageUpload;

  return (
    <div className="workstation-modal-step workstation-modal-step-scrollable">
      <div className="workstation-modal-form-group">
        <label className="workstation-modal-label">Workstation Name *</label>
        <input
          type="text"
          className="workstation-modal-input"
          value={formData.name}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, name: e.target.value }))
          }
          placeholder="Enter workstation name"
        />
      </div>

      <div className="workstation-modal-form-group">
        <label className="workstation-modal-label">
          Workstation Strength *
        </label>
        <div className="workstation-modal-strength-selector">
          {/* Basic Tier */}
          <button
            type="button"
            className={`workstation-modal-strength-card ${formData.strength === "basic" ? "active" : ""}`}
            onClick={() =>
              setFormData((prev) => ({ ...prev, strength: "basic" }))
            }
          >
            <div className="workstation-modal-strength-header">
              <div className="workstation-modal-strength-icon">
                <BasicTierIcon
                  width={28}
                  height={28}
                  color="var(--text-secondary)"
                />
              </div>
              <div className="workstation-modal-strength-title">Basic</div>
            </div>
            <p className="workstation-modal-strength-desc">
              Light workloads & everyday tasks
            </p>
            <div className="workstation-modal-strength-specs">
              <div className="workstation-modal-spec">
                <CpuIcon width={16} height={16} color="var(--text-tertiary)" />
                <span>2 vCPU</span>
              </div>
              <div className="workstation-modal-spec">
                <RamIcon width={16} height={16} color="var(--text-tertiary)" />
                <span>4 GB</span>
              </div>
              <div className="workstation-modal-spec">
                <StorageIcon
                  width={16}
                  height={16}
                  color="var(--text-tertiary)"
                />
                <span>50 GB</span>
              </div>
            </div>
          </button>

          {/* Pro Tier */}
          <button
            type="button"
            className={`workstation-modal-strength-card ${formData.strength === "pro" ? "active" : ""}`}
            onClick={() =>
              setFormData((prev) => ({ ...prev, strength: "pro" }))
            }
          >
            <div className="workstation-modal-strength-header">
              <div className="workstation-modal-strength-icon">
                <ProTierIcon
                  width={28}
                  height={28}
                  color="var(--text-secondary)"
                />
              </div>
              <div className="workstation-modal-strength-title">Pro</div>
            </div>
            <p className="workstation-modal-strength-desc">
              Balanced for most workflows
            </p>
            <div className="workstation-modal-strength-specs">
              <div className="workstation-modal-spec">
                <CpuIcon width={16} height={16} color="var(--text-tertiary)" />
                <span>4 vCPU</span>
              </div>
              <div className="workstation-modal-spec">
                <RamIcon width={16} height={16} color="var(--text-tertiary)" />
                <span>8 GB</span>
              </div>
              <div className="workstation-modal-spec">
                <StorageIcon
                  width={16}
                  height={16}
                  color="var(--text-tertiary)"
                />
                <span>100 GB</span>
              </div>
            </div>
          </button>

          {/* Ultimate Tier */}
          <button
            type="button"
            className={`workstation-modal-strength-card ${formData.strength === "ultimate" ? "active" : ""}`}
            onClick={() =>
              setFormData((prev) => ({ ...prev, strength: "ultimate" }))
            }
          >
            <div className="workstation-modal-strength-header">
              <div className="workstation-modal-strength-icon">
                <UltimateTierIcon
                  width={28}
                  height={28}
                  color="var(--text-secondary)"
                />
              </div>
              <div className="workstation-modal-strength-title">Ultimate</div>
            </div>
            <p className="workstation-modal-strength-desc">
              Maximum power for demanding tasks
            </p>
            <div className="workstation-modal-strength-specs">
              <div className="workstation-modal-spec">
                <CpuIcon width={16} height={16} color="var(--text-tertiary)" />
                <span>8 vCPU</span>
              </div>
              <div className="workstation-modal-spec">
                <RamIcon width={16} height={16} color="var(--text-tertiary)" />
                <span>16 GB</span>
              </div>
              <div className="workstation-modal-spec">
                <StorageIcon
                  width={16}
                  height={16}
                  color="var(--text-tertiary)"
                />
                <span>200 GB</span>
              </div>
            </div>
          </button>
        </div>
      </div>

      <div className="workstation-modal-form-group">
        <label className="workstation-modal-label">Workstation Icon</label>
        <div className="workstation-modal-image-upload">
          {formData.workstationImage ? (
            <div className="workstation-modal-image-preview">
              <img src={formData.workstationImage} alt="Workstation icon" />
              <button
                type="button"
                className="workstation-modal-image-remove"
                onClick={() =>
                  setFormData((prev) => ({ ...prev, workstationImage: null }))
                }
              >
                ×
              </button>
            </div>
          ) : (
            <label className="workstation-modal-image-upload-label">
              <input
                type="file"
                accept="image/*"
                onChange={workstationImageHandler}
                style={{ display: "none" }}
              />
              <div className="workstation-modal-image-placeholder">
                <span className="workstation-modal-image-icon">
                  <UploadIcon width={48} height={48} fill="var(--text-tertiary)" />
                </span>
                <span style={{color: "var(--text-secondary)"}}>Upload Image</span>
              </div>
            </label>
          )}
        </div>
      </div>

      <div className="workstation-modal-form-group">
        <label className="workstation-modal-label">Desktop Background</label>
        <div className="workstation-modal-image-upload">
          {formData.desktopBackground ? (
            <div className="workstation-modal-image-preview">
              <img src={formData.desktopBackground} alt="Desktop background" />
              <button
                type="button"
                className="workstation-modal-image-remove"
                onClick={() =>
                  setFormData((prev) => ({ ...prev, desktopBackground: null }))
                }
              >
                ×
              </button>
            </div>
          ) : (
            <label className="workstation-modal-image-upload-label">
              <input
                type="file"
                accept="image/*"
                onChange={desktopBackgroundHandler}
                style={{ display: "none" }}
              />
              <div className="workstation-modal-image-placeholder">
                <span className="workstation-modal-image-icon">
                  <UploadIcon width={48} height={48} fill="var(--text-tertiary)" />
                </span>
                <span style={{color: "var(--text-secondary)"}}>Upload Background</span>
              </div>
            </label>
          )}
        </div>
      </div>
    </div>
  );
}

// Generic selection step for users/groups (used by createRenderStepContent)
BasicInfoStep.propTypes = {
  formData: PropTypes.object.isRequired,
  setFormData: PropTypes.func.isRequired,
  handleImageUpload: PropTypes.oneOfType([PropTypes.func, PropTypes.object]),
};

function GenericSelectionStep({
  type,
  searchTerm,
  setSearchTerm,
  filteredItems,
  selectedItems,
  allSelected,
  onToggle,
  onRemove,
  totalItems,
  onAllChange,
}) {
  const hasSelected = selectedItems.length > 0;
  const allAreSelected =
    selectedItems.length === totalItems.length && totalItems.length > 0;
  const isIndeterminate = hasSelected && !allAreSelected;

  const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);
  const singularType = type.endsWith("s") ? type.slice(0, -1) : type;

  const renderItem = (item) => {
    if (type === "users") {
      return (
        <>
          <DisplayIcon type="user" data={item} size="small" />
          <div className="workstation-modal-dropdown-item-info">
            <div className="workstation-modal-dropdown-item-name">
              {item.firstName} {item.lastName}
            </div>
            <div className="workstation-modal-dropdown-item-detail">
              {item.title}
            </div>
          </div>
        </>
      );
    } else if (type === "groups") {
      return (
        <>
          <DisplayIcon type="group" data={item} size="small" />
          <div className="workstation-modal-dropdown-item-info">
            <div className="workstation-modal-dropdown-item-name">
              {item.name}
            </div>
            <div className="workstation-modal-dropdown-item-detail">
              {item.members || 0} members
            </div>
          </div>
        </>
      );
    }
    return null;
  };

  const renderSelectedCard = (item) => {
    if (type === "users") {
      return (
        <>
          <DisplayIcon type="user" data={item} size="small" />
          <span className="workstation-modal-selected-card-name">
            {item.firstName} {item.lastName}
          </span>
        </>
      );
    } else if (type === "groups") {
      return (
        <>
          <DisplayIcon type="group" data={item} size="small" />
          <span className="workstation-modal-selected-card-name">
            {item.name}
          </span>
        </>
      );
    }
    return null;
  };

  return (
    <div className="workstation-modal-step">
      <div className="workstation-modal-search-section">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "8px",
          }}
        >
          <label
            className="workstation-modal-label"
            style={{ marginBottom: 0 }}
          >
            Add {typeLabel}
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Checkbox
              checked={allAreSelected}
              indeterminate={isIndeterminate}
              onChange={onAllChange}
            />
            <span style={{ fontSize: "0.9rem", color: "var(--text-primary)" }}>
              All {typeLabel}
            </span>
          </div>
        </div>

        <input
          type="text"
          className="workstation-modal-search"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={`Search ${type}...`}
        />

        {filteredItems.length > 0 && (
          <div className="workstation-modal-dropdown">
            {filteredItems.map((item) => {
              const isSelected = selectedItems.some((i) => i.id === item.id);
              return (
                <div
                  key={item.id}
                  role="option"
                  tabIndex={0}
                  aria-selected={isSelected}
                  className={`workstation-modal-dropdown-item ${isSelected ? "selected" : ""}`}
                  onClick={() => onToggle(item)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onToggle(item);
                    }
                  }}
                >
                  {renderItem(item)}
                  {isSelected && (
                    <span className="workstation-modal-checkmark">✓</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedItems.length > 0 && (
        <div className="workstation-modal-selected-section">
          <div className="workstation-modal-selected-header">
            Selected {typeLabel} ({selectedItems.length})
          </div>
          <div className="workstation-modal-selected-cards">
            {selectedItems.map((item) => (
              <div key={item.id} className="workstation-modal-selected-card">
                <button
                  type="button"
                  className="workstation-modal-card-remove-btn"
                  onClick={() => onRemove(item.id)}
                >
                  ×
                </button>
                {renderSelectedCard(item)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

GenericSelectionStep.propTypes = {
  type: PropTypes.string.isRequired,
  searchTerm: PropTypes.string.isRequired,
  setSearchTerm: PropTypes.func.isRequired,
  filteredItems: PropTypes.arrayOf(modalItemShape).isRequired,
  selectedItems: PropTypes.arrayOf(modalItemShape).isRequired,
  allSelected: PropTypes.bool,
  onToggle: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
  totalItems: PropTypes.array.isRequired,
  onAllChange: PropTypes.func.isRequired,
};

function SoftwareStep({
  searchTerm,
  setSearchTerm,
  filteredItems,
  selectedItems,
  allSelected,
  onToggle,
  onRemove,
  totalItems,
  onAllChange,
}) {
  const hasSelected = selectedItems.length > 0;
  const allAreSelected =
    selectedItems.length === totalItems.length && totalItems.length > 0;
  const isIndeterminate = hasSelected && !allAreSelected;

  return (
    <div className="workstation-modal-step">
      <div className="workstation-modal-search-section">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "8px",
          }}
        >
          <label
            className="workstation-modal-label"
            style={{ marginBottom: 0 }}
          >
            Add Software
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Checkbox
              checked={allAreSelected}
              indeterminate={isIndeterminate}
              onChange={onAllChange}
            />
            <span style={{ fontSize: "0.9rem", color: "var(--text-primary)" }}>
              All Software
            </span>
          </div>
        </div>

        <input
          type="text"
          className="workstation-modal-search"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search software..."
        />

        {filteredItems.length > 0 && (
          <div className="workstation-modal-dropdown">
            {filteredItems.map((software) => {
              const isSelected = selectedItems.some(
                (s) => s.id === software.id,
              );
              return (
                <div
                  key={software.id}
                  role="option"
                  tabIndex={0}
                  aria-selected={isSelected}
                  className={`workstation-modal-dropdown-item ${isSelected ? "selected" : ""}`}
                  onClick={() => onToggle(software)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onToggle(software);
                    }
                  }}
                >
                  <div className="workstation-modal-dropdown-item-icon">
                    {software.icon}
                  </div>
                  <div className="workstation-modal-dropdown-item-info">
                    <div className="workstation-modal-dropdown-item-name">
                      {software.name}
                    </div>
                    <div className="workstation-modal-dropdown-item-detail">
                      {software.category}
                    </div>
                  </div>
                  {isSelected && (
                    <span className="workstation-modal-checkmark">✓</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedItems.length > 0 && (
        <div className="workstation-modal-selected-section">
          <div className="workstation-modal-selected-header">
            Selected Software ({selectedItems.length})
          </div>
          <div className="workstation-modal-selected-cards">
            {selectedItems.map((software) => (
              <div
                key={software.id}
                className="workstation-modal-selected-card"
              >
                <button
                  type="button"
                  className="workstation-modal-card-remove-btn"
                  onClick={() => onRemove(software.id)}
                >
                  ×
                </button>
                <div className="workstation-modal-selected-card-icon">
                  {software.icon}
                </div>
                <span className="workstation-modal-selected-card-name">
                  {software.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

SoftwareStep.propTypes = {
  searchTerm: PropTypes.string.isRequired,
  setSearchTerm: PropTypes.func.isRequired,
  filteredItems: PropTypes.arrayOf(modalItemShape).isRequired,
  selectedItems: PropTypes.arrayOf(modalItemShape).isRequired,
  allSelected: PropTypes.bool,
  onToggle: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
  totalItems: PropTypes.array.isRequired,
  onAllChange: PropTypes.func.isRequired,
};
