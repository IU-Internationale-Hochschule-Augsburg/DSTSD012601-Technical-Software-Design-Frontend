import { CURRENCY_SYMBOL } from './constants';

/**
 * Formats a number as EUR currency string.
 * @example formatCurrency(9.99) → "9,99 €"
 */
export function formatCurrency(amount: number): string {
  return `${amount.toFixed(2).replace('.', ',')} ${CURRENCY_SYMBOL}`;
}

/**
 * Formats an ISO date string to a localized German date.
 * @example formatDate('2026-05-15') → "15.05.2026"
 */
export function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Formats a date as relative text (e.g., "in 3 Tagen", "morgen").
 */
export function formatRelativeDate(isoDate: string): string {
  const now = new Date();
  const target = new Date(isoDate);
  const diffMs = target.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return `vor ${Math.abs(diffDays)} Tagen`;
  if (diffDays === 0) return 'heute';
  if (diffDays === 1) return 'morgen';
  if (diffDays <= 7) return `in ${diffDays} Tagen`;
  if (diffDays <= 30) return `in ${Math.ceil(diffDays / 7)} Wochen`;
  return `in ${Math.ceil(diffDays / 30)} Monaten`;
}

/**
 * Returns the payment day ordinal string.
 * @example formatPaymentDay(1) → "1."
 */
export function formatPaymentDay(day: number): string {
  return `${day}.`;
}

/**
 * Generates a simple UUID v4.
 */
export function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
