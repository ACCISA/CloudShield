// Utility functions for formatting values in the UI
export function formatShares(value) {
  if (value === 0 || value === "0") return "-";
  if (value == null || value === "") return "-";
  return String(value);
}