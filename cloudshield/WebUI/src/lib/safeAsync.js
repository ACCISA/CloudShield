/* Utility function to safely execute async functions with error handling and optional toast notifications
    * Usage: await safeAsync(() => fetchData(), { toast, minDelay: 500 });
    * The function will execute the provided async function and catch any errors that occur.
    * It enforces a minimum execution time to prevent UI loading skeletons from flashing abruptly.
*/
import { getUserErrorMessage } from "./errors";

export async function safeAsync(fn, { toast, minDelay = 500 } = {}) {
  const start = Date.now();

  try {
    const result = await fn();
    
    // Calculate how long the request took
    const elapsed = Date.now() - start;
    
    // If it was too fast, wait for the remaining time
    if (elapsed < minDelay) {
      await new Promise(resolve => setTimeout(resolve, minDelay - elapsed));
    }
    
    return result;
  } catch (err) {
    const elapsed = Date.now() - start;
    if (elapsed < minDelay) {
      await new Promise(resolve => setTimeout(resolve, minDelay - elapsed));
    }

    const msg = getUserErrorMessage(err);
    toast?.error?.(msg);
    throw err;
  }
}