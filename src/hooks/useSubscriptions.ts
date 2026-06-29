import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
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

  /** Hintergrund-Sync: pusht Offline-Änderungen und zieht den Serverstand. */
  const sync = useCallback(async () => {
    if (mounted.current) setSyncing(true);
    try {
      const synced = await SubscriptionService.sync();
      if (mounted.current) {
        setSubscriptions(synced);
        setError(null);
      }
    } catch {
      // Offline-First: Sync-Fehler sind nicht fatal, lokaler Stand bleibt.
      if (mounted.current) setError('Synchronisierung fehlgeschlagen (offline).');
    } finally {
      if (mounted.current) setSyncing(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    (async () => {
      // 1) Lokalen Stand SOFORT anzeigen (kein Warten aufs Netz).
      const cached = await SubscriptionService.getCached();
      if (mounted.current) {
        setSubscriptions(cached);
        setLoading(false);
      }
      // 2) Danach im Hintergrund synchronisieren.
      void sync();
    })();
    return () => {
      mounted.current = false;
    };
  }, [sync]);

  const refresh = useCallback(() => sync(), [sync]);

  /** Liest nur den lokalen Cache neu ein (kein Netzwerk) – für sofortige Konsistenz. */
  const reload = useCallback(async () => {
    const cached = await SubscriptionService.getCached();
    if (mounted.current) setSubscriptions(cached);
  }, []);

  // Beim (Wieder-)Fokussieren des Screens lokalen Stand übernehmen, damit
  // Änderungen aus anderen Screens (z. B. Löschen im Detail) sofort sichtbar sind.
  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload])
  );

  const addSubscription = useCallback(
    async (sub: Subscription) => {
      const created = await SubscriptionService.addSubscription(sub);
      if (mounted.current) setSubscriptions((prev) => [...prev, created]);
      void sync(); // Best-effort sofort pushen, falls online.
      return created;
    },
    [sync]
  );

  const updateSubscription = useCallback(
    async (id: string, updates: Partial<Subscription>) => {
      const updated = await SubscriptionService.updateSubscription(id, updates);
      if (updated && mounted.current) {
        setSubscriptions((prev) => prev.map((s) => (s.id === id ? updated : s)));
      }
      void sync();
      return updated;
    },
    [sync]
  );

  const deleteSubscription = useCallback(
    async (id: string) => {
      // Optimistisch zuerst entfernen → UI reagiert sofort.
      if (mounted.current) setSubscriptions((prev) => prev.filter((s) => s.id !== id));
      await SubscriptionService.deleteSubscription(id);
      void sync();
      return true;
    },
    [sync]
  );

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
