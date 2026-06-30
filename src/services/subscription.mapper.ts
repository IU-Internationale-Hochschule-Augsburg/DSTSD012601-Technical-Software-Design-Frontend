import { type Subscription, SubscriptionCategory, CATEGORY_LABELS } from '../types';
import { ApiClient } from './api.client';

// Backend types (siehe openapi-auth.json)
// IntervalType enum is undocumented numerically → annahme:
// 0=DAYS, 1=WEEKS, 2=MONTHS, 3=YEARS
enum IntervalType {
  DAYS = 0,
  WEEKS = 1,
  MONTHS = 2,
  YEARS = 3,
}

const INTERVAL_LABELS: Record<IntervalType, [singular: string, plural: string]> = {
  [IntervalType.DAYS]: ['Tag', 'Tage'],
  [IntervalType.WEEKS]: ['Woche', 'Wochen'],
  [IntervalType.MONTHS]: ['Monat', 'Monate'],
  [IntervalType.YEARS]: ['Jahr', 'Jahre'],
};

interface BillingCycleResponse {
  id: string;
  intervalTypeValue: IntervalType;
  intervalValue: number | string;
}

interface CategoryResponse {
  id: string;
  name: string;
  icon?: string;
}

export interface SubscriptionBackend {
  id: string;
  userId: string;
  name: string;
  provider?: string;
  categoryId: string;
  category?: CategoryResponse | null;
  cost: number | string;
  currency: string;
  billingCycleId: string;
  billingCycle?: BillingCycleResponse | null;
  startDate: string;
  endDate?: string | null;
  cancellationDeadline?: string | null;
  autoRenew: boolean;
  notes?: string;
  isActive: boolean;
  monthlyCost?: number | string;
  nextPaymentDate: string;
  cancellationDate?: string;
}

export interface CreateSubscriptionBackend {
  userId: string;
  name: string;
  provider?: string;
  categoryId: string;
  cost: number;
  currency: string;
  billingCycleId: string;
  startDate: string;
  endDate?: string | null;
  cancellationDeadline?: string | null;
  autoRenew: boolean;
  notes?: string;
  isActive: boolean;
}

// ─── Backend → Local ──────────────────────────────────────────────────────

function categoryFromName(name?: string): SubscriptionCategory {
  if (!name) return SubscriptionCategory.OTHER;
  const lower = name.toLowerCase();
  const hit = (Object.entries(CATEGORY_LABELS) as [SubscriptionCategory, string][]).find(
    ([key, label]) => key.toLowerCase() === lower || label.toLowerCase() === lower
  );
  return hit ? hit[0] : SubscriptionCategory.OTHER;
}

function cancellationPeriodFromCycle(cycle?: BillingCycleResponse | null): string {
  if (!cycle) return '';
  const value = Number(cycle.intervalValue);
  const labels = INTERVAL_LABELS[cycle.intervalTypeValue] ?? ['', ''];
  return `${value} ${value === 1 ? labels[0] : labels[1]}`.trim();
}

export function backendToLocal(b: SubscriptionBackend): Subscription {
  const next = b.nextPaymentDate || b.startDate;
  return {
    id: b.id,
    name: b.name,
    category: categoryFromName(b.category?.name),
    cancellationPeriod: cancellationPeriodFromCycle(b.billingCycle),
    paymentDay: next ? new Date(next).getDate() : 1,
    amount: Number(b.cost),
    currency: b.currency || 'EUR',
    isTrialPeriod: b.autoRenew === false && !!b.endDate,
    trialEndDate: b.autoRenew === false ? b.endDate ?? undefined : undefined,
    nextPaymentDate: next,
    nextCancellationDate: b.cancellationDeadline ?? b.cancellationDate ?? undefined,
    notes: b.notes,
    createdAt: b.startDate,
    updatedAt: new Date().toISOString(),
  };
}

// ─── Local → Backend (resolves category + billingCycle IDs) ───────────────

interface ResolverCaches {
  categories: CategoryResponse[];
  billingCycles: BillingCycleResponse[];
}

let caches: ResolverCaches | null = null;

async function loadCaches(): Promise<ResolverCaches> {
  if (caches) return caches;
  const [categories, billingCycles] = await Promise.all([
    ApiClient.get<CategoryResponse[]>('/api/Categories').catch(() => []),
    ApiClient.get<BillingCycleResponse[]>('/api/BillingCycles').catch(() => []),
  ]);
  caches = { categories: categories ?? [], billingCycles: billingCycles ?? [] };
  return caches;
}

export function invalidateCaches() {
  caches = null;
}

/**
 * Normalisiert die Kategorie robust auf einen gültigen Enum-Wert.
 * Akzeptiert: Enum-String, Label, oder ein Alt-/Dropdown-Objekt `{id,title}`.
 */
function normalizeCategory(local: unknown): SubscriptionCategory {
  if (typeof local === 'string') {
    if (local in CATEGORY_LABELS) return local as SubscriptionCategory;
    const byLabel = (Object.entries(CATEGORY_LABELS) as [SubscriptionCategory, string][]).find(
      ([, l]) => l.toLowerCase() === local.toLowerCase()
    );
    return byLabel ? byLabel[0] : SubscriptionCategory.OTHER;
  }
  if (local && typeof local === 'object') {
    const title = (local as { title?: unknown }).title;
    if (typeof title === 'string') return normalizeCategory(title);
  }
  return SubscriptionCategory.OTHER;
}

async function resolveCategoryId(local: SubscriptionCategory): Promise<string> {
  const c = await loadCaches();
  const key = normalizeCategory(local);
  const label = CATEGORY_LABELS[key];

  const existing = c.categories.find(
    (cat) =>
      cat.name.toLowerCase() === label.toLowerCase() ||
      cat.name.toLowerCase() === key.toLowerCase()
  );
  if (existing) return existing.id;

  const created = await ApiClient.post<CategoryResponse>('/api/Categories', {
    name: label,
    icon: key.toLowerCase(),
  });
  if (created) c.categories.push(created);
  return created!.id;
}

function parseCancellationPeriod(input: string): { intervalTypeValue: IntervalType; intervalValue: number } {
  const match = input.match(/(\d+)\s*(.+)/);
  const value = match ? Number(match[1]) : 1;
  const unit = (match?.[2] ?? '').toLowerCase();
  if (unit.startsWith('tag')) return { intervalTypeValue: IntervalType.DAYS, intervalValue: value };
  if (unit.startsWith('woch')) return { intervalTypeValue: IntervalType.WEEKS, intervalValue: value };
  if (unit.startsWith('jahr')) return { intervalTypeValue: IntervalType.YEARS, intervalValue: value };
  return { intervalTypeValue: IntervalType.MONTHS, intervalValue: value };
}

async function resolveBillingCycleId(period: string): Promise<string> {
  const c = await loadCaches();
  const target = parseCancellationPeriod(period);
  const existing = c.billingCycles.find(
    (b) =>
      Number(b.intervalValue) === target.intervalValue &&
      b.intervalTypeValue === target.intervalTypeValue
  );
  if (existing) return existing.id;

  const created = await ApiClient.post<BillingCycleResponse>('/api/BillingCycles', target);
  if (created) c.billingCycles.push(created);
  return created!.id;
}

export async function localToBackendCreate(
  sub: Subscription,
  userId: string
): Promise<CreateSubscriptionBackend> {
  const [categoryId, billingCycleId] = await Promise.all([
    resolveCategoryId(sub.category),
    resolveBillingCycleId(sub.cancellationPeriod),
  ]);

  return {
    userId,
    name: sub.name,
    categoryId,
    cost: Number(sub.amount),
    currency: sub.currency || 'EUR',
    billingCycleId,
    startDate: sub.nextPaymentDate || new Date().toISOString(),
    endDate: sub.isTrialPeriod ? sub.trialEndDate ?? null : null,
    cancellationDeadline: sub.nextCancellationDate ?? null,
    autoRenew: !sub.isTrialPeriod,
    notes: sub.notes,
    isActive: true,
  };
}
