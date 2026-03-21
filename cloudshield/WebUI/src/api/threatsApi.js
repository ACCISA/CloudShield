import { apiPost } from './client';

async function parseApiResponse(response) {
  if (response && typeof response.json === 'function') {
    return response.json();
  }
  return response;
}
/**
 * Sends a security alert payload to the Cortex AI to get a plain-English explanation.
 * @param {Object} alertData - The alert details (risk, type, category, source, description)
 * @returns {Promise<Object>} The AI explanation response
 */
export const explainSecurityAlert = async (alertData) => {
  const response = await apiPost('/threat/alerts/explain', alertData);
  return parseApiResponse(response);
};
