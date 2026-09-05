// ─── App Constants ──────────────────────────────────────────────────────────

export const APP_NAME = 'AboTracker';
export const APP_VERSION = '1.3';

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
  MFA_SECRET: '@abotracker/mfa_secret',
  MFA_LOGIN_ENABLED: '@abotracker/mfa_login_enabled',
  ONBOARDING_COMPLETE: '@abotracker/onboarding_complete',

  /** Merkt bereits versendete Push-Erinnerungen (Dedup gegen Spam bei jedem Start). */
  PUSH_REMINDERS_SENT: '@abotracker/push_reminders_sent',

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

/**
 * OneSignal-Zugangsdaten – pflegbar über Environment-Variablen (Expo `.env`).
 *
 *  - `EXPO_PUBLIC_ONESIGNAL_APP_ID`       → App-ID (öffentlich, im Client sichtbar)
 *  - `EXPO_PUBLIC_ONESIGNAL_REST_API_KEY` → REST-API-Key zum *Senden* von Pushes
 *
 * Hinweis: Der REST-Key liegt im Web-Bundle offen (EXPO_PUBLIC_*). Für dieses
 * Studienprojekt ist das bewusst akzeptiert; produktiv gehörte der Versand
 * hinter ein Backend. Fehlen die Werte, arbeitet die App normal weiter – der
 * Push-Versand wird dann nur übersprungen (siehe `onesignal.rest.ts`).
 */
export const ONESIGNAL_APP_ID = process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID ?? '';
export const ONESIGNAL_REST_API_KEY = process.env.EXPO_PUBLIC_ONESIGNAL_REST_API_KEY ?? '';

/**
 * Web-SDK standardmäßig AUS. Im Browser bringt OneSignal aktuell keinen Nutzen
 * (REST-Versand ist per CORS blockiert, Zustellung läuft über lokale
 * Benachrichtigungen) und wirft bei nicht passender Web-Konfiguration Fehler
 * („AppID doesn't match existing apps"). Nur einschalten, wenn im OneSignal-
 * Dashboard eine Web-Plattform mit passender Site-URL eingerichtet ist UND ein
 * Backend den Versand übernimmt. Native ist davon unberührt (immer aktiv).
 */
export const ONESIGNAL_WEB_ENABLED = process.env.EXPO_PUBLIC_ONESIGNAL_WEB_ENABLED === 'true';

/** REST-Endpunkt für den Push-Versand (OneSignal API v16). */
export const ONESIGNAL_API_URL = 'https://api.onesignal.com/notifications';

// ─── Erinnerungen / Reminder ──────────────────────────────────────────────────

/**
 * Vorlauf-Fenster (Tage) aus dem Mockup „Erinnerungs-Regeln" – als konzeptuelle
 * Basis. Der tatsächliche Push-Trigger nutzt `NotificationSetting.reminderDaysBefore`
 * (Standard 3), damit die Frist in der App pflegbar bleibt.
 */
export const REMINDER_WINDOWS_DAYS = [30, 14, 3] as const;

/** Fallback-Vorlauf in Tagen, falls keine Einstellung vorliegt. */
export const DEFAULT_REMINDER_DAYS_BEFORE = 3;

// ─── Dashboard Limits ───────────────────────────────────────────────────────

export const DASHBOARD_MAX_UPCOMING = 5;
export const DASHBOARD_MAX_TRIALS = 5;
export const DASHBOARD_MAX_CANCELLATIONS = 5;

// ─── Currency ───────────────────────────────────────────────────────────────

export const DEFAULT_CURRENCY = 'EUR';
export const CURRENCY_SYMBOL = '€';
