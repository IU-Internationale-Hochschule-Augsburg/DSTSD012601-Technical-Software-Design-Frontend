import type { Subscription, User } from '../types';
import { StorageService } from './storage.service';
import { ApiClient, ApiError } from './api.client';
import { STORAGE_KEYS } from '../utils/constants';
import {
  backendToLocal,
  localToBackendCreate,
  type SubscriptionBackend,
} from './subscription.mapper';

const ENDPOINT = '/api/Subscriptions';

async function readCache(): Promise<Subscription[]> {
  return (await StorageService.get<Subscription[]>(STORAGE_KEYS.SUBSCRIPTIONS)) || [];
}

async function writeCache(subs: Subscription[]): Promise<void> {
  await StorageService.set(STORAGE_KEYS.SUBSCRIPTIONS, subs);
}

async function currentUserId(): Promise<string | null> {
  const u = await StorageService.get<User>(STORAGE_KEYS.USER);
  return u?.id ?? null;
}

function isOfflineLike(e: unknown): boolean {
  if (e instanceof ApiError) return e.status >= 500 || e.status === 0;
  return true;
}

export const SubscriptionService = {
  async getSubscriptions(): Promise<Subscription[]> {
    try {
      const userId = await currentUserId();
      const path = userId ? `${ENDPOINT}/by-user/${userId}` : ENDPOINT;
      const remote = await ApiClient.get<SubscriptionBackend[]>(path);
      const list = (remote ?? []).map(backendToLocal);
      await writeCache(list);
      return list;
    } catch (e) {
      if (isOfflineLike(e)) return readCache();
      throw e;
    }
  },

  async addSubscription(sub: Subscription): Promise<Subscription> {
    const userId = await currentUserId();
    if (!userId) {
      const cache = await readCache();
      await writeCache([...cache, sub]);
      return sub;
    }

    try {
      const payload = await localToBackendCreate(sub, userId);
      const created = await ApiClient.post<SubscriptionBackend>(ENDPOINT, payload);
      const result = created ? backendToLocal(created) : sub;
      const cache = await readCache();
      await writeCache([...cache, result]);
      return result;
    } catch (e) {
      if (isOfflineLike(e)) {
        const cache = await readCache();
        await writeCache([...cache, sub]);
        return sub;
      }
      throw e;
    }
  },

  async updateSubscription(
    id: string,
    updates: Partial<Subscription>
  ): Promise<Subscription | null> {
    const cache = await readCache();
    const index = cache.findIndex((s) => s.id === id);
    if (index === -1) return null;

    const merged = { ...cache[index], ...updates, updatedAt: new Date().toISOString() };
    const userId = await currentUserId();

    if (userId) {
      try {
        const payload = await localToBackendCreate(merged, userId);
        const updated = await ApiClient.put<SubscriptionBackend>(`${ENDPOINT}/${id}`, payload);
        const result = updated ? backendToLocal(updated) : merged;
        const next = [...cache];
        next[index] = { ...result, id };
        await writeCache(next);
        return next[index];
      } catch (e) {
        if (!isOfflineLike(e)) throw e;
      }
    }

    const next = [...cache];
    next[index] = merged;
    await writeCache(next);
    return merged;
  },

  async deleteSubscription(id: string): Promise<boolean> {
    try {
      await ApiClient.delete<void>(`${ENDPOINT}/${id}`);
    } catch (e) {
      if (!isOfflineLike(e)) throw e;
    }
    const cache = await readCache();
    await writeCache(cache.filter((s) => s.id !== id));
    return true;
  },
};
