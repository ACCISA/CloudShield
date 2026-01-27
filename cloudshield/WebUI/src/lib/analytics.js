import posthog from 'posthog-js';

// Support both VITE_POSTHOG_* and VITE_PUBLIC_POSTHOG_* so the wizard values work.
const KEY = import.meta.env.VITE_POSTHOG_KEY || import.meta.env.VITE_PUBLIC_POSTHOG_KEY;
const HOST = import.meta.env.VITE_POSTHOG_HOST || import.meta.env.VITE_PUBLIC_POSTHOG_HOST;
const ENABLED = (import.meta.env.VITE_POSTHOG_ENABLED ?? 'true') === 'true';

const initialized = ENABLED && Boolean(KEY) && Boolean(HOST);

if (initialized) {
  posthog.init(KEY, {
    api_host: HOST,
    capture_pageview: false,
    capture_pageleave: false,
  });
}

export function trackButton(name, meta = {}) {
  if (!initialized) return;
  posthog.capture('button_click', { name: name || 'button', ...meta });
}

export function trackEvent(event, payload = {}) {
  if (!initialized || !event) return;
  posthog.capture(event, payload);
}

export function isAnalyticsEnabled() {
  return initialized;
}