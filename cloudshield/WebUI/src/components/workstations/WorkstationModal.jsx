import React, { useState, useEffect, useMemo } from "react";
import DisplayIcon from "../common/DisplayIcon/DisplayIcon.jsx";
import UploadIcon from "../../assets/ImageUploadIcon.jsx";
import TrashIcon from "../../assets/TrashIcon.jsx";
import Checkbox from "../common/Checkbox/Checkbox.jsx";
import { MOCK_USERS, MOCK_GROUPS, MOCK_SOFTWARE } from "../../data/mockData.js";
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
  const isEditMode = Boolean(workstationData);
  const [currentStep, setCurrentStep] = useState(0);

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

  // Initialize form data
  useEffect(() => {
    if (!open) return;

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
      MOCK_USERS.filter((user) =>
        `${user.firstName} ${user.lastName}`
          .toLowerCase()
          .includes(searchTerms.users.toLowerCase()),
      ),
    [searchTerms.users],
  );

  const filteredGroups = useMemo(
    () =>
      MOCK_GROUPS.filter((group) =>
        group.name.toLowerCase().includes(searchTerms.groups.toLowerCase()),
      ),
    [searchTerms.groups],
  );

  const filteredSoftware = useMemo(
    () =>
      MOCK_SOFTWARE.filter((software) =>
        software.name
          .toLowerCase()
          .includes(searchTerms.software.toLowerCase()),
      ),
    [searchTerms.software],
  );

  // Handlers
  const handleNavigate = (direction) => {
    setCurrentStep((prev) =>
      Math.max(0, Math.min(STEPS.length - 1, prev + direction)),
    );
  };

  const handleSubmit = () => {
    onSubmit?.({
      name: formData.name,
      strength: formData.strength,
      image: formData.workstationImage,
      desktopBackground: formData.desktopBackground,
      groups: formData.selectedGroups,
      users: formData.selectedUsers,
      allUsers: formData.allUsers,
      allGroups: formData.allGroups,
      software: formData.selectedSoftware,
      allSoftware: formData.allSoftware,
      wallpaper: formData.wallpaper,
    });
    onClose();
  };

  const handleImageUpload = (e, field) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData((prev) => ({ ...prev, [field]: reader.result }));
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
          <UsersStep
            searchTerm={searchTerms.users}
            setSearchTerm={(val) =>
              setSearchTerms((prev) => ({ ...prev, users: val }))
            }
            availableUsers={filteredUsers}
            selectedUsers={formData.selectedUsers}
            allUsers={formData.allUsers}
            onToggleUser={(user) => toggleSelection("users", user)}
            onRemoveUser={(id) => removeSelection("users", id)}
            onAllUsersChange={(checked) => {
              if (checked) {
                setFormData((prev) => ({
                  ...prev,
                  allUsers: true,
                  selectedUsers: MOCK_USERS,
                }));
              } else {
                setFormData((prev) => ({
                  ...prev,
                  allUsers: false,
                  selectedUsers: [],
                }));
              }
            }}
          />
        );
      case 2:
        return (
          <GroupsStep
            searchTerm={searchTerms.groups}
            setSearchTerm={(val) =>
              setSearchTerms((prev) => ({ ...prev, groups: val }))
            }
            availableGroups={filteredGroups}
            selectedGroups={formData.selectedGroups}
            allGroups={formData.allGroups}
            onToggleGroup={(group) => toggleSelection("groups", group)}
            onRemoveGroup={(id) => removeSelection("groups", id)}
            onAllGroupsChange={(checked) => {
              if (checked) {
                setFormData((prev) => ({
                  ...prev,
                  allGroups: true,
                  selectedGroups: MOCK_GROUPS,
                }));
              } else {
                setFormData((prev) => ({
                  ...prev,
                  allGroups: false,
                  selectedGroups: [],
                }));
              }
            }}
          />
        );
      case 3:
        return (
          <SoftwareStep
            searchTerm={searchTerms.software}
            setSearchTerm={(val) =>
              setSearchTerms((prev) => ({ ...prev, software: val }))
            }
            availableSoftware={filteredSoftware}
            selectedSoftware={formData.selectedSoftware}
            allSoftware={formData.allSoftware}
            onToggleSoftware={(software) =>
              toggleSelection("software", software)
            }
            onRemoveSoftware={(id) => removeSelection("software", id)}
            onAllSoftwareChange={(checked) => {
              if (checked) {
                setFormData((prev) => ({
                  ...prev,
                  allSoftware: true,
                  selectedSoftware: MOCK_SOFTWARE,
                }));
              } else {
                setFormData((prev) => ({
                  ...prev,
                  allSoftware: false,
                  selectedSoftware: [],
                }));
              }
            }}
          />
        );
      default:
        return null;
    }
  };

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
            {isEditMode && (
              <button
                className="workstation-modal-btn workstation-modal-btn-delete"
                onClick={() => {
                  onDelete?.();
                  onClose();
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
              >
                Next
              </button>
            ) : (
              <button
                className="workstation-modal-btn workstation-modal-btn-primary"
                onClick={handleSubmit}
              >
                {isEditMode ? "Save Changes" : "Create Workstation"}
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
                  color="rgba(255,255,255,0.7)"
                />
              </div>
              <div className="workstation-modal-strength-title">Basic</div>
            </div>
            <p className="workstation-modal-strength-desc">
              Light workloads & everyday tasks
            </p>
            <div className="workstation-modal-strength-specs">
              <div className="workstation-modal-spec">
                <CpuIcon width={16} height={16} color="rgba(255,255,255,0.4)" />
                <span>2 vCPU</span>
              </div>
              <div className="workstation-modal-spec">
                <RamIcon width={16} height={16} color="rgba(255,255,255,0.4)" />
                <span>4 GB</span>
              </div>
              <div className="workstation-modal-spec">
                <StorageIcon
                  width={16}
                  height={16}
                  color="rgba(255,255,255,0.4)"
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
                  color="rgba(255,255,255,0.7)"
                />
              </div>
              <div className="workstation-modal-strength-title">Pro</div>
            </div>
            <p className="workstation-modal-strength-desc">
              Balanced for most workflows
            </p>
            <div className="workstation-modal-strength-specs">
              <div className="workstation-modal-spec">
                <CpuIcon width={16} height={16} color="rgba(255,255,255,0.4)" />
                <span>4 vCPU</span>
              </div>
              <div className="workstation-modal-spec">
                <RamIcon width={16} height={16} color="rgba(255,255,255,0.4)" />
                <span>8 GB</span>
              </div>
              <div className="workstation-modal-spec">
                <StorageIcon
                  width={16}
                  height={16}
                  color="rgba(255,255,255,0.4)"
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
                  color="rgba(255,255,255,0.7)"
                />
              </div>
              <div className="workstation-modal-strength-title">Ultimate</div>
            </div>
            <p className="workstation-modal-strength-desc">
              Maximum power for demanding tasks
            </p>
            <div className="workstation-modal-strength-specs">
              <div className="workstation-modal-spec">
                <CpuIcon width={16} height={16} color="rgba(255,255,255,0.4)" />
                <span>8 vCPU</span>
              </div>
              <div className="workstation-modal-spec">
                <RamIcon width={16} height={16} color="rgba(255,255,255,0.4)" />
                <span>16 GB</span>
              </div>
              <div className="workstation-modal-spec">
                <StorageIcon
                  width={16}
                  height={16}
                  color="rgba(255,255,255,0.4)"
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
                onChange={(e) => handleImageUpload(e, "workstationImage")}
                style={{ display: "none" }}
              />
              <div className="workstation-modal-image-placeholder">
                <span className="workstation-modal-image-icon">
                  <UploadIcon width={48} height={48} fill="#9e9e9e" />
                </span>
                <span>Upload Image</span>
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
                onChange={(e) => handleImageUpload(e, "desktopBackground")}
                style={{ display: "none" }}
              />
              <div className="workstation-modal-image-placeholder">
                <span className="workstation-modal-image-icon">
                  <UploadIcon width={48} height={48} fill="#9e9e9e" />
                </span>
                <span>Upload Background</span>
              </div>
            </label>
          )}
        </div>
      </div>
    </div>
  );
}

function GroupsStep({
  searchTerm,
  setSearchTerm,
  availableGroups,
  selectedGroups,
  allGroups,
  onToggleGroup,
  onRemoveGroup,
  onAllGroupsChange,
}) {
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
            Add Groups
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Checkbox checked={allGroups} onChange={onAllGroupsChange} />
            <span style={{ fontSize: "0.9rem", color: "#ffffff" }}>
              All Groups
            </span>
          </div>
        </div>

        <input
          type="text"
          className="workstation-modal-search"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search groups..."
        />

        {availableGroups.length > 0 && (
          <div className="workstation-modal-dropdown">
            {availableGroups.map((group) => {
              const isSelected = selectedGroups.some((g) => g.id === group.id);
              return (
                <div
                  key={group.id}
                  role="option"
                  tabIndex={0}
                  aria-selected={isSelected}
                  className={`workstation-modal-dropdown-item ${isSelected ? "selected" : ""}`}
                  onClick={() => onToggleGroup(group)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onToggleGroup(group);
                    }
                  }}
                >
                  <DisplayIcon type="group" data={group} size="small" />
                  <div className="workstation-modal-dropdown-item-info">
                    <div className="workstation-modal-dropdown-item-name">
                      {group.name}
                    </div>
                    <div className="workstation-modal-dropdown-item-detail">
                      {group.workstationsCount || 0} workstations
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

      {selectedGroups.length > 0 && (
        <div className="workstation-modal-selected-section">
          <div className="workstation-modal-selected-header">
            Selected Groups ({selectedGroups.length})
          </div>
          <div className="workstation-modal-selected-cards">
            {selectedGroups.map((group) => (
              <div key={group.id} className="workstation-modal-selected-card">
                <button
                  type="button"
                  className="workstation-modal-card-remove-btn"
                  onClick={() => onRemoveGroup(group.id)}
                >
                  ×
                </button>
                <DisplayIcon type="group" data={group} size="small" />
                <span className="workstation-modal-selected-card-name">
                  {group.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function UsersStep({
  searchTerm,
  setSearchTerm,
  availableUsers,
  selectedUsers,
  allUsers,
  onToggleUser,
  onRemoveUser,
  onAllUsersChange,
}) {
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
            Add Users
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Checkbox checked={allUsers} onChange={onAllUsersChange} />
            <span style={{ fontSize: "0.9rem", color: "#ffffff" }}>
              All Users
            </span>
          </div>
        </div>

        <input
          type="text"
          className="workstation-modal-search"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search users..."
        />

        {availableUsers.length > 0 && (
          <div className="workstation-modal-dropdown">
            {availableUsers.map((user) => {
              const isSelected = selectedUsers.some((u) => u.id === user.id);
              return (
                <div
                  key={user.id}
                  role="option"
                  tabIndex={0}
                  aria-selected={isSelected}
                  className={`workstation-modal-dropdown-item ${isSelected ? "selected" : ""}`}
                  onClick={() => onToggleUser(user)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onToggleUser(user);
                    }
                  }}
                >
                  <DisplayIcon type="user" data={user} size="small" />
                  <div className="workstation-modal-dropdown-item-info">
                    <div className="workstation-modal-dropdown-item-name">
                      {user.firstName} {user.lastName}
                    </div>
                    <div className="workstation-modal-dropdown-item-detail">
                      {user.title}
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

      {selectedUsers.length > 0 && (
        <div className="workstation-modal-selected-section">
          <div className="workstation-modal-selected-header">
            Selected Users ({selectedUsers.length})
          </div>
          <div className="workstation-modal-selected-cards">
            {selectedUsers.map((user) => (
              <div key={user.id} className="workstation-modal-selected-card">
                <button
                  type="button"
                  className="workstation-modal-card-remove-btn"
                  onClick={() => onRemoveUser(user.id)}
                >
                  ×
                </button>
                <DisplayIcon type="user" data={user} size="small" />
                <span className="workstation-modal-selected-card-name">
                  {user.firstName} {user.lastName}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SoftwareStep({
  searchTerm,
  setSearchTerm,
  availableSoftware,
  selectedSoftware,
  allSoftware,
  onToggleSoftware,
  onRemoveSoftware,
  onAllSoftwareChange,
}) {
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
            <Checkbox checked={allSoftware} onChange={onAllSoftwareChange} />
            <span style={{ fontSize: "0.9rem", color: "#ffffff" }}>
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

        {availableSoftware.length > 0 && (
          <div className="workstation-modal-dropdown">
            {availableSoftware.map((software) => {
              const isSelected = selectedSoftware.some(
                (s) => s.id === software.id,
              );
              return (
                <div
                  key={software.id}
                  role="option"
                  tabIndex={0}
                  aria-selected={isSelected}
                  className={`workstation-modal-dropdown-item ${isSelected ? "selected" : ""}`}
                  onClick={() => onToggleSoftware(software)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onToggleSoftware(software);
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

      {selectedSoftware.length > 0 && (
        <div className="workstation-modal-selected-section">
          <div className="workstation-modal-selected-header">
            Selected Software ({selectedSoftware.length})
          </div>
          <div className="workstation-modal-selected-cards">
            {selectedSoftware.map((software) => (
              <div
                key={software.id}
                className="workstation-modal-selected-card"
              >
                <button
                  type="button"
                  className="workstation-modal-card-remove-btn"
                  onClick={() => onRemoveSoftware(software.id)}
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
