// ─── App Constants ──────────────────────────────────────────────────────────

export const APP_NAME = 'AboTracker';
export const APP_VERSION = '0.1.5';

// ─── Standalone Mode ────────────────────────────────────────────────────────

/** Standalone-Modus: Wenn true, wird nicht versucht, den Server zu erreichen. */
export const STANDALONE = false;

// ─── Storage Keys ───────────────────────────────────────────────────────────

export const STORAGE_KEYS = {
  SUBSCRIPTIONS: '@abotracker/subscriptions',
  SUBSCRIPTIONS_QUEUE: '@abotracker/subscriptions_queue',
  USER: '@abotracker/user',
  THEME: '@abotracker/theme',
  AUTH_TOKEN: '@abotracker/auth_token',
  REFRESH_TOKEN: '@abotracker/refresh_token',
  TOKEN_EXPIRES_AT: '@abotracker/token_expires_at',
  MFA_VERIFIED: '@abotracker/mfa_verified',
  ONBOARDING_COMPLETE: '@abotracker/onboarding_complete',

  // ─── Backend / Offline-Sync Stores ─────────────────────────────────────────
  BACKEND_USERS: '@abotracker/backend/users',
  BACKEND_SUBSCRIPTIONS: '@abotracker/backend/subscriptions',
  BACKEND_CATEGORIES: '@abotracker/backend/categories',
  BACKEND_NOTIFICATIONS: '@abotracker/backend/notifications',
  BACKEND_BILLING_CYCLES: '@abotracker/backend/billing_cycles',
  BACKEND_NOTIFICATION_SETTINGS: '@abotracker/backend/notification_settings',
} as const;

// ─── Backend API ────────────────────────────────────────────────────────────

/** Basis-URL des Backend-Servers. Per Env überschreibbar (Expo). */
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://subscription-control.oberndt.de';

export const API_TIMEOUT_MS = 15000;

// ─── OneSignal ──────────────────────────────────────────────────────────────

export const ONESIGNAL_APP_ID = 'YOUR_ONESIGNAL_APP_ID'; // TODO: Replace with actual ID

// ─── Dashboard Limits ───────────────────────────────────────────────────────

export const DASHBOARD_MAX_UPCOMING = 5;
export const DASHBOARD_MAX_TRIALS = 5;
export const DASHBOARD_MAX_CANCELLATIONS = 5;

// ─── Currency ───────────────────────────────────────────────────────────────

export const DEFAULT_CURRENCY = 'EUR';
export const CURRENCY_SYMBOL = '€';
