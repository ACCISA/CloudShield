/**
 * Shared utilities for modals (Groups, Employees, Workstations, etc.)
 */

import { compressImage } from "../lib/compressImage.js";
import { listUsers } from "../services/usersApi.js";
import { apiGet } from "../api/client";
import { MOCK_SOFTWARE } from "../data/mockSoftware.js";

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
 * Resolves an access token from context or localStorage.
 * Modal flows often open before AuthContext finishes hydrating.
 */
export const resolveAccessToken = (accessToken = null) => {
  if (accessToken) return accessToken;

  try {
    return localStorage.getItem("jwt") || null;
  } catch (e) {
    console.error("Error reading jwt from localStorage:", e);
    return null;
  }
};

const getModalItemId = (item) => {
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
  const token = resolveAccessToken(accessToken);
  if (!orgId)
    return _resetGroups(
      setAllGroups,
      openToast,
      "Missing org_id for groups fetch",
    );
  if (!token) return _resetGroups(setAllGroups);

  try {
    const res = await apiGet(
      `/access-groups?org_id=${encodeURIComponent(orgId)}`,
      {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
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
    const groups = Array.isArray(data)
      ? data
      : data.access_groups || data.groups || [];

    const normalized = groups.map((g) => ({
      id: String(g.id || g._id || ""),
      _id: String(g._id || g.id || ""),
      name: g.group_name || g.name || "Untitled Group",
      members: Array.isArray(g.members) ? g.members : [],
      memberCount:
        typeof g.member_count === "number"
          ? g.member_count
          : Array.isArray(g.members_info)
            ? g.members_info.length
            : Array.isArray(g.members)
              ? g.members.length
              : 0,
      users: g.users || [],
      description: g.description || "",
      group_image: g.group_image || null,
      workstations: Array.isArray(g.workstations) ? g.workstations : [],
      file_shares: Array.isArray(g.file_shares) ? g.file_shares : [],
      members_info: Array.isArray(g.members_info) ? g.members_info : [],
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
    const token = resolveAccessToken(accessToken);
    if (!token) {
      if (setAllUsers) setAllUsers([]);
      return [];
    }

    const data = await listUsers({
      token,
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
  const token = resolveAccessToken(accessToken);
  if (!orgId)
    return _resetWorkstations(
      setAllWorkstations,
      openToast,
      "Missing org_id for workstations fetch",
    );
  if (!token) return _resetWorkstations(setAllWorkstations);

  try {
    const allUsers = await fetchUsers(token);
    const userMap = new Map(
      (Array.isArray(allUsers) ? allUsers : []).map((user) => [
        String(user.id || user._id || ""),
        user,
      ]),
    );

    const requestOptions = {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    };
    const workstationPaths = [
      `/workstations/templates?org_id=${encodeURIComponent(orgId)}`,
      `/workstations?org_id=${encodeURIComponent(orgId)}`,
    ];

    let data = null;
    let source = "template";

    for (const path of workstationPaths) {
      try {
        const res = await apiGet(path, requestOptions);

        if (!res.ok) {
          if (res.status === 404 || res.status === 405) continue;
          return _resetWorkstations(setAllWorkstations);
        }

        data = await res.json();
        source = path.startsWith("/workstations/templates")
          ? "template"
          : "workstation";
        break;
      } catch (error) {
        if (error?.status === 404 || error?.status === 405) continue;
        throw error;
      }
    }

    if (!data) {
      return _resetWorkstations(setAllWorkstations);
    }

    const workstations = Array.isArray(data)
      ? data
      : data.templates || data.items || data.workstations || [];


    const normalized = workstations.map((w) => {
      const id = String(w.id || w._id || w.template_id || "");
      const members = Array.isArray(w.members)
        ? w.members
        : Array.isArray(w.users)
          ? w.users
          : [];
      const memberIds = members
        .map((member) => getModalItemId(member))
        .filter(Boolean);
      const groups = Array.isArray(w.access_groups || w.groups)
        ? (w.access_groups || w.groups).map((group) => {
            if (typeof group === "string") {
              return { id: group, _id: group, name: group };
            }

            return {
              ...group,
              id: String(
                group?.id || group?._id || group?.name || group?.group_name || "",
              ),
              _id: String(
                group?._id || group?.id || group?.name || group?.group_name || "",
              ),
              name: group?.group_name || group?.name || "Untitled Group",
              memberCount:
                typeof group?.member_count === "number"
                  ? group.member_count
                  : Array.isArray(group?.members)
                    ? group.members.length
                    : 0,
            };
          })
        : [];
      const software = Array.isArray(w.software)
        ? w.software.map((item) => {
            if (typeof item === "string") {
              return { id: item, _id: item, name: item };
            }

            return {
              ...item,
              id: String(item?.id || item?._id || item?.name || ""),
              _id: String(item?._id || item?.id || item?.name || ""),
              name: item?.name || "Untitled Software",
            };
          })
        : [];
      const normalizedStatus = String(w.status || "").toLowerCase();
      const status = ["online", "active"].includes(normalizedStatus)
        ? "connected"
        : ["offline", "inactive"].includes(normalizedStatus)
          ? "disconnected"
          : normalizedStatus
            ? normalizedStatus
            : w.is_ready === false
              ? "provisioning"
              : w.is_ready === true
                ? "connected"
                : "disconnected";
      const resolvedUsers = memberIds
        .map((memberId) => userMap.get(String(memberId)))
        .filter(Boolean);

      return {
        members: memberIds,
        source,
        status,
        id,
        _id: String(w._id || w.id || w.template_id || ""),
        name: w.name || "Untitled Workstation",
        code: w.code || (id ? `WS-${id.slice(-4).toUpperCase()}` : "WS"),
        strength: w.description || "",
        description: w.description || "",
        software,
        groups,
        users: resolvedUsers,
        usersCount: memberIds.length,
        currentUser: resolvedUsers[0] || null,
        lastUsed: w.last_used || w.lastUsed || w.updated_at || "—",
        online:
          w.online || ["connected", "active", "online"].includes(status),
        ipAddress: w.ip_address || w.ipAddress || w.ipv4_address || "",
        org_id: w.org_id,
        isReady: w.is_ready,
      };
    });

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

const _normalizeSoftware = (software) =>
  software.map((s) => ({
    id: String(s.id || s._id || ""),
    _id: String(s._id || s.id || ""),
    name: s.name || "Untitled Software",
    version: s.version || "",
    vendor: s.vendor || "",
    picture: s.picture || s.image || "",
    category: s.category || s.vendor || "",
    icon: s.icon,
  }));

const _useMockSoftware = (setAllSoftware) => {
  const normalized = _normalizeSoftware(MOCK_SOFTWARE);
  setAllSoftware?.(normalized);
  return normalized;
};

export const fetchSoftware = async (
  orgId,
  accessToken,
  setAllSoftware = null,
  openToast = null,
) => {
  const token = resolveAccessToken(accessToken);
  if (!orgId)
    return _resetSoftware(
      setAllSoftware,
      openToast,
      "Missing org_id for software fetch",
    );
  if (!token) return _resetSoftware(setAllSoftware);

  try {
    const res = await apiGet(`/software?org_id=${encodeURIComponent(orgId)}`, {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) return _useMockSoftware(setAllSoftware);

    const data = await res.json();
    const software = Array.isArray(data) ? data : data.software || [];

    if (!software.length) return _useMockSoftware(setAllSoftware);

    const normalized = _normalizeSoftware(software);

    setAllSoftware?.(normalized);
    return normalized;
  } catch (e) {
    if (e?.status !== 404 && e?.status !== 405) {
      console.error("Error fetching software:", e);
    }
    return _useMockSoftware(setAllSoftware);
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
  compressOptions = {},
) => {
  return async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const dataUrl = await compressImage(file, compressOptions);
      setFormData((prev) => ({ ...prev, [fieldName]: dataUrl }));
    } catch {
      // Fallback: read as-is if compression fails
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({ ...prev, [fieldName]: reader.result }));
      };
      reader.readAsDataURL(file);
    }
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
      const selected = Array.isArray(prev[key]) ? prev[key] : [];
      const itemId = getModalItemId(item);
      const isSelected = selected.some((i) => getModalItemId(i) === itemId);

      return {
        ...prev,
        [key]: isSelected
          ? selected.filter((i) => getModalItemId(i) !== itemId)
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
      const targetId = getModalItemId(id);
      return {
        ...prev,
        [key]: (Array.isArray(prev[key]) ? prev[key] : []).filter(
          (i) => getModalItemId(i) !== targetId,
        ),
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
