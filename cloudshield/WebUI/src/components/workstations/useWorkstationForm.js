import { useState } from "react";

/**
 * Custom hook for workstation form state management
 *
 * @param {Object} initialData - Initial workstation data (for edit mode)
 * @returns {Object} Form state and handlers
 */
export function useWorkstationForm(initialData = {}) {
  const [name, setName] = useState(initialData?.name || "WS-001");
  const [group, setGroup] = useState(initialData?.group || "None");
  const [users, setUsers] = useState(
    initialData?.currentUser ? [initialData.currentUser].filter(Boolean) : []
  );
  const [allUsers, setAllUsers] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(
    initialData?.plan || "BASIC"
  );
  const [allSoftware, setAllSoftware] = useState(false);

  /**
   * Toggle a user in the selected users list.
   * @param {string} u - User name to toggle
   */
  const toggleUser = (u) =>
    setUsers((prev) =>
      prev.includes(u) ? prev.filter((x) => x !== u) : [...prev, u]
    );

  return {
    name,
    setName,
    group,
    setGroup,
    users,
    setUsers,
    allUsers,
    setAllUsers,
    selectedPlan,
    setSelectedPlan,
    allSoftware,
    setAllSoftware,
    toggleUser,
  };
}
