/**
 * Centralized Mock Data
 *
 * All mock data for the application is stored here for consistency.
 * When implementing real API calls, replace imports from this file
 * with actual API responses.
 */

// ============================================================================
// USERS
// ============================================================================
export const MOCK_USERS = [
  {
    id: "1",
    firstName: "Jim",
    lastName: "Halpert",
    email: "jim@dundermifflin.com",
    title: "Sales Representative",
    active: true,
  },
  {
    id: "2",
    firstName: "Dwight",
    lastName: "Schrute",
    email: "dwight@dundermifflin.com",
    title: "Assistant Regional Manager",
    active: true,
  },
  {
    id: "3",
    firstName: "Pam",
    lastName: "Beasly",
    email: "pam@dundermifflin.com",
    title: "Receptionist",
    active: true,
  },
  {
    id: "4",
    firstName: "Michael",
    lastName: "Scott",
    email: "michael@dundermifflin.com",
    title: "Regional Manager",
    active: true,
  },
  {
    id: "5",
    firstName: "Stanley",
    lastName: "Hudson",
    email: "stanley@dundermifflin.com",
    title: "Sales Representative",
    active: true,
  },
  {
    id: "6",
    firstName: "Phyllis",
    lastName: "Vance",
    email: "phyllis@dundermifflin.com",
    title: "Sales Representative",
    active: true,
  },
  {
    id: "7",
    firstName: "Angela",
    lastName: "Martin",
    email: "angela@dundermifflin.com",
    title: "Senior Accountant",
    active: true,
  },
  {
    id: "8",
    firstName: "Oscar",
    lastName: "Martinez",
    email: "oscar@dundermifflin.com",
    title: "Accountant",
    active: true,
  },
  {
    id: "9",
    firstName: "Kevin",
    lastName: "Malone",
    email: "kevin@dundermifflin.com",
    title: "Accountant",
    active: true,
  },
  {
    id: "10",
    firstName: "Andy",
    lastName: "Bernard",
    email: "andy@dundermifflin.com",
    title: "Sales Representative",
    active: false,
  },
  {
    id: "11",
    firstName: "Ryan",
    lastName: "Howard",
    email: "ryan@dundermifflin.com",
    title: "Temp",
    active: true,
  },
  {
    id: "12",
    firstName: "Kelly",
    lastName: "Kapoor",
    email: "kelly@dundermifflin.com",
    title: "Customer Service",
    active: true,
  },
];

// ============================================================================
// WORKSTATIONS
// ============================================================================
export const MOCK_WORKSTATIONS = [
  {
    id: "1",
    name: "Sales-WS-001",
    hostname: "SALES-WS-001",
    online: true,
    ipAddress: "192.168.1.101",
    code: "WS-001",
  },
  {
    id: "2",
    name: "Sales-WS-002",
    hostname: "SALES-WS-002",
    online: true,
    ipAddress: "192.168.1.102",
    code: "WS-002",
  },
  {
    id: "3",
    name: "Sales-WS-003",
    hostname: "SALES-WS-003",
    online: false,
    ipAddress: "192.168.1.103",
    code: "WS-003",
  },
  {
    id: "4",
    name: "Accounting-WS-001",
    hostname: "ACCT-WS-001",
    online: true,
    ipAddress: "192.168.1.201",
    code: "WS-004",
  },
  {
    id: "5",
    name: "Accounting-WS-002",
    hostname: "ACCT-WS-002",
    online: false,
    ipAddress: "192.168.1.202",
    code: "WS-005",
  },
  {
    id: "6",
    name: "Admin-WS-001",
    hostname: "ADMIN-WS-001",
    online: true,
    ipAddress: "192.168.1.301",
    code: "WS-006",
  },
  {
    id: "7",
    name: "ENG-WS-001",
    hostname: "ENG-WS-001",
    online: true,
    ipAddress: "192.168.2.101",
    code: "WS-007",
  },
  {
    id: "8",
    name: "ENG-WS-002",
    hostname: "ENG-WS-002",
    online: true,
    ipAddress: "192.168.2.102",
    code: "WS-008",
  },
  {
    id: "9",
    name: "ENG-WS-003",
    hostname: "ENG-WS-003",
    online: true,
    ipAddress: "192.168.2.103",
    code: "WS-009",
  },
  {
    id: "10",
    name: "ENG-WS-004",
    hostname: "ENG-WS-004",
    online: false,
    ipAddress: "192.168.2.104",
    code: "WS-010",
  },
  {
    id: "11",
    name: "MKT-WS-001",
    hostname: "MKT-WS-001",
    online: true,
    ipAddress: "192.168.3.101",
    code: "WS-011",
  },
  {
    id: "12",
    name: "MKT-WS-002",
    hostname: "MKT-WS-002",
    online: true,
    ipAddress: "192.168.3.102",
    code: "WS-012",
  },
  {
    id: "13",
    name: "HR-WS-001",
    hostname: "HR-WS-001",
    online: true,
    ipAddress: "192.168.4.101",
    code: "WS-013",
  },
  {
    id: "ws-1",
    name: "Development",
    hostname: "DEV-WS-001",
    online: true,
    ipAddress: "192.168.1.401",
    code: "WS-014",
  },
  {
    id: "ws-2",
    name: "Marketing",
    hostname: "MKT-WS-003",
    online: true,
    ipAddress: "192.168.1.402",
    code: "WS-015",
  },
  {
    id: "ws-3",
    name: "Sales",
    hostname: "SALES-WS-004",
    online: true,
    ipAddress: "192.168.1.104",
    code: "WS-016",
  },
  {
    id: "ws-4",
    name: "Finance",
    hostname: "FIN-WS-001",
    online: false,
    ipAddress: "192.168.1.501",
    code: "WS-017",
  },
  {
    id: "ws-5",
    name: "HR",
    hostname: "HR-WS-002",
    online: true,
    ipAddress: "192.168.1.601",
    code: "WS-018",
  },
];

// ============================================================================
// GROUPS
// ============================================================================
export const MOCK_GROUPS = [
  {
    id: "1",
    name: "Sales",
    code: "SALES",
    description: "Sales Representatives & Account Managers",
  },
  {
    id: "2",
    name: "Finance",
    code: "FIN",
    description: "Finance and Accounting Team",
  },
  {
    id: "3",
    name: "Reception",
    code: "RECEP",
    description: "Front Desk and Reception",
  },
  {
    id: "4",
    name: "Warehouse",
    code: "WARE",
    description: "Warehouse Operations",
  },
  {
    id: "5",
    name: "Manager",
    code: "MGR",
    description: "Management Team",
  },
  {
    id: "g-1",
    name: "Sales",
    code: "SALES",
    description: "Sales Representatives",
  },
  {
    id: "g-2",
    name: "Finance",
    code: "FIN",
    description: "Finance Team",
  },
  {
    id: "g-3",
    name: "Reception",
    code: "RECEP",
    description: "Reception Staff",
  },
  {
    id: "g-4",
    name: "Warehouse",
    code: "WARE",
    description: "Warehouse Staff",
  },
  {
    id: "g-5",
    name: "Manager",
    code: "MGR",
    description: "Managers",
  },
];

// ============================================================================
// SOFTWARE
// ============================================================================
export const MOCK_SOFTWARE = [
  { id: "sw-1", name: "Microsoft Office 365" },
  { id: "sw-2", name: "Adobe Creative Cloud" },
  { id: "sw-3", name: "Slack" },
  { id: "sw-4", name: "Zoom" },
  { id: "sw-5", name: "Visual Studio Code" },
  { id: "sw-6", name: "Git" },
  { id: "sw-7", name: "Docker Desktop" },
  { id: "sw-8", name: "Node.js" },
  { id: "sw-9", name: "Python" },
  { id: "sw-10", name: "Postman" },
  { id: "sw-11", name: "Chrome" },
  { id: "sw-12", name: "Firefox" },
  { id: "sw-13", name: "1Password" },
  { id: "sw-14", name: "Notion" },
  { id: "sw-15", name: "Figma" },
];

// ============================================================================
// FILES
// ============================================================================
export const MOCK_FILES = [
  {
    id: "1",
    name: "Q1_Sales_Report.xlsx",
    type: "spreadsheet",
    size: "2.4 MB",
    code: "DOC-001",
  },
  {
    id: "2",
    name: "Marketing_Strategy.pptx",
    type: "presentation",
    size: "5.1 MB",
    code: "DOC-002",
  },
  {
    id: "3",
    name: "Employee_Handbook.pdf",
    type: "document",
    size: "1.8 MB",
    code: "DOC-003",
  },
  {
    id: "4",
    name: "Project_Timeline.xlsx",
    type: "spreadsheet",
    size: "890 KB",
    code: "DOC-004",
  },
  {
    id: "5",
    name: "Company_Logo.png",
    type: "image",
    size: "456 KB",
    code: "DOC-005",
  },
  {
    id: "6",
    name: "Meeting_Notes.docx",
    type: "document",
    size: "320 KB",
    code: "DOC-006",
  },
  {
    id: "f-1",
    name: "Sales Documents",
    type: "document",
    size: "1.2 MB",
    code: "DOC-007",
  },
  {
    id: "f-2",
    name: "Finance Reports",
    type: "spreadsheet",
    size: "2.8 MB",
    code: "DOC-008",
  },
  {
    id: "f-3",
    name: "Reception Files",
    type: "document",
    size: "890 KB",
    code: "DOC-009",
  },
  {
    id: "f-4",
    name: "Manager Files",
    type: "document",
    size: "1.5 MB",
    code: "DOC-010",
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get a subset of items (useful for suggested items)
 */
export const getSuggestedItems = (items, count = 3) => items.slice(0, count);

/**
 * Find user by email
 */
export const findUserByEmail = (email) => {
  return MOCK_USERS.find((user) => user.email === email);
};

/**
 * Find user by id
 */
export const findUserById = (id) => {
  return MOCK_USERS.find((user) => user.id === id);
};

/**
 * Find workstation by id
 */
export const findWorkstationById = (id) => {
  return MOCK_WORKSTATIONS.find((ws) => ws.id === id);
};

/**
 * Find workstation by name
 */
export const findWorkstationByName = (name) => {
  return MOCK_WORKSTATIONS.find((ws) => ws.name === name);
};

/**
 * Find group by id
 */
export const findGroupById = (id) => {
  return MOCK_GROUPS.find((group) => group.id === id);
};

/**
 * Find file by id
 */
export const findFileById = (id) => {
  return MOCK_FILES.find((file) => file.id === id);
};

// ============================================================================
// COMPLEX/COMPOSITE MOCK DATA (For Pages)
// ============================================================================

/**
 * Full user objects for UsersPage
 * Includes aggregated counts and status information
 */
export const MOCK_USERS_FULL = [
  {
    id: "1",
    name: "aniss tralala",
    email: "aniss@tralala.com",
    title: "Regional Manager",
    workstations: 3,
    groups: 3,
    files: 3,
    status: "online",
  },
  {
    id: "2",
    name: "john tralala",
    email: "john@cloudshield.com",
    title: "Cuisinier",
    workstations: 2,
    groups: 2,
    files: 1,
    status: "offline",
  },
];

/**
 * Full workstation objects for WorkstationsPage
 * Includes nested users and detailed status information
 */
export const MOCK_WORKSTATIONS_FULL = [
  {
    id: "ws-1",
    name: "Development-WS-001",
    hostname: "DEV-WS-001",
    code: "WS-001",
    usersCount: 3,
    users: [
      findUserByEmail("jim@dundermifflin.com"),
      findUserByEmail("pam@dundermifflin.com"),
      findUserByEmail("dwight@dundermifflin.com"),
    ].filter(Boolean),
    currentUser: findUserByEmail("jim@dundermifflin.com"),
    lastUsed: "03/11/2025",
    status: "connected",
    online: true,
    ipAddress: "192.168.1.101",
    operatingSystem: "Windows 11 Pro",
    assignedUser: "Jim Halpert",
    lastSeen: "2026-01-15T10:30:00Z",
  },
  {
    id: "ws-2",
    name: "Marketing-WS-002",
    hostname: "MKT-WS-002",
    code: "WS-002",
    usersCount: 2,
    users: [
      findUserByEmail("pam@dundermifflin.com"),
      findUserByEmail("michael@dundermifflin.com"),
    ].filter(Boolean),
    currentUser: findUserByEmail("pam@dundermifflin.com"),
    lastUsed: "—",
    status: "busy",
    online: true,
    ipAddress: "192.168.1.102",
    operatingSystem: "Windows 10 Pro",
    assignedUser: "Pam Beasly",
    lastSeen: "2026-01-15T09:15:00Z",
  },
  {
    id: "ws-3",
    name: "Sales-WS-003",
    hostname: "SALES-WS-003",
    code: "WS-003",
    usersCount: 3,
    users: [
      findUserByEmail("jim@dundermifflin.com"),
      findUserByEmail("dwight@dundermifflin.com"),
      findUserByEmail("michael@dundermifflin.com"),
    ].filter(Boolean),
    currentUser: findUserByEmail("jim@dundermifflin.com"),
    lastUsed: "03/11/2025",
    status: "connected",
    online: true,
    ipAddress: "192.168.1.103",
    operatingSystem: "Windows 11 Pro",
    assignedUser: "Jim Halpert",
    lastSeen: "2026-01-15T10:45:00Z",
  },
  {
    id: "ws-4",
    name: "Accounting-WS-004",
    hostname: "ACCT-WS-004",
    code: "WS-004",
    usersCount: 2,
    users: [
      findUserByEmail("angela@dundermifflin.com"),
      findUserByEmail("kevin@dundermifflin.com"),
    ].filter(Boolean),
    currentUser: findUserByEmail("angela@dundermifflin.com"),
    lastUsed: "03/10/2025",
    status: "disconnected",
    online: false,
    ipAddress: "192.168.1.104",
    operatingSystem: "macOS Sonoma",
    assignedUser: "Angela Martin",
    lastSeen: "2026-01-14T17:30:00Z",
  },
];

/**
 * Full group objects for GroupsPage
 * Includes nested users, workstations, and file counts
 */
export const MOCK_GROUPS_FULL = [
  {
    id: "1",
    name: "Sales Team",
    groupName: "Sales Team",
    description: "Sales Reps & Account Manager",
    memberCount: 5,
    users: [
      findUserByEmail("jim@dundermifflin.com"),
      findUserByEmail("dwight@dundermifflin.com"),
      findUserByEmail("stanley@dundermifflin.com"),
      findUserByEmail("phyllis@dundermifflin.com"),
      findUserByEmail("andy@dundermifflin.com"),
    ].filter(Boolean),
    workstations: [
      findWorkstationByName("Sales-WS-001"),
      findWorkstationByName("Sales-WS-002"),
      findWorkstationByName("Sales-WS-003"),
    ].filter(Boolean),
    files: 24,
    type: "Department",
    createdDate: "2025-01-10T00:00:00Z",
  },
  {
    id: "2",
    name: "Engineering",
    groupName: "Engineering",
    description: "Software development team",
    memberCount: 6,
    users: [
      findUserByEmail("michael@dundermifflin.com"),
      findUserByEmail("pam@dundermifflin.com"),
      findUserByEmail("ryan@dundermifflin.com"),
      findUserByEmail("kelly@dundermifflin.com"),
      findUserByEmail("oscar@dundermifflin.com"),
      findUserByEmail("angela@dundermifflin.com"),
    ].filter(Boolean),
    workstations: [
      findWorkstationByName("ENG-WS-001"),
      findWorkstationByName("ENG-WS-002"),
      findWorkstationByName("ENG-WS-003"),
      findWorkstationByName("ENG-WS-004"),
    ].filter(Boolean),
    files: 156,
    type: "Department",
    createdDate: "2025-02-15T00:00:00Z",
  },
  {
    id: "3",
    name: "Marketing",
    groupName: "Marketing",
    description: "Marketing and Communications",
    memberCount: 3,
    users: [
      findUserByEmail("pam@dundermifflin.com"),
      findUserByEmail("ryan@dundermifflin.com"),
      findUserByEmail("kelly@dundermifflin.com"),
    ].filter(Boolean),
    workstations: [
      findWorkstationByName("MKT-WS-001"),
      findWorkstationByName("MKT-WS-002"),
    ].filter(Boolean),
    files: 89,
    type: "Department",
    createdDate: "2025-03-01T00:00:00Z",
  },
  {
    id: "4",
    name: "HR Department",
    groupName: "HR Department",
    description: "Human Resources",
    memberCount: 2,
    users: [
      findUserByEmail("oscar@dundermifflin.com"),
      findUserByEmail("angela@dundermifflin.com"),
    ].filter(Boolean),
    workstations: [findWorkstationByName("HR-WS-001")].filter(Boolean),
    files: 45,
    type: "Department",
    createdDate: "2025-01-20T00:00:00Z",
  },
];

// ============================================================================
// SECURITY ALERTS
// ============================================================================

const ALERT_TYPES = [
  "Security breach",
  "Suspicious activity",
  "Policy violation",
  "Data access",
  "Malware detected",
  "Unauthorized access",
  "Ransomware attempt",
  "Phishing attempt",
  "Data exfiltration",
  "Network intrusion",
];

const ACTIVITIES = [
  "Uploaded file to group",
  "Multiple failed login attempts",
  "Access from unknown location",
  "Unauthorized data export",
  "Password policy violation",
  "Unusual file access pattern",
  "Malware detected in uploaded file",
  "Sharing sensitive data externally",
  "Account accessed from suspicious IP",
  "Brute force attack detected",
  "Elevated privileges requested",
  "Database query anomaly detected",
  "Unauthorized API access attempt",
  "Large data download detected",
  "Encryption key access attempted",
  "Firewall rule modification",
  "VPN connection from blacklisted region",
  "Suspicious process execution",
  "Credential harvesting attempt",
  "Port scanning detected",
  "DDoS attack pattern identified",
  "Insider threat indicator observed",
  "File integrity violation",
  "Unusual network traffic spike",
  "Privilege escalation detected",
  "Unauthorized software installation",
  "Sensitive file deletion attempt",
  "SQL injection attempt blocked",
  "XSS attack detected",
  "Remote code execution attempt",
  "Zero-day exploit signature",
  "Rootkit activity suspected",
  "Backdoor installation attempt",
  "Keylogger detected",
  "Screen capture malware found",
  "Data tampering detected",
  "Certificate authority anomaly",
  "DNS tunneling detected",
  "Tor network access detected",
  "Anonymous proxy usage",
  "USB device policy breach",
  "Bluetooth device unauthorized",
  "Mobile device jailbreak detected",
  "Cloud storage unauthorized sync",
  "Email forwarding rule created",
  "Mailbox rule suspicious activity",
  "Calendar invitation phishing",
  "Document macro execution blocked",
  "PowerShell script suspicious behavior",
  "Registry modification detected",
];

const RISK_DISTRIBUTION = {
  high: 0.3,
  moderate: 0.5,
  low: 0.2,
};

const STATUS_DISTRIBUTION = {
  unresolved: 0.7,
  resolved: 0.2,
  investigating: 0.1,
};

// Generate dates for the last 30 days with weighted distribution
// This creates realistic clustering where some days have more alerts
const generateRecentDate = (daysAgo, hourOffset = 0) => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(Math.floor(Math.random() * 24) + hourOffset);
  date.setMinutes(Math.floor(Math.random() * 60));
  date.setSeconds(0);
  date.setMilliseconds(0);
  return date.toISOString();
};

// Get a weighted random day (some days more likely than others)
const getWeightedDaysAgo = () => {
  const rand = Math.random();
  // 40% chance of alerts in last 7 days
  if (rand < 0.4) return Math.floor(Math.random() * 7);
  // 30% chance of alerts in days 7-14
  if (rand < 0.7) return 7 + Math.floor(Math.random() * 7);
  // 20% chance of alerts in days 14-21
  if (rand < 0.9) return 14 + Math.floor(Math.random() * 7);
  // 10% chance of alerts in days 21-30
  return 21 + Math.floor(Math.random() * 9);
};

// Format date for display
const formatDateForDisplay = (isoDate) => {
  const date = new Date(isoDate);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const year = date.getFullYear();
  let hour = date.getHours();
  const minute = String(date.getMinutes()).padStart(2, "0");
  const ampm = hour >= 12 ? "pm" : "am";
  hour = hour % 12 || 12;
  return `${month}/${day}/${year} ${hour}:${minute} ${ampm}`;
};

const getRandomItem = (array) =>
  array[Math.floor(Math.random() * array.length)];

const getWeightedRisk = () => {
  const rand = Math.random();
  if (rand < RISK_DISTRIBUTION.high) return "high";
  if (rand < RISK_DISTRIBUTION.high + RISK_DISTRIBUTION.moderate)
    return "moderate";
  return "low";
};

const getWeightedStatus = () => {
  const rand = Math.random();
  if (rand < STATUS_DISTRIBUTION.unresolved) return "unresolved";
  if (rand < STATUS_DISTRIBUTION.unresolved + STATUS_DISTRIBUTION.resolved)
    return "resolved";
  return "investigating";
};

// Generate comprehensive mock security alerts with realistic clustering
// More alerts on recent days and certain days have multiple alerts
export const MOCK_SECURITY_ALERTS = Array.from({ length: 150 }, (_, index) => {
  const daysAgo = getWeightedDaysAgo();
  const isoDate = generateRecentDate(daysAgo);
  return {
    id: index + 1,
    type: getRandomItem(ALERT_TYPES),
    date: isoDate,
    displayDate: formatDateForDisplay(isoDate),
    activity: getRandomItem(ACTIVITIES),
    risk: getWeightedRisk(),
    status: getWeightedStatus(),
  };
});

// Sort by most recent first
MOCK_SECURITY_ALERTS.sort((a, b) => {
  const dateA = new Date(a.date);
  const dateB = new Date(b.date);
  return dateB - dateA;
});

// ============================================================================
// MODAL STEP LABELS
// ============================================================================
export const USER_MODAL_STEPS = [
  "Basic Info",
  "Workstations",
  "Groups",
  "Files",
];
export const GROUP_MODAL_STEPS = [
  "Basic Info",
  "Users",
  "Workstations",
  "Files",
];
