import { apiPost } from './client';

/**
 * Sends a security alert payload to the Cortex AI to get a plain-English explanation.
 * @param {Object} alertData - The alert details (risk, type, category, source, description)
 * @returns {Promise<Object>} The AI explanation response
 */
export const explainSecurityAlert = async (alertData) => {
  return await apiPost('/alerts/explain', alertData);
};