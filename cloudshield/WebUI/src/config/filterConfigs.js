/**
 * Filter configurations for different pages
 * Each page can have its own set of filter groups
 */

export const WORKSTATION_FILTERS = [
  {
    id: "status",
    label: "Status",
    type: "checkbox",
    options: [
      { value: "connected", label: "Connected" },
      { value: "disconnected", label: "Disconnected" },
      { value: "busy", label: "Busy" },
    ],
  },
  {
    id: "hasUsers",
    label: "Users",
    type: "checkbox",
    options: [{ value: "activeUsers", label: "Active users", type: "toggle" }],
  },
];

export const USER_FILTERS = [
  {
    id: "status",
    label: "Status",
    type: "checkbox",
    options: [
      { value: "active", label: "Active" },
      { value: "inactive", label: "Inactive" },
      { value: "suspended", label: "Suspended" },
    ],
  },
  {
    id: "role",
    label: "Role",
    type: "checkbox",
    options: [
      { value: "admin", label: "Administrator" },
      { value: "manager", label: "Manager" },
      { value: "user", label: "User" },
    ],
  },
  {
    id: "assignments",
    label: "Assignments",
    type: "checkbox",
    options: [
      { value: "hasWorkstations", label: "Has workstations" },
      { value: "hasGroups", label: "In groups" },
      { value: "hasFiles", label: "Has files" },
    ],
  },
];

export const GROUP_FILTERS = [
  {
    id: "type",
    label: "Type",
    type: "checkbox",
    options: [
      { value: "department", label: "Department" },
      { value: "team", label: "Team" },
      { value: "project", label: "Project" },
    ],
  },
  {
    id: "size",
    label: "Size",
    type: "checkbox",
    options: [
      { value: "small", label: "Small (1-10)" },
      { value: "medium", label: "Medium (11-50)" },
      { value: "large", label: "Large (51+)" },
    ],
  },
  {
    id: "assignments",
    label: "Assignments",
    type: "checkbox",
    options: [
      { value: "hasWorkstations", label: "Has workstations" },
      { value: "hasFiles", label: "Has files" },
    ],
  },
];

export const FILE_FILTERS = [
  {
    id: "type",
    label: "File Type",
    type: "checkbox",
    options: [
      { value: "document", label: "Documents" },
      { value: "image", label: "Images" },
      { value: "video", label: "Videos" },
      { value: "archive", label: "Archives" },
      { value: "other", label: "Other" },
    ],
  },
  {
    id: "size",
    label: "Size",
    type: "checkbox",
    options: [
      { value: "small", label: "Small (<1MB)" },
      { value: "medium", label: "Medium (1-10MB)" },
      { value: "large", label: "Large (10-100MB)" },
      { value: "xlarge", label: "Very Large (>100MB)" },
    ],
  },
  {
    id: "shared",
    label: "Sharing",
    type: "checkbox",
    options: [
      { value: "shared", label: "Shared" },
      { value: "private", label: "Private" },
    ],
  },
];
