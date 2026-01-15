/**
 * searchUtils.js
 *
 * Purpose:
 *   Utility functions for implementing best-effort search with relevance scoring.
 *   Returns results sorted by relevance (most relevant first).
 *
 * Features:
 *   - Exact match scoring (highest priority)
 *   - Starts-with matching (high priority)
 *   - Word boundary matching (medium priority)
 *   - Contains matching (lower priority)
 *   - Typo tolerance using edit distance (handles transpositions like "michael" vs "micheal")
 *   - Multi-field search support
 *   - Case-insensitive search
 *   - Configurable field weights
 */

/**
 * Calculate Levenshtein distance (edit distance) between two strings
 * Used to detect typos and similar spellings
 *
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} Number of edits needed to transform str1 into str2
 */
function levenshteinDistance(str1, str2) {
  const len1 = str1.length;
  const len2 = str2.length;

  // Create a 2D array for dynamic programming
  const matrix = Array(len1 + 1)
    .fill(null)
    .map(() => Array(len2 + 1).fill(0));

  // Initialize first column and row
  for (let i = 0; i <= len1; i++) matrix[i][0] = i;
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;

  // Fill the matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[len1][len2];
}

/**
 * Check if two strings are similar enough (typo tolerance)
 * Handles common typos like transpositions: "michael" vs "micheal"
 *
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @param {number} maxDistance - Maximum allowed edit distance
 * @returns {number} Similarity score (0 = no match, higher = more similar)
 */
function calculateTypoScore(str1, str2, maxDistance = 2) {
  const distance = levenshteinDistance(str1, str2);

  // If distance is within threshold, return a score
  if (distance <= maxDistance) {
    // Perfect match
    if (distance === 0) return 900;
    // One character difference (typo)
    if (distance === 1) return 700;
    // Two character difference (transposition or double typo)
    if (distance === 2) return 500;
  }

  return 0;
}

/**
 * Check if search term matches any word in the value with typo tolerance
 *
 * @param {string} value - The value to search in
 * @param {string} searchTerm - The search term
 * @returns {number} Best typo score found
 */
function findBestTypoMatch(value, searchTerm) {
  const words = value.split(/\s+/);
  let bestScore = 0;

  words.forEach((word) => {
    // Check if word or beginning of word matches with typo tolerance
    const wordLower = word.toLowerCase();
    const searchLower = searchTerm.toLowerCase();

    // Check full word match with typos
    const fullWordScore = calculateTypoScore(wordLower, searchLower);
    if (fullWordScore > bestScore) {
      bestScore = fullWordScore;
    }

    // Check if search term matches beginning of word with typos
    if (wordLower.length >= searchLower.length) {
      const wordPrefix = wordLower.substring(0, searchLower.length);
      const prefixScore = calculateTypoScore(wordPrefix, searchLower);
      if (prefixScore > bestScore) {
        bestScore = prefixScore * 0.9; // Slightly lower score for prefix matches
      }
    }
  });

  return bestScore;
}

/**
 * Calculate relevance score for a search term match
 * Higher scores = more relevant
 *
 * @param {string} value - The value to search in
 * @param {string} searchTerm - The search term
 * @returns {number} Relevance score (0 = no match, higher = more relevant)
 */
function calculateRelevanceScore(value, searchTerm) {
  if (!value || !searchTerm) return 0;

  const valueLower = value.toLowerCase();
  const searchLower = searchTerm.toLowerCase().trim();

  if (!searchLower) return 0;

  // Exact match (highest priority)
  if (valueLower === searchLower) {
    return 1000;
  }

  // Starts with search term (high priority)
  if (valueLower.startsWith(searchLower)) {
    return 800;
  }

  // Word boundary match - search term starts a word (medium-high priority)
  const wordBoundaryRegex = new RegExp(`\\b${escapeRegex(searchLower)}`, "i");
  if (wordBoundaryRegex.test(valueLower)) {
    return 600;
  }

  // Contains search term (medium priority)
  if (valueLower.includes(searchLower)) {
    // Boost score if match is closer to the beginning
    const position = valueLower.indexOf(searchLower);
    const positionScore = Math.max(0, 400 - position);
    return 400 + positionScore;
  }

  // Typo tolerance - check for similar words (handles "michael" vs "micheal")
  const typoScore = findBestTypoMatch(valueLower, searchLower);
  if (typoScore > 0) {
    return typoScore;
  }

  // Fuzzy match - all characters present in order (lower priority)
  if (fuzzyMatch(valueLower, searchLower)) {
    return 200;
  }

  return 0;
}

/**
 * Escape special regex characters
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Check if all characters in search term appear in value in order
 * @param {string} value - The value to search in
 * @param {string} search - The search term
 * @returns {boolean} True if fuzzy match
 */
function fuzzyMatch(value, search) {
  let searchIndex = 0;
  for (let i = 0; i < value.length && searchIndex < search.length; i++) {
    if (value[i] === search[searchIndex]) {
      searchIndex++;
    }
  }
  return searchIndex === search.length;
}

/**
 * Search through items with relevance scoring
 *
 * @param {Array} items - Array of items to search through
 * @param {string} searchTerm - The search term
 * @param {Array<string|object>} searchFields - Fields to search in
 *   - Can be string: "name" or
 *   - Object: { field: "name", weight: 2 } (weight multiplies the relevance score)
 * @returns {Array} Filtered and sorted items by relevance (most relevant first)
 *
 * @example
 * const users = [
 *   { name: "John Doe", email: "john@example.com" },
 *   { name: "Jane Smith", email: "jane@example.com" }
 * ];
 *
 * // Simple search
 * const results = searchWithRelevance(users, "john", ["name", "email"]);
 *
 * // Weighted search (name is more important than email)
 * const results = searchWithRelevance(users, "john", [
 *   { field: "name", weight: 2 },
 *   { field: "email", weight: 1 }
 * ]);
 */
export function searchWithRelevance(items, searchTerm, searchFields = []) {
  if (!searchTerm || !searchTerm.trim()) {
    return items; // Return all items if no search term
  }

  // Normalize search fields to objects with weights
  const normalizedFields = searchFields.map((field) => {
    if (typeof field === "string") {
      return { field, weight: 1 };
    }
    return { field: field.field, weight: field.weight || 1 };
  });

  // Calculate relevance score for each item
  const itemsWithScores = items.map((item) => {
    let totalScore = 0;

    normalizedFields.forEach(({ field, weight }) => {
      // Support nested fields using dot notation (e.g., "user.name")
      const value = getNestedValue(item, field);
      if (value !== null && value !== undefined) {
        const fieldScore = calculateRelevanceScore(String(value), searchTerm);
        totalScore += fieldScore * weight;
      }
    });

    return {
      item,
      score: totalScore,
    };
  });

  // Filter out items with score 0 and sort by score (highest first)
  return itemsWithScores
    .filter((itemWithScore) => itemWithScore.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((itemWithScore) => itemWithScore.item);
}

/**
 * Get nested value from object using dot notation
 * @param {object} obj - The object
 * @param {string} path - The path (e.g., "user.name")
 * @returns {*} The value or undefined
 */
function getNestedValue(obj, path) {
  return path.split(".").reduce((current, key) => current?.[key], obj);
}

/**
 * Highlight matching text in search results
 * @param {string} text - The text to highlight in
 * @param {string} searchTerm - The search term to highlight
 * @returns {string} HTML string with highlighted matches
 *
 * @example
 * highlightMatch("John Doe", "john") // Returns: "<mark>John</mark> Doe"
 */
export function highlightMatch(text, searchTerm) {
  if (!text || !searchTerm) return text;

  const regex = new RegExp(`(${escapeRegex(searchTerm)})`, "gi");
  return text.replace(regex, "<mark>$1</mark>");
}

/**
 * Quick search helper - returns true if any field matches (no sorting)
 * Use this for simple boolean filtering without relevance scoring
 *
 * @param {object} item - The item to check
 * @param {string} searchTerm - The search term
 * @param {Array<string>} fields - Fields to search in
 * @returns {boolean} True if item matches
 */
export function simpleSearch(item, searchTerm, fields) {
  if (!searchTerm || !searchTerm.trim()) return true;

  const searchLower = searchTerm.toLowerCase().trim();

  return fields.some((field) => {
    const value = getNestedValue(item, field);
    return value && String(value).toLowerCase().includes(searchLower);
  });
}

export default {
  searchWithRelevance,
  highlightMatch,
  simpleSearch,
};
