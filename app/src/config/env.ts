/**
 * Environment-driven config. Reads from EXPO_PUBLIC_* env vars at bundle time.
 * See app/.env for development defaults.
 */

export const env = {
  API_BASE_URL:
    process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3000',
  USE_MOCK: (process.env.EXPO_PUBLIC_USE_MOCK ?? 'true') === 'true',
} as const;
