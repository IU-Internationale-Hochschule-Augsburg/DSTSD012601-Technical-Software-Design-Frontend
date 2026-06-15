import type { Subscription, SortOption, FilterOptions } from '../types';
import { SubscriptionService } from '../services/subscription.service';
import { useDatabaseResource } from './useDatabaseResource';

/**
 * Feature-Hook für Abonnements.
 *
 * Baut auf dem generischen Offline-First-Hook `useDatabaseResource` auf:
 * Die Daten sind sofort (lokal) verfügbar und werden im Hintergrund mit dem
 * Backend synchronisiert. Kommen neue Daten vom Server, aktualisiert sich die
 * UI automatisch.
 */
export const useSubscriptions = () => {
  const {
    data: subscriptions,
    loading,
    syncing,
    error: resourceError,
    lastSyncedAt,
    refresh,
    create,
    update,
    remove,
  } = useDatabaseResource<Subscription>(SubscriptionService);

  // Add
  const addSubscription = (sub: Subscription) => create(sub);

  // Update (setzt zusätzlich updatedAt)
  const updateSubscription = (id: string, updates: Partial<Subscription>) =>
    update(id, { ...updates, updatedAt: new Date().toISOString() });

  // Delete
  const deleteSubscription = (id: string) => remove(id);

  const getFilteredAndSorted = (filter: FilterOptions, sort: SortOption) => {
    let result = [...subscriptions];

    // Filter Category
    if (filter.categories.length > 0) {
      result = result.filter((s) => filter.categories.includes(s.category));
    }

    // Filter Query
    if (filter.searchQuery) {
      const query = filter.searchQuery.toLowerCase();
      result = result.filter((s) => s.name.toLowerCase().includes(query));
    }

    // Sort
    result.sort((a, b) => {
      const field = sort.field;
      const asc = sort.direction === 'asc';

      if (typeof a[field] === 'number') {
        return asc
          ? (a[field] as number) - (b[field] as number)
          : (b[field] as number) - (a[field] as number);
      }
      if (typeof a[field] === 'string') {
        return asc
          ? (a[field] as string).localeCompare(b[field] as string)
          : (b[field] as string).localeCompare(a[field] as string);
      }
      return 0;
    });

    return result;
  };

  return {
    subscriptions,
    loading,
    /** true, während im Hintergrund mit dem Server synchronisiert wird. */
    syncing,
    error: resourceError,
    lastSyncedAt,
    /** Erzwingt eine Server-Synchronisierung (Pull-to-Refresh). */
    refresh,
    addSubscription,
    updateSubscription,
    deleteSubscription,
    getFilteredAndSorted,
  };
};
