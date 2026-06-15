// ─── Subscription Types ─────────────────────────────────────────────────────

export enum SubscriptionCategory {
  STREAMING = 'STREAMING',
  MUSIC = 'MUSIC',
  SOFTWARE = 'SOFTWARE',
  FITNESS = 'FITNESS',
  FOOD = 'FOOD',
  INSURANCE = 'INSURANCE',
  PHONE = 'PHONE',
  INTERNET = 'INTERNET',
  CLOUD = 'CLOUD',
  GAMING = 'GAMING',
  NEWS = 'NEWS',
  OTHER = 'OTHER',
}

export const CATEGORY_LABELS: Record<SubscriptionCategory, string> = {
  [SubscriptionCategory.STREAMING]: 'Streaming',
  [SubscriptionCategory.MUSIC]: 'Musik',
  [SubscriptionCategory.SOFTWARE]: 'Software',
  [SubscriptionCategory.FITNESS]: 'Fitness',
  [SubscriptionCategory.FOOD]: 'Essen & Trinken',
  [SubscriptionCategory.INSURANCE]: 'Versicherung',
  [SubscriptionCategory.PHONE]: 'Telefon',
  [SubscriptionCategory.INTERNET]: 'Internet',
  [SubscriptionCategory.CLOUD]: 'Cloud',
  [SubscriptionCategory.GAMING]: 'Gaming',
  [SubscriptionCategory.NEWS]: 'Nachrichten',
  [SubscriptionCategory.OTHER]: 'Sonstiges',
};

export const CATEGORY_ICONS: Record<SubscriptionCategory, string> = {
  [SubscriptionCategory.STREAMING]: 'television-play',
  [SubscriptionCategory.MUSIC]: 'music',
  [SubscriptionCategory.SOFTWARE]: 'application-cog',
  [SubscriptionCategory.FITNESS]: 'dumbbell',
  [SubscriptionCategory.FOOD]: 'food',
  [SubscriptionCategory.INSURANCE]: 'shield-check',
  [SubscriptionCategory.PHONE]: 'cellphone',
  [SubscriptionCategory.INTERNET]: 'web',
  [SubscriptionCategory.CLOUD]: 'cloud',
  [SubscriptionCategory.GAMING]: 'gamepad-variant',
  [SubscriptionCategory.NEWS]: 'newspaper',
  [SubscriptionCategory.OTHER]: 'dots-horizontal-circle',
};

export interface Subscription {
  id: string;
  name: string;
  category: SubscriptionCategory;
  cancellationPeriod: string; // e.g. "1 Monat", "2 Wochen"
  paymentDay: number; // Tag des Monats (1-31)
  amount: number; // Betrag in EUR
  currency: string; // Default: 'EUR'
  isTrialPeriod: boolean;
  trialEndDate?: string; // ISO date
  nextPaymentDate: string; // ISO date
  nextCancellationDate?: string; // ISO date
  notes?: string;
  createdAt: string; // ISO date
  updatedAt: string; // ISO date
}

// ─── Sorting & Filtering ────────────────────────────────────────────────────

export type SortField = 'name' | 'amount' | 'paymentDay' | 'nextPaymentDate' | 'category';
export type SortDirection = 'asc' | 'desc';

export interface SortOption {
  field: SortField;
  direction: SortDirection;
}

export interface FilterOptions {
  categories: SubscriptionCategory[];
  minAmount?: number;
  maxAmount?: number;
  searchQuery: string;
}

// ─── User / Auth Types ──────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  mfaEnabled: boolean;
  provider: string;
  createdAt: string;
}

export enum AuthProvider {
  EMAIL = 'EMAIL',
  GOOGLE = 'GOOGLE',
  APPLE = 'APPLE',
}

export type ThemeMode = 'light' | 'dark';
