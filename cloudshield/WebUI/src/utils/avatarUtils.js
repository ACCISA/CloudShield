/**
 * avatarUtils.js
 *
 * Utility functions for generating avatar colors and initials
 */

// Color pool for avatar backgrounds
export const AVATAR_COLORS = [
  "#F59E0B", // Amber
  "#EF4444", // Red
  "#8B5CF6", // Purple
  "#3B82F6", // Blue
  "#10B981", // Green
  "#EC4899", // Pink
  "#F97316", // Orange
  "#14B8A6", // Teal
  "#6366F1", // Indigo
  "#84CC16", // Lime
];

/**
 * Generate a consistent color based on a string (e.g., name)
 * @param {string} str - Input string to generate color from
 * @returns {string} Hex color code
 */
export function getColorFromString(str) {
  if (!str) return AVATAR_COLORS[0];

  // Simple hash function
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

/**
 * Get initials from a name
 * @param {string} name - Full name
 * @returns {string} Initials (up to 2 characters)
 */
export function getInitials(name) {
  if (!name) return "?";

  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }

  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/**
 * Generate a random avatar color
 * @returns {string} Random hex color
 */
export function getRandomAvatarColor() {
  // Using Math.random() is safe here - it's only for UI color selection, not security
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
}
