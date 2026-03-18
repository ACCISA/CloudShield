/**
 * Shared utilities for modals (Groups, Employees, Workstations, etc.)
 */

import { listUsers } from "../services/usersApi.js";
import { apiGet } from "../api/client";

/**
 * Resolves the organization ID from currentUser or localStorage
 * @param {Object} currentUser - The current user object from AuthContext
 * @returns {Promise<string|null>} The org_id or null if unavailable
 */
export const resolveOrgId = async (currentUser) => {
  const fromUser = currentUser?.org_id;
  if (fromUser && fromUser !== "default-org") {
    return fromUser;
  }

  try {
    const fromStorage = localStorage.getItem("org_id");
    if (fromStorage) return fromStorage;
  } catch (e) {
    console.error("Error reading org_id from localStorage:", e);
  }

  return null;
};

/**
 * Fetches file shares for a given org_id
 * @param {string} orgId - The organization ID
 * @param {Function} setAllFiles - State setter function for file shares
 * @param {Function} openToast - Optional toast notification function
 * @returns {Promise<Array>} Array of normalized file shares
 */
export const fetchFileShares = async (
  orgId,
  setAllFiles = null,
  openToast = null,
) => {
  try {
    if (!orgId) {
      if (setAllFiles) setAllFiles([]);
      if (openToast) openToast("Missing org_id for file_shares fetch");
      return [];
    }

    const res = await apiGet(
      `/file_shares?org_id=${encodeURIComponent(orgId)}`,
      {
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      },
    );

    if (!res.ok) {
      if (setAllFiles) setAllFiles([]);
      return [];
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

    if (setAllFiles) setAllFiles(normalized);
    return normalized;
  } catch (e) {
    console.error("Error fetching file shares:", e);
    if (setAllFiles) setAllFiles([]);
    return [];
  }
};

/**
 * Applies empty state to the setter and optionally shows a toast.
 */
const _resetGroups = (setAllGroups, openToast, toastMsg) => {
  setAllGroups?.([]);
  if (toastMsg) openToast?.(toastMsg);
  return [];
};

/**
 * Fetches groups for a given org_id
 * @param {string} orgId - The organization ID
 * @param {string} accessToken - The auth token
 * @param {Function} setAllGroups - State setter function for groups
 * @param {Function} openToast - Optional toast notification function
 * @returns {Promise<Array>} Array of normalized groups
 */
export const fetchGroups = async (
  orgId,
  accessToken,
  setAllGroups = null,
  openToast = null,
) => {
  if (!orgId) return _resetGroups(setAllGroups, openToast, "Missing org_id for groups fetch");
  if (!accessToken) return _resetGroups(setAllGroups);

  try {
    const res = await apiGet(
      `/access-groups?org_id=${encodeURIComponent(orgId)}`,
      {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!res.ok) {
      if (res.status === 404 || res.status === 405) {
        console.warn(`Groups API not available (${res.status})`);
      }
      return _resetGroups(setAllGroups);
    }

    const data = await res.json();
    const groups = Array.isArray(data) ? data : data.access_groups || data.groups || [];

    const normalized = groups.map((g) => ({
      id: String(g.id || g._id || ""),
      _id: String(g._id || g.id || ""),
      name: g.group_name || g.name || "Untitled Group",
      members: Array.isArray(g.members) ? g.members : [],
      users: g.users || [],
      files: g.files || [],
      org_id: g.org_id,
    }));

    setAllGroups?.(normalized);
    return normalized;
  } catch (e) {
    console.error("Error fetching groups:", e);
    return _resetGroups(setAllGroups);
  }
};

/**
 * Safely splits a full name into first and last name parts
 * @param {string} fullName - The full name to split
 * @returns {Object} Object with firstName and lastName properties
 */
export const safeSplitName = (fullName) => {
  const raw = (fullName || "").trim();
  if (!raw) return { firstName: "Unknown", lastName: "" };
  const parts = raw.split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
};

/**
 * Fetches users/employees for a given org
 * @param {string} accessToken - The auth token
 * @param {Function} setAllUsers - State setter function for users
 * @param {Function} openToast - Optional toast notification function
 * @returns {Promise<Array>} Array of normalized users
 */
export const fetchUsers = async (
  accessToken,
  setAllUsers = null,
  openToast = null,
) => {
  try {
    if (!accessToken) {
      if (setAllUsers) setAllUsers([]);
      return [];
    }

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

    const filtered = normalized.filter((u) => u.id);
    if (setAllUsers) setAllUsers(filtered);
    return filtered;
  } catch (e) {
    console.error("Error fetching users:", e);
    if (setAllUsers) setAllUsers([]);
    if (openToast) openToast(e?.message || "Failed to load users");
    return [];
  }
};

/**
 * Applies empty state to the setter and optionally shows a toast.
 */
const _resetWorkstations = (setAllWorkstations, openToast, toastMsg) => {
  setAllWorkstations?.([]);
  if (toastMsg) openToast?.(toastMsg);
  return [];
};

/**
 * Fetches workstations for a given org_id
 * @param {string} orgId - The organization ID
 * @param {string} accessToken - The auth token
 * @param {Function} setAllWorkstations - State setter function for workstations
 * @param {Function} openToast - Optional toast notification function
 * @returns {Promise<Array>} Array of normalized workstations
 */
export const fetchWorkstations = async (
  orgId,
  accessToken,
  setAllWorkstations = null,
  openToast = null,
) => {
  if (!orgId) return _resetWorkstations(setAllWorkstations, openToast, "Missing org_id for workstations fetch");
  if (!accessToken) return _resetWorkstations(setAllWorkstations);

  try {
    const res = await apiGet(
      `/workstations?org_id=${encodeURIComponent(orgId)}`,
    );

    if (!res.ok) {
      if (res.status === 404 || res.status === 405) {
        console.warn(`Workstations API not available (${res.status})`);
      }
      return _resetWorkstations(setAllWorkstations);
    }

    const data = await res.json();
    const workstations = Array.isArray(data)
      ? data
      : data.items || data.workstations || [];

    const normalized = workstations.map((w) => ({
      status:
        (w.status || "").toLowerCase() === "online"
          ? "connected"
          : (w.status || "").toLowerCase() === "offline"
            ? "disconnected"
            : w.status || "disconnected",
      id: String(w.id || w._id || ""),
      _id: String(w._id || w.id || ""),
      name: w.name || "Untitled Workstation",
      online: w.online || w.status === "online" || false,
      ipAddress: w.ip_address || w.ipAddress || "",
      org_id: w.org_id,
    }));

    setAllWorkstations?.(normalized);
    return normalized;
  } catch (e) {
    console.error("Error fetching workstations:", e);
    return _resetWorkstations(setAllWorkstations);
  }
};

/**
 * Applies empty state to the setter and optionally shows a toast.
 */
const _resetSoftware = (setAllSoftware, openToast, toastMsg) => {
  setAllSoftware?.([]);
  if (toastMsg) openToast?.(toastMsg);
  return [];
};

export const fetchSoftware = async (
  orgId,
  accessToken,
  setAllSoftware = null,
  openToast = null,
) => {
  if (!orgId) return _resetSoftware(setAllSoftware, openToast, "Missing org_id for software fetch");
  if (!accessToken) return _resetSoftware(setAllSoftware);

  try {

    const res = await apiGet(
      `/software?org_id=${encodeURIComponent(orgId)}`,
      {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!res.ok) return _resetSoftware(setAllSoftware);

    const data = await res.json();
    const software = Array.isArray(data) ? data : data.software || [];

    const normalized = software.map((s) => ({
      id: String(s.id || s._id || ""),
      _id: String(s._id || s.id || ""),
      name: s.name || "Untitled Software",
      version: s.version || "",
      vendor: s.vendor || "",
    }));

    setAllSoftware?.(normalized);
    return normalized;
  } catch (e) {
    console.error("Error fetching software:", e);
    openToast?.(e?.message || "Failed to load software");
    return _resetSoftware(setAllSoftware);
  }
};

// ============================================================================
// Common Modal Form Handlers
// ============================================================================

/**
 * Creates a handler for image upload that reads the file and updates form state
 * @param {Function} setFormData - State setter for form data
 * @param {string} fieldName - The field name to update (e.g., 'profileImage', 'groupImage')
 * @returns {Function} Event handler for file input change
 */
export const createImageUploadHandler = (
  setFormData,
  fieldName = "profileImage",
) => {
  return (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData((prev) => ({ ...prev, [fieldName]: reader.result }));
    };
    reader.readAsDataURL(file);
  };
};

/**
 * Creates a handler for toggling item selection in modal forms
 * @param {Function} setFormData - State setter for form data
 * @returns {Function} Handler function (type, item) => void
 */
export const createToggleSelectionHandler = (setFormData) => {
  return (type, item) => {
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
};

/**
 * Creates a handler for removing item selection in modal forms
 * @param {Function} setFormData - State setter for form data
 * @returns {Function} Handler function (type, id) => void
 */
export const createRemoveSelectionHandler = (setFormData) => {
  return (type, id) => {
    setFormData((prev) => {
      const key = `selected${type.charAt(0).toUpperCase() + type.slice(1)}`;
      return {
        ...prev,
        [key]: prev[key].filter((i) => i.id !== id),
      };
    });
  };
};

/**
 * Creates a generic filter function for modal data lists
 * Filters items based on search term matching against specified fields
 * @param {Array} items - Array of items to filter
 * @param {string} searchTerm - Search term to filter by
 * @param {Array<string>} searchFields - Array of field names/paths to search in
 * @returns {Array} Filtered items
 */
export const createFilteredItems = (items, searchTerm, searchFields) => {
  const q = searchTerm.trim().toLowerCase();
  if (!q) return items;

  return items.filter((item) =>
    searchFields
      .map((field) => {
        // Support nested fields like "user.name"
        const value = field.split(".").reduce((obj, key) => obj?.[key], item);
        return value;
      })
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q)),
  );
};

/**
 * Creates a step navigation handler for multi-step modals
 * @param {Function} setCurrentStep - State setter for current step
 * @param {number} totalSteps - Total number of steps in the wizard
 * @returns {Function} Handler function (direction: number) => void
 */
export const createNavigationHandler = (setCurrentStep, totalSteps) => {
  return (direction) => {
    setCurrentStep((prev) =>
      Math.max(0, Math.min(totalSteps - 1, prev + direction)),
    );
  };
};

/**
 * Creates a delete handler for modal forms
 * @param {Object} options - Configuration options
 * @param {Function} options.onDelete - The delete callback function
 * @param {Function} options.setIsSubmitting - State setter for submitting state
 * @param {Function} options.onClose - Modal close callback
 * @param {Function} options.onSuccess - Optional success callback
 * @param {Function} options.onError - Optional error callback
 * @returns {Function} Async delete handler
 */
export const createDeleteHandler = ({
  onDelete,
  setIsSubmitting,
  onClose,
  onSuccess,
  onError,
}) => {
  return async () => {
    if (!onDelete) return;

    setIsSubmitting(true);
    try {
      await onDelete();
      if (onSuccess) onSuccess();
      if (onClose) onClose();
    } catch (error) {
      console.error("Delete failed:", error);
      if (onError) onError(error);
    } finally {
      setIsSubmitting(false);
    }
  };
};

/**
 * Creates a handler for "select all" / "deselect all" toggle in modal selection steps
 * Handles three states: none selected, some selected (indeterminate), all selected
 * @param {Function} setFormData - State setter for form data
 * @param {string} type - The type of items being selected (e.g., 'users', 'groups', 'files')
 * @param {Array} allItems - Array of all available items
 * @param {Array} selectedItems - Array of currently selected items
 * @returns {Function} Handler function for select all checkbox
 */
export const createSelectAllHandler = (
  setFormData,
  type,
  allItems,
  selectedItems,
) => {
  return () => {
    const selectedKey = `selected${type.charAt(0).toUpperCase() + type.slice(1)}`;
    const allKey = `all${type.charAt(0).toUpperCase() + type.slice(1)}`;

    const hasSelected = selectedItems.length > 0;
    const allAreSelected = selectedItems.length === allItems.length;

    if (hasSelected && !allAreSelected) {
      // Indeterminate state - deselect all
      setFormData((prev) => ({
        ...prev,
        [allKey]: false,
        [selectedKey]: [],
      }));
    } else if (!hasSelected) {
      // Nothing selected - select all
      setFormData((prev) => ({
        ...prev,
        [allKey]: true,
        [selectedKey]: allItems,
      }));
    } else {
      // All selected - deselect all
      setFormData((prev) => ({
        ...prev,
        [allKey]: false,
        [selectedKey]: [],
      }));
    }
  };
};

/**
 * Creates a renderStepContent function for multi-step modals
 * @param {Object} config - Configuration object
 * @param {Object} config.steps - Step configuration array defining what to render at each step
 * @param {number} config.currentStep - Current step index
 * @param {Object} config.formData - Form data state
 * @param {Function} config.setFormData - Form data state setter
 * @param {Object} config.searchTerms - Search terms state object
 * @param {Function} config.setSearchTerms - Search terms state setter
 * @param {Object} config.filteredData - Object containing filtered data arrays
 * @param {Object} config.allData - Object containing all available data arrays
 * @param {Function} config.toggleSelection - Toggle selection handler
 * @param {Function} config.removeSelection - Remove selection handler
 * @param {React.Component} config.BasicInfoStep - Basic info step component
 * @param {React.Component} config.SelectionStep - Selection step component
 * @returns {Function} Function that returns the current step content
 */
export const createRenderStepContent = ({
  steps,
  currentStep,
  formData,
  setFormData,
  searchTerms,
  setSearchTerms,
  filteredData,
  allData,
  toggleSelection,
  removeSelection,
  BasicInfoStep,
  SelectionStep,
  fieldErrors = {},
}) => {
  return () => {
    const stepConfig = steps[currentStep];
    if (!stepConfig) return null;

    // First step is always BasicInfoStep
    if (currentStep === 0) {
      return (
        <BasicInfoStep
          formData={formData}
          setFormData={setFormData}
          handleImageUpload={stepConfig.handleImageUpload}
          isEditMode={stepConfig.isEditMode}
          fieldErrors={fieldErrors}
        />
      );
    }

    // Other steps are SelectionSteps
    const { type } = stepConfig;
    const capitalizedType = type.charAt(0).toUpperCase() + type.slice(1);
    const selectedKey = `selected${capitalizedType}`;
    const allKey = `all${capitalizedType}`;

    return (
      <SelectionStep
        type={type}
        searchTerm={searchTerms[type]}
        setSearchTerm={(val) =>
          setSearchTerms((prev) => ({ ...prev, [type]: val }))
        }
        filteredItems={filteredData[type]}
        selectedItems={formData[selectedKey]}
        allSelected={formData[allKey]}
        onToggle={(item) => toggleSelection(type, item)}
        onRemove={(id) => removeSelection(type, id)}
        totalItems={allData[type]}
        onAllChange={createSelectAllHandler(
          setFormData,
          type,
          allData[type],
          formData[selectedKey],
        )}
      />
    );
  };
};
