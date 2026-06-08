import type { Subscription } from '../types';
import { StorageService } from './storage.service';
import { STORAGE_KEYS } from '../utils/constants';

/**
 * Stub Service for Subscription Management.
 * Manages CRUD operations and persists to AsyncStorage for offline capability.
 */
export const SubscriptionService = {
  /**
   * Retrieves all subscriptions.
   */
  async getSubscriptions(): Promise<Subscription[]> {
    const subs = await StorageService.get<Subscription[]>(STORAGE_KEYS.SUBSCRIPTIONS);
    return subs || [];
  },

  /**
   * Adds a new subscription.
   */
  async addSubscription(sub: Subscription): Promise<Subscription> {
    const subs = await this.getSubscriptions();
    const updatedSubs = [...subs, sub];
    await StorageService.set(STORAGE_KEYS.SUBSCRIPTIONS, updatedSubs);
    return sub;
  },

  /**
   * Updates an existing subscription.
   */
  async updateSubscription(
    id: string,
    updates: Partial<Subscription>
  ): Promise<Subscription | null> {
    const subs = await this.getSubscriptions();
    const index = subs.findIndex((s) => s.id === id);
    if (index === -1) return null;

    const updatedSub = { ...subs[index], ...updates, updatedAt: new Date().toISOString() };
    const newSubs = [...subs];
    newSubs[index] = updatedSub;
    
    await StorageService.set(STORAGE_KEYS.SUBSCRIPTIONS, newSubs);
    return updatedSub;
  },

  /**
   * Deletes a subscription by ID.
   */
  async deleteSubscription(id: string): Promise<boolean> {
    const subs = await this.getSubscriptions();
    const updatedSubs = subs.filter((s) => s.id !== id);
    await StorageService.set(STORAGE_KEYS.SUBSCRIPTIONS, updatedSubs);
    return true;
  },
};
