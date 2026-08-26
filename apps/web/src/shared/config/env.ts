/**
 * The browser bundle reads exactly one variable. Anything else the UI needs
 * comes from the API, so a rebuild is not required to change configuration.
 */
export const config = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? '',
  apiPrefix: '/api/v1',
} as const;
