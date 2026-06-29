import { useCallback, useEffect, useRef, useState } from 'react';
import type { Subscription, SortOption, FilterOptions } from '../types';
import { SubscriptionService } from '../services/subscription.service';

/**
 * Feature-Hook für Abonnements.
 *
 * Bindet den Backend-gestützten {@link SubscriptionService} (Sync gegen
 * `/api/Subscriptions` mit AsyncStorage als Offline-Cache) an die UI:
 *  - `loading`  → initiales Laden
 *  - `syncing`  → manueller Pull-to-Refresh
 * Mutationen schreiben über den Service (Backend + Cache) und aktualisieren
 * danach den lokalen State.
 */
export const useSubscriptions = () => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Verhindert State-Updates nach Unmount.
  const mounted = useRef(true);

  const load = useCallback(async (mode: 'initial' | 'refresh') => {
    if (mode === 'refresh') setSyncing(true);
    try {
      const data = await SubscriptionService.getSubscriptions();
      if (mounted.current) {
        setSubscriptions(data);
        setError(null);
      }
    } catch {
      if (mounted.current) setError('Fehler beim Laden der Abonnements.');
    } finally {
      if (mounted.current) {
        if (mode === 'initial') setLoading(false);
        else setSyncing(false);
      }
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    void load('initial');
    return () => {
      mounted.current = false;
    };
  }, [load]);

  const refresh = useCallback(() => load('refresh'), [load]);

  const addSubscription = useCallback(async (sub: Subscription) => {
    const created = await SubscriptionService.addSubscription(sub);
    if (mounted.current) setSubscriptions((prev) => [...prev, created]);
    return created;
  }, []);

  const updateSubscription = useCallback(
    async (id: string, updates: Partial<Subscription>) => {
      const updated = await SubscriptionService.updateSubscription(id, updates);
      if (updated && mounted.current) {
        setSubscriptions((prev) => prev.map((s) => (s.id === id ? updated : s)));
      }
      return updated;
    },
    []
  );

  const deleteSubscription = useCallback(async (id: string) => {
    await SubscriptionService.deleteSubscription(id);
    if (mounted.current) setSubscriptions((prev) => prev.filter((s) => s.id !== id));
    return true;
  }, []);

  const getFilteredAndSorted = useCallback(
    (filter: FilterOptions, sort: SortOption) => {
      let result = subscriptions;

      if (filter.categories.length > 0) {
        result = result.filter((s) => filter.categories.includes(s.category));
      }
      if (filter.searchQuery) {
        const query = filter.searchQuery.toLowerCase();
        result = result.filter((s) => s.name.toLowerCase().includes(query));
      }

      // Kopie nur zum Sortieren (sort mutiert in place).
      const sorted = [...result];
      const asc = sort.direction === 'asc';
      const field = sort.field;
      sorted.sort((a, b) => {
        const av = a[field];
        const bv = b[field];

        let cmp: number;
        if (field === 'nextPaymentDate') {
          // ISO-Datumsstrings chronologisch vergleichen.
          cmp = new Date(av as string).getTime() - new Date(bv as string).getTime();
        } else if (typeof av === 'number' && typeof bv === 'number') {
          cmp = av - bv;
        } else {
          cmp = String(av).localeCompare(String(bv), 'de', { sensitivity: 'base' });
        }

        return asc ? cmp : -cmp;
      });
      return sorted;
    },
    [subscriptions]
  );

  return {
    subscriptions,
    loading,
    syncing,
    error,
    refresh,
    addSubscription,
    updateSubscription,
    deleteSubscription,
    getFilteredAndSorted,
  };
};
