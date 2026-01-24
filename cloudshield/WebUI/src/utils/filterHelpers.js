/**
 * filterHelpers.js
 * 
 * Shared utility functions for filter management across pages
 */

/**
 * Creates a filter change handler for managing Set-based filters
 * @param {Function} setActiveFilters - State setter function for active filters
 * @returns {Function} Handler function (groupId, value, isActive) => void
 */
export const createFilterChangeHandler = (setActiveFilters) => {
  return (groupId, value, isActive) => {
    setActiveFilters((prev) => {
      const newFilters = { ...prev };
      const currentSet = new Set(newFilters[groupId] || []);

      if (isActive) {
        currentSet.add(value);
      } else {
        currentSet.delete(value);
      }

      newFilters[groupId] = currentSet;
      return newFilters;
    });
  };
};
