import {
  calculateMonthlyCost,
  calculateNextPaymentDate,
  calculateCancellationDate,
  type Guid,
  type Subscription,
} from '../../types/backend';
import { createSyncService } from '../sync.service';
import { STORAGE_KEYS } from '../../utils/constants';

const base = createSyncService<Subscription>({
  storageKey: STORAGE_KEYS.BACKEND_SUBSCRIPTIONS,
  endpoint: '/subscriptions',
});

/**
 * Lokaler, mit dem Backend synchronisierter Store für Abonnements.
 * Bündelt zusätzlich die Domain-Berechnungen aus dem Klassendiagramm.
 */
export const BackendSubscriptionService = {
  ...base,

  /** Alle Abonnements eines Users. */
  async getByUser(userId: Guid): Promise<Subscription[]> {
    const all = await base.getAll();
    return all.filter((s) => s.userId === userId);
  },

  /** Summe der monatlich normierten Kosten aller aktiven Abos. */
  async getTotalMonthlyCost(userId?: Guid): Promise<number> {
    const all = await base.getAll();
    return all
      .filter((s) => s.isActive && (userId ? s.userId === userId : true))
      .reduce((sum, s) => sum + calculateMonthlyCost(s), 0);
  },

  // Domain-Methoden als Re-Exports für bequemen Zugriff am Service.
  calculateMonthlyCost,
  calculateNextPaymentDate,
  calculateCancellationDate,
};
