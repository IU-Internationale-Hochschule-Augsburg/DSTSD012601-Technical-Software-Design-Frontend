import { getNextBillingDate, type BillingCycle, type Guid } from '../../types/backend';
import { ApiService } from '../api.service';
import { StorageService } from '../storage.service';
import { STORAGE_KEYS } from '../../utils/constants';

type BillingCycleMap = Record<Guid, BillingCycle>;

/**
 * `BillingCycle` ist ein Value Object (1:1 zum Abonnement, ohne eigene Id).
 * Es wird lokal als Map `subscriptionId -> BillingCycle` gehalten und über den
 * Subscription-Endpunkt synchronisiert (`/subscriptions/{id}/billing-cycle`).
 */
export const BillingCycleService = {
  async getAll(): Promise<BillingCycleMap> {
    const map = await StorageService.get<BillingCycleMap>(STORAGE_KEYS.BACKEND_BILLING_CYCLES);
    return map ?? {};
  },

  /** Abrechnungszyklus eines Abonnements. */
  async get(subscriptionId: Guid): Promise<BillingCycle | null> {
    const map = await this.getAll();
    return map[subscriptionId] ?? null;
  },

  /** Lokal speichern (offline-first). */
  async set(subscriptionId: Guid, cycle: BillingCycle): Promise<BillingCycle> {
    const map = await this.getAll();
    map[subscriptionId] = cycle;
    await StorageService.set(STORAGE_KEYS.BACKEND_BILLING_CYCLES, map);
    return cycle;
  },

  /** Nächstes Abrechnungsdatum ab `from` (Domain-Methode `getNextDate`). */
  async getNextDate(subscriptionId: Guid, from: Date = new Date()): Promise<Date | null> {
    const cycle = await this.get(subscriptionId);
    return cycle ? getNextBillingDate(cycle, from) : null;
  },

  /** Lokalen Stand eines Abos zum Server pushen und zurückspeichern. */
  async sync(subscriptionId: Guid): Promise<BillingCycle | null> {
    const local = await this.get(subscriptionId);
    if (!local) return null;
    const remote = await ApiService.put<BillingCycle>(
      `/subscriptions/${subscriptionId}/billing-cycle`,
      local
    );
    return this.set(subscriptionId, remote);
  },
};
