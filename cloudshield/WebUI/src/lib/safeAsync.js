/* Utility function to safely execute async functions with error handling and optional toast notifications
    * Usage: await safeAsync(() => fetchData(), { toast });
    * The function will execute the provided async function and catch any errors that occur.
    * If an error occurs, it will extract a user-friendly message and display it using the toast system. 
*/
import { getUserErrorMessage } from "./errors";

export async function safeAsync(fn, { toast } = {}) {
  try {
    return await fn();
  } catch (err) {
    const msg = getUserErrorMessage(err);
    toast?.error?.(msg);
    throw err;
  }
}