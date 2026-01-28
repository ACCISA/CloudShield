// Shared mock data for user modals
// TODO: Replace with API calls

export const MOCK_WORKSTATIONS = [
  { id: "ws-1", name: "Development", code: "WS-001" },
  { id: "ws-2", name: "Marketing", code: "WS-002" },
  { id: "ws-3", name: "Sales", code: "WS-003" },
  { id: "ws-4", name: "Finance", code: "WS-004" },
  { id: "ws-5", name: "HR", code: "WS-005" },
];

export const MOCK_GROUPS = [
  { id: "g-1", name: "Sales", code: "SALES" },
  { id: "g-2", name: "Finance", code: "FIN" },
  { id: "g-3", name: "Reception", code: "RECEP" },
  { id: "g-4", name: "Warehouse", code: "WARE" },
  { id: "g-5", name: "Manager", code: "MGR" },
];

export const MOCK_FILES = [
  { id: "f-1", name: "Sales Documents", code: "DOC-001" },
  { id: "f-2", name: "Finance Reports", code: "DOC-002" },
  { id: "f-3", name: "Reception Files", code: "DOC-003" },
  { id: "f-4", name: "Manager Files", code: "DOC-004" },
];

export const STEPS = ["Basic Info", "Workstations", "Groups", "Shares"];

export const getSuggestedItems = (items, count = 3) => items.slice(0, count);
