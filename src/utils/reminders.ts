import type { Subscription } from '../types';

// ─── Reminder-Kernlogik (geteilt: Erinnerungs-Screen + Push-Versand) ──────────
//
// Eine einzige, seiteneffektfreie Quelle für „welche Abos laufen wann ab".
// So verhalten sich die UI-Liste und die Push-Erinnerungen garantiert gleich.

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export type ReminderKind = 'cancellation' | 'renewal';

export interface DueReminder {
  /** Stabiler Schlüssel je Abo+Art – dient auch der Push-Deduplizierung. */
  key: string;
  subscription: Subscription;
  kind: ReminderKind;
  /** ISO-Datum des Ereignisses (Kündigungsfrist bzw. Verlängerung). */
  date: string;
  /** Ganze Tage ab „heute 00:00" (kann 0 sein = heute). */
  days: number;
}

/**
 * Ganze Tage bis zu einem Datum, gemessen ab Mitternacht des heutigen Tages.
 * Dadurch ist „in 3 Tagen" unabhängig von der Uhrzeit stabil (deterministisch).
 */
export function daysUntil(isoDate: string, now: Date = new Date()): number {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.ceil((new Date(isoDate).getTime() - startOfToday.getTime()) / MS_PER_DAY);
}

/**
 * Alle künftigen Erinnerungen (Kündigungsfristen + Verlängerungen) über alle
 * Abos, chronologisch aufsteigend. Vergangene Termine werden ausgeblendet.
 */
export function collectReminders(subscriptions: Subscription[], now: Date = new Date()): DueReminder[] {
  const list: DueReminder[] = [];

  for (const sub of subscriptions) {
    if (sub.nextCancellationDate) {
      list.push({
        key: `${sub.id}:cancellation:${sub.nextCancellationDate}`,
        subscription: sub,
        kind: 'cancellation',
        date: sub.nextCancellationDate,
        days: daysUntil(sub.nextCancellationDate, now),
      });
    }
    if (sub.nextPaymentDate) {
      list.push({
        key: `${sub.id}:renewal:${sub.nextPaymentDate}`,
        subscription: sub,
        kind: 'renewal',
        date: sub.nextPaymentDate,
        days: daysUntil(sub.nextPaymentDate, now),
      });
    }
  }

  return list.filter((item) => item.days >= 0).sort((a, b) => a.days - b.days);
}

/**
 * Nur die Erinnerungen, die innerhalb von `withinDays` Tagen fällig sind –
 * die „demnächst ablaufenden" Abos, für die eine Push-Erinnerung rausgeht.
 */
export function dueWithin(
  subscriptions: Subscription[],
  withinDays: number,
  now: Date = new Date()
): DueReminder[] {
  return collectReminders(subscriptions, now).filter((item) => item.days <= withinDays);
}
