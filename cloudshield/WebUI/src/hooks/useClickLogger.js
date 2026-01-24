import { useCallback } from 'react';
import { trackButton } from '../lib/analytics';

// Wraps button handlers so clicks are logged before user code runs
export function useClickLogger(defaultMeta = {}) {
  return useCallback(
    ({ name, ...meta } = {}) =>
      (userHandler) =>
        (event) => {
          trackButton(name || 'button', { ...defaultMeta, ...meta });
          if (typeof userHandler === 'function') {
            userHandler(event);
          }
        },
    [defaultMeta],
  );
}
