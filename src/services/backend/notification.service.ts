import type { Guid, Notification } from '../../types/backend';
import { createSyncService } from '../sync.service';
import { STORAGE_KEYS } from '../../utils/constants';

const base = createSyncService<Notification>({
  storageKey: STORAGE_KEYS.BACKEND_NOTIFICATIONS,
  endpoint: '/notifications',
});

/**
 * Lokaler, mit dem Backend synchronisierter Store für Benachrichtigungen.
 * Erweitert den generischen Service um eine Abfrage je Abonnement.
 */
export const NotificationService = {
  ...base,

  /** Alle Benachrichtigungen eines Abonnements. */
  async getBySubscription(subscriptionId: Guid): Promise<Notification[]> {
    const all = await base.getAll();
    return all.filter((n) => n.subscriptionId === subscriptionId);
  },
};
