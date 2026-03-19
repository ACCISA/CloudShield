/* 
    * Utility functions for handling errors and extracting user-friendly messages
    * This module provides a function to convert various error formats (especially from API responses) into clear messages that can be displayed to users. 
    * It is used throughout the application to ensure consistent error handling and messaging.
*/
export function getUserErrorMessage(err) {
  // Axios style
  const status = err?.response?.status;
  const apiMsg = err?.response?.data?.message || err?.response?.data?.error;

  if (status === 401) return "Your session expired. Please sign in again.";
  if (status === 403) return "You don’t have permission to perform this action.";
  if (status === 404) return "We couldn’t find what you requested.";
  if (status === 409) return apiMsg || "This already exists. Try a different value.";
  if (status >= 500) return "Something went wrong on our side. Please try again.";

  return apiMsg || err?.message || "Something went wrong. Please try again.";
}