// ─── App Constants ──────────────────────────────────────────────────────────

export const APP_NAME = 'AboTracker';
export const APP_VERSION = '1.0.0';

// ─── Storage Keys ───────────────────────────────────────────────────────────

export const STORAGE_KEYS = {
  SUBSCRIPTIONS: '@abotracker/subscriptions',
  USER: '@abotracker/user',
  THEME: '@abotracker/theme',
  AUTH_TOKEN: '@abotracker/auth_token',
  REFRESH_TOKEN: '@abotracker/refresh_token',
  TOKEN_EXPIRES_AT: '@abotracker/token_expires_at',
  MFA_VERIFIED: '@abotracker/mfa_verified',
  ONBOARDING_COMPLETE: '@abotracker/onboarding_complete',
} as const;

// ─── API ────────────────────────────────────────────────────────────────────

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://subscription-control.oberndt.de';

// ─── OneSignal ──────────────────────────────────────────────────────────────

export const ONESIGNAL_APP_ID = 'YOUR_ONESIGNAL_APP_ID'; // TODO: Replace with actual ID

// ─── Dashboard Limits ───────────────────────────────────────────────────────

export const DASHBOARD_MAX_UPCOMING = 5;
export const DASHBOARD_MAX_TRIALS = 5;
export const DASHBOARD_MAX_CANCELLATIONS = 5;

// ─── Currency ───────────────────────────────────────────────────────────────

export const DEFAULT_CURRENCY = 'EUR';
export const CURRENCY_SYMBOL = '€';
