// ─── Backend Entity Types ─────────────────────────────────────────────────────
//
// Diese Typen spiegeln 1:1 die Entitäten des Backend-Servers wider (siehe
// Klassendiagramm). Sie sind bewusst von den UI-Typen in `./index.ts` getrennt,
// da das UI ein anderes (flacheres) Modell verwendet.

export type Guid = string;
export type IsoDateString = string;

// ─── Enums ────────────────────────────────────────────────────────────────────

export enum IntervalType {
  DAY = 'DAY',
  WEEK = 'WEEK',
  MONTH = 'MONTH',
  YEAR = 'YEAR',
}

export enum NotificationType {
  PAYMENT_REMINDER = 'PAYMENT_REMINDER',
  CANCELLATION_REMINDER = 'CANCELLATION_REMINDER',
  TRIAL_END_REMINDER = 'TRIAL_END_REMINDER',
  CUSTOM = 'CUSTOM',
}

// ─── Value Objects ──────────────────────────────────────────────────────────────

/** Abrechnungszyklus eines Abonnements (Value Object, kein eigenes Id). */
export interface BillingCycle {
  type: IntervalType;
  intervalValue: number;
}

/** Benachrichtigungs-Einstellungen eines Users (Value Object, kein eigenes Id). */
export interface NotificationSetting {
  enabled: boolean;
  reminderDaysBefore: number;
}

// ─── Entities ───────────────────────────────────────────────────────────────────

export interface Category {
  id: Guid;
  name: string;
  icon: string;
}

export interface Notification {
  id: Guid;
  subscriptionId: Guid;
  type: NotificationType;
  message?: string | null;
  scheduledFor: IsoDateString;
}

export interface Subscription {
  id: Guid;
  userId: Guid;
  name: string;
  provider: string;
  category: Category;
  cost: number;
  currency: string;
  billingCycle: BillingCycle;
  startDate: IsoDateString;
  endDate?: IsoDateString | null;
  cancellationDeadline?: IsoDateString | null;
  autoRenew: boolean;
  notes?: string | null;
  isActive: boolean;
  notifications?: Notification[];
}

export interface User {
  id: Guid;
  /** Wird vom Server nie an den Client ausgeliefert – nur für Vollständigkeit. */
  passwordHash?: string;
  email: string;
  name: string;
  timezone: string;
  notificationSettings: NotificationSetting;
  subscriptions: Subscription[];
}

// ─── Sync Types ─────────────────────────────────────────────────────────────────

/** Jede synchronisierbare Entität benötigt eine stabile Id. */
export interface SyncableEntity {
  id: Guid;
}

/** Metadaten, die den lokalen Stand gegenüber dem Server beschreiben. */
export interface SyncMetadata {
  lastSyncedAt: IsoDateString | null;
  pendingCreateIds: Guid[];
  pendingUpdateIds: Guid[];
  pendingDeleteIds: Guid[];
}

/** Lokal in AsyncStorage abgelegte Struktur pro Entitätstyp. */
export interface LocalEntityStore<T extends SyncableEntity> {
  items: T[];
  sync: SyncMetadata;
}

export interface SyncResult {
  pushed: number;
  pulled: number;
  conflicts: number;
  errors: string[];
}

// ─── Domain-Logik (entspricht den Methoden im Klassendiagramm) ───────────────────

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Entspricht `BillingCycle.getNextDate(from)`. */
export function getNextBillingDate(cycle: BillingCycle, from: IsoDateString | Date): Date {
  const date = new Date(from);
  const value = cycle.intervalValue;
  switch (cycle.type) {
    case IntervalType.DAY:
      date.setDate(date.getDate() + value);
      break;
    case IntervalType.WEEK:
      date.setDate(date.getDate() + value * 7);
      break;
    case IntervalType.MONTH:
      date.setMonth(date.getMonth() + value);
      break;
    case IntervalType.YEAR:
      date.setFullYear(date.getFullYear() + value);
      break;
  }
  return date;
}

/** Entspricht `Subscription.calculateMonthlyCost()` – normiert auf einen Monat. */
export function calculateMonthlyCost(sub: Subscription): number {
  const { type, intervalValue } = sub.billingCycle;
  if (intervalValue <= 0) return sub.cost;
  switch (type) {
    case IntervalType.DAY:
      return (sub.cost / intervalValue) * (365 / 12);
    case IntervalType.WEEK:
      return (sub.cost / intervalValue) * (52 / 12);
    case IntervalType.MONTH:
      return sub.cost / intervalValue;
    case IntervalType.YEAR:
      return sub.cost / (intervalValue * 12);
    default:
      return sub.cost;
  }
}

/** Entspricht `Subscription.calculateNextPaymentDate()`. */
export function calculateNextPaymentDate(sub: Subscription, now: Date = new Date()): Date {
  let next = new Date(sub.startDate);
  // Vom Startdatum so lange weiterspringen, bis wir in der Zukunft sind.
  let guard = 0;
  while (next.getTime() <= now.getTime() && guard < 1000) {
    next = getNextBillingDate(sub.billingCycle, next);
    guard += 1;
  }
  return next;
}

/** Entspricht `Subscription.calculateCancellationDate()` – letzter Kündigungstag. */
export function calculateCancellationDate(sub: Subscription, now: Date = new Date()): Date | null {
  if (sub.cancellationDeadline) return new Date(sub.cancellationDeadline);
  // Fallback: nächster Zahlungstermin minus Kündigungsfrist gibt es im Modell nicht,
  // daher liefern wir den nächsten Zahlungstermin als spätesten Kündigungszeitpunkt.
  if (!sub.autoRenew) return null;
  return calculateNextPaymentDate(sub, now);
}

/** Tage bis zu einem Datum (kann negativ sein, wenn in der Vergangenheit). */
export function daysUntil(date: IsoDateString | Date, now: Date = new Date()): number {
  return Math.ceil((new Date(date).getTime() - now.getTime()) / MS_PER_DAY);
}
