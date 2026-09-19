import { useEffect, useRef } from 'react';
import { useAuth } from './useAuth';
import { SubscriptionService } from '../services/subscription.service';
import { NotificationSettingService } from '../services/backend/notificationSetting.service';
import { NotificationService } from '../services/notification.service';
import { StorageService } from '../services/storage.service';
import { dueWithin, type DueReminder } from '../utils/reminders';
import { formatCurrency, formatDate } from '../utils/formatters';
import { DEFAULT_REMINDER_DAYS_BEFORE, STORAGE_KEYS } from '../utils/constants';
import type { PushPayload } from '../services/notification.shared';

// ─── Erinnerungen beim App-Start ──────────────────────────────────────────────
//
// Beim Start scannt der Hook einmalig alle lokalen Abos und benachrichtigt für
// jedes „demnächst" ablaufende Abo (innerhalb `reminderDaysBefore` Tagen). Die
// Zustellung übernimmt `NotificationService.notifyReminder` plattformabhängig:
//  · Web    → lokale Browser-Benachrichtigung (OneSignal-REST ist per CORS blockiert)
//  · Native → OneSignal-Push an die eigene External-ID
// Eine Dedup-Schicht verhindert Mehrfach-Benachrichtigungen bei wiederholten
// Starts am selben Tag.
//
// Performance: Der Hook selbst ist bewusst schlank – kein State, keine
// Re-Renders. Die eigentliche Arbeit läuft in einer modulweiten Funktion
// (nicht bei jedem Render neu erzeugt) und liest den lokalen Cache genau einmal
// pro Nutzer/Start (kein Abo der Subscriptions-Liste → keine Render-Kopplung).

/** Dedup-Store: reminderKey → ISO-Zeitpunkt des letzten Versands. */
type SentMap = Record<string, string>;

/** Erneuter Versand desselben Reminders frühestens nach diesem Fenster. */
const RESEND_AFTER_MS = 20 * 60 * 60 * 1000; // 20 Stunden

function buildPush(reminder: DueReminder): PushPayload {
  const { subscription: sub, kind, days } = reminder;
  const inDays = days <= 0 ? 'heute' : days === 1 ? 'morgen' : `in ${days} Tagen`;

  if (kind === 'cancellation') {
    return {
      title: `Kündigungsfrist: ${sub.name}`,
      message: `${sub.name} ist ${inDays} kündbar (Frist ${formatDate(reminder.date)}).`,
      data: { subscriptionId: sub.id, kind },
    };
  }
  return {
    title: `Verlängerung: ${sub.name}`,
    message: `${sub.name} verlängert sich ${inDays} für ${formatCurrency(sub.amount)}.`,
    data: { subscriptionId: sub.id, kind },
  };
}

/**
 * Scannt die lokalen Abos und stellt fällige Erinnerungen zu.
 * Robust: bricht bei deaktivierter Einstellung geräuschlos ab; einzelne
 * Fehlversuche beeinträchtigen die App nicht.
 *
 * Auch von außen aufrufbar (z. B. direkt nach dem Erteilen der Erlaubnis über
 * den Profil-Button), damit die erste Benachrichtigung sofort erscheint.
 */
export async function runReminderScan(externalId: string): Promise<void> {
  const setting = await NotificationSettingService.get();
  if (!setting.enabled) return;

  const windowDays = setting.reminderDaysBefore ?? DEFAULT_REMINDER_DAYS_BEFORE;

  const subscriptions = await SubscriptionService.getCached();
  const due = dueWithin(subscriptions, windowDays);
  if (due.length === 0) return;

  const sent = (await StorageService.get<SentMap>(STORAGE_KEYS.PUSH_REMINDERS_SENT)) ?? {};
  const now = Date.now();

  // Nur noch nicht (kürzlich) zugestellte Erinnerungen berücksichtigen.
  const pending = due.filter((reminder) => {
    const last = sent[reminder.key];
    return !last || now - new Date(last).getTime() > RESEND_AFTER_MS;
  });
  if (pending.length === 0) return;

  // Parallel zustellen; nur erfolgreiche Zustellungen als „gesendet" markieren.
  const results = await Promise.all(
    pending.map(async (reminder) => {
      const ok = await NotificationService.notifyReminder(externalId, buildPush(reminder));
      return { key: reminder.key, ok };
    })
  );

  const nowIso = new Date().toISOString();
  let changed = false;
  for (const { key, ok } of results) {
    if (ok) {
      sent[key] = nowIso;
      changed = true;
    }
  }
  if (changed) {
    await StorageService.set(STORAGE_KEYS.PUSH_REMINDERS_SENT, sent);
  }
}

/**
 * Stößt den Reminder-Scan einmal pro angemeldetem Nutzer an. In `_layout`
 * einhängen, damit er beim App-Start (nach Login) läuft.
 *
 * Hinweis: Hier wird NICHT nach der Erlaubnis gefragt – Browser unterdrücken
 * einen Prompt ohne Nutzer-Geste. Die Erlaubnis wird über den Button im Profil
 * angefragt ({@link runReminderScan} liefert dann sofort die erste Erinnerung).
 * Fehlt die Erlaubnis, läuft der Scan trotzdem, stellt aber nichts zu.
 */
export function usePushReminders(): void {
  const { user } = useAuth();
  const ranForUser = useRef<string | null>(null);

  useEffect(() => {
    const userId = user?.id;
    if (!userId) {
      ranForUser.current = null; // nach Logout wieder scharf schalten
      return;
    }
    if (ranForUser.current === userId) return; // pro Nutzer/Start nur einmal
    ranForUser.current = userId;

    void runReminderScan(userId);
  }, [user?.id]);
}
