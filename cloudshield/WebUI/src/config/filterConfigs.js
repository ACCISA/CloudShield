/**
 * Filter configurations for different pages
 * Each page can have its own set of filter groups
 */

// Helper function to create a filter with common structure
const createFilter = (id, label, options, type = "checkbox") => ({
  id,
  label,
  type,
  options,
});

// Reusable filter option sets
const STATUS_OPTIONS = {
  workstation: [
    { value: "connected", label: "Connected" },
    { value: "disconnected", label: "Disconnected" },
    { value: "busy", label: "Busy" },
  ],
  user: [
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
    { value: "suspended", label: "Suspended" },
  ],
  security: [
    { value: "unresolved", label: "Unresolved" },
    { value: "resolved", label: "Resolved" },
  ],
};

const SIZE_OPTIONS = {
  group: [
    { value: "small", label: "Small (1-10)" },
    { value: "medium", label: "Medium (11-50)" },
    { value: "large", label: "Large (51+)" },
  ],
  file: [
    { value: "small", label: "Small (<1MB)" },
    { value: "medium", label: "Medium (1-10MB)" },
    { value: "large", label: "Large (10-100MB)" },
    { value: "xlarge", label: "Very Large (>100MB)" },
  ],
};

const TYPE_OPTIONS = {
  group: [
    { value: "department", label: "Department" },
    { value: "team", label: "Team" },
    { value: "project", label: "Project" },
  ],
  file: [
    { value: "document", label: "Documents" },
    { value: "image", label: "Images" },
    { value: "video", label: "Videos" },
    { value: "archive", label: "Archives" },
    { value: "other", label: "Other" },
  ],
  security: [
    { value: "Security breach", label: "Security Breach" },
    { value: "Suspicious activity", label: "Suspicious Activity" },
    { value: "Policy violation", label: "Policy Violation" },
    { value: "Data access", label: "Data Access" },
  ],
};

const ASSIGNMENT_OPTIONS = {
  user: [
    { value: "hasWorkstations", label: "Has workstations" },
    { value: "hasGroups", label: "In groups" },
    { value: "hasFiles", label: "Has files" },
  ],
  group: [
    { value: "hasWorkstations", label: "Has workstations" },
    { value: "hasFiles", label: "Has files" },
  ],
};

// Exported filter configurations
export const WORKSTATION_FILTERS = [
  createFilter("status", "Status", STATUS_OPTIONS.workstation),
  createFilter("hasUsers", "Users", [
    { value: "activeUsers", label: "Active users", type: "toggle" },
  ]),
];

export const USER_FILTERS = [
  createFilter("status", "Status", STATUS_OPTIONS.user),
  createFilter("role", "Role", [
    { value: "admin", label: "Administrator" },
    { value: "manager", label: "Manager" },
    { value: "user", label: "User" },
  ]),
  createFilter("assignments", "Assignments", ASSIGNMENT_OPTIONS.user),
];

export const GROUP_FILTERS = [
  createFilter("type", "Type", TYPE_OPTIONS.group),
  createFilter("size", "Size", SIZE_OPTIONS.group),
  createFilter("assignments", "Assignments", ASSIGNMENT_OPTIONS.group),
];

export const FILE_FILTERS = [
  createFilter("type", "File Type", TYPE_OPTIONS.file),
  createFilter("size", "Size", SIZE_OPTIONS.file),
  createFilter("shared", "Sharing", [
    { value: "shared", label: "Shared" },
    { value: "private", label: "Private" },
  ]),
];

export const SECURITY_FILTERS = [
  createFilter("risk", "Risk Level", [
    { value: "high", label: "High" },
    { value: "moderate", label: "Moderate" },
    { value: "low", label: "Low" },
  ]),
  createFilter("status", "Status", STATUS_OPTIONS.security),
  createFilter("type", "Alert Type", TYPE_OPTIONS.security),
];
