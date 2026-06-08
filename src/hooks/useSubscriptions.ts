import { useState, useCallback, useEffect } from 'react';
import type { Subscription, SortOption, FilterOptions } from '../types';
import { SubscriptionService } from '../services/subscription.service';

export const useSubscriptions = () => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load all
  const fetchSubscriptions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await SubscriptionService.getSubscriptions();
      setSubscriptions(data);
      setError(null);
    } catch (e) {
      setError('Fehler beim Laden der Abonnements.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  // Add
  const addSubscription = async (sub: Subscription) => {
    try {
      const newSub = await SubscriptionService.addSubscription(sub);
      setSubscriptions((prev) => [...prev, newSub]);
      return newSub;
    } catch {
      throw new Error('Fehler beim Hinzufügen');
    }
  };

  // Update
  const updateSubscription = async (id: string, updates: Partial<Subscription>) => {
    try {
      const updated = await SubscriptionService.updateSubscription(id, updates);
      if (updated) {
        setSubscriptions((prev) => prev.map((s) => (s.id === id ? updated : s)));
      }
      return updated;
    } catch {
      throw new Error('Fehler beim Speichern');
    }
  };

  // Delete
  const deleteSubscription = async (id: string) => {
    try {
      await SubscriptionService.deleteSubscription(id);
      setSubscriptions((prev) => prev.filter((s) => s.id !== id));
      return true;
    } catch {
      throw new Error('Fehler beim Löschen');
    }
  };

  const getFilteredAndSorted = (filter: FilterOptions, sort: SortOption) => {
    let result = [...subscriptions];

    // Filter Category
    if (filter.categories.length > 0) {
      result = result.filter(s => filter.categories.includes(s.category));
    }
    
    // Filter Query
    if (filter.searchQuery) {
      const query = filter.searchQuery.toLowerCase();
      result = result.filter(s => s.name.toLowerCase().includes(query));
    }

    // Sort
    result.sort((a, b) => {
      const field = sort.field;
      const asc = sort.direction === 'asc';
      
      if (typeof a[field] === 'number') {
        return asc ? (a[field] as number) - (b[field] as number) : (b[field] as number) - (a[field] as number);
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
    error,
    refresh: fetchSubscriptions,
    addSubscription,
    updateSubscription,
    deleteSubscription,
    getFilteredAndSorted
  };
};
