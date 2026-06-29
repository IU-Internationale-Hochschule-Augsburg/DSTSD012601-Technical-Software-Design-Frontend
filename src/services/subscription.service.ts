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

/**
 * Offline-First-Service für Abonnements.
 *
 * Strategie:
 *  - **Lesen** liefert immer SOFORT den lokalen Cache (kein Warten aufs Netz).
 *  - **Mutationen** schreiben sofort lokal und merken sich die Operation in einer
 *    persistierten Pending-Queue.
 *  - **`sync()`** schiebt offene Operationen zum Backend und zieht danach den
 *    Serverstand – ohne lokal noch nicht gepushte Einträge zu verlieren.
 *
 * Damit funktioniert die App vollständig offline; sobald wieder Netz da ist,
 * werden die offline gemachten Änderungen automatisch nachgezogen.
 */

// ─── Pending-Queue-Typen ──────────────────────────────────────────────────────

type PendingOp =
  | { kind: 'create'; id: string }
  | { kind: 'update'; id: string }
  | { kind: 'delete'; id: string };

function isLocalId(id: string): boolean {
  return id.startsWith('local_');
}

function generateLocalId(): string {
  return `local_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

// ─── Storage-Helfer ───────────────────────────────────────────────────────────

async function readCache(): Promise<Subscription[]> {
  return (await StorageService.get<Subscription[]>(STORAGE_KEYS.SUBSCRIPTIONS)) || [];
}

async function writeCache(subs: Subscription[]): Promise<void> {
  await StorageService.set(STORAGE_KEYS.SUBSCRIPTIONS, subs);
}

async function readQueue(): Promise<PendingOp[]> {
  return (await StorageService.get<PendingOp[]>(STORAGE_KEYS.SUBSCRIPTIONS_QUEUE)) || [];
}

async function writeQueue(queue: PendingOp[]): Promise<void> {
  await StorageService.set(STORAGE_KEYS.SUBSCRIPTIONS_QUEUE, queue);
}

async function currentUserId(): Promise<string | null> {
  const u = await StorageService.get<User>(STORAGE_KEYS.USER);
  return u?.id ?? null;
}

function isOfflineLike(e: unknown): boolean {
  if (e instanceof ApiError) return e.status >= 500 || e.status === 0;
  return true;
}

/**
 * Fügt eine Operation idempotent in die Queue ein und dedupliziert pro Id, damit
 * die Queue nicht wächst und Reihenfolge-Konflikte vermieden werden:
 *  - create + update  → bleibt create (Cache hält den aktuellen Stand)
 *  - create + delete  → hebt sich auf (nie gepushter lokaler Eintrag)
 *  - update + delete  → wird delete
 */
function enqueue(queue: PendingOp[], op: PendingOp): PendingOp[] {
  const hadCreate = queue.some((o) => o.kind === 'create' && o.id === op.id);
  const rest = queue.filter((o) => o.id !== op.id);

  if (op.kind === 'delete') {
    // Lokal angelegter, nie gepushter Eintrag → einfach komplett verwerfen.
    if (hadCreate || isLocalId(op.id)) return rest;
    return [...rest, op];
  }
  if (op.kind === 'update') {
    return [...rest, hadCreate ? { kind: 'create', id: op.id } : op];
  }
  return [...rest, op];
}

// ─── Sync: Queue zum Server pushen ─────────────────────────────────────────────

/** @returns true, wenn die Queue vollständig geleert wurde (online). */
async function flushQueue(userId: string): Promise<boolean> {
  let queue = await readQueue();
  if (queue.length === 0) return true;

  let cache = await readCache();
  const remove = (q: PendingOp[], op: PendingOp) => q.filter((o) => o !== op);

  for (const op of [...queue]) {
    try {
      if (op.kind === 'delete') {
        try {
          await ApiClient.delete<void>(`${ENDPOINT}/${op.id}`);
        } catch (e) {
          // 404 = serverseitig bereits weg → als erledigt betrachten.
          if (!(e instanceof ApiError && e.status === 404)) throw e;
        }
        queue = remove(queue, op);
        continue;
      }

      const item = cache.find((s) => s.id === op.id);
      if (!item) {
        queue = remove(queue, op);
        continue;
      }
      const payload = await localToBackendCreate(item, userId);

      if (op.kind === 'create') {
        const created = await ApiClient.post<SubscriptionBackend>(ENDPOINT, payload);
        if (created) {
          // Server vergibt echte Id → lokalen (local_) Eintrag ersetzen.
          const mapped = backendToLocal(created);
          cache = cache.map((s) => (s.id === op.id ? mapped : s));
        }
      } else {
        const updated = await ApiClient.put<SubscriptionBackend>(`${ENDPOINT}/${op.id}`, payload);
        if (updated) {
          const mapped = backendToLocal(updated);
          cache = cache.map((s) => (s.id === op.id ? { ...mapped, id: op.id } : s));
        }
      }
      queue = remove(queue, op);
    } catch (e) {
      if (isOfflineLike(e)) {
        // Noch offline → Rest der Queue behalten, später erneut versuchen.
        await writeCache(cache);
        await writeQueue(queue);
        return false;
      }
      // Fachlicher Fehler (z. B. 400/409) → Operation verwerfen, sonst blockiert
      // sie die Queue dauerhaft.
      queue = remove(queue, op);
    }
  }

  await writeCache(cache);
  await writeQueue(queue);
  return true;
}

// ─── Öffentliche API ──────────────────────────────────────────────────────────

export const SubscriptionService = {
  /** Sofortiger lokaler Stand – ohne Netzwerk. */
  async getCached(): Promise<Subscription[]> {
    return readCache();
  },

  /** Alias für Abwärtskompatibilität (liest lokal, blockiert nicht). */
  async getSubscriptions(): Promise<Subscription[]> {
    return readCache();
  },

  /**
   * Pusht offene Offline-Änderungen und zieht anschließend den Serverstand.
   * Bei fehlendem Login oder offline bleibt der lokale Stand erhalten.
   */
  async sync(): Promise<Subscription[]> {
    const userId = await currentUserId();
    if (!userId) return readCache();

    const flushed = await flushQueue(userId);
    if (!flushed) return readCache();

    try {
      const remote = await ApiClient.get<SubscriptionBackend[]>(`${ENDPOINT}/by-user/${userId}`);
      const serverList = (remote ?? []).map(backendToLocal);

      // Lokale Einträge bewahren, die noch in der Queue hängen (z. B. offline
      // angelegt und noch nicht gepusht), damit der Pull sie nicht verschluckt.
      const queue = await readQueue();
      const pendingIds = new Set(queue.map((o) => o.id));
      const cache = await readCache();
      const pendingItems = cache.filter((s) => pendingIds.has(s.id));

      const merged = [
        ...serverList,
        ...pendingItems.filter((p) => !serverList.some((s) => s.id === p.id)),
      ];
      await writeCache(merged);
      return merged;
    } catch (e) {
      if (isOfflineLike(e)) return readCache();
      throw e;
    }
  },

  async addSubscription(sub: Subscription): Promise<Subscription> {
    // Lokale Id vergeben (wird beim Sync durch die Server-Id ersetzt).
    const item: Subscription = { ...sub, id: sub.id || generateLocalId() };
    const cache = await readCache();
    await writeCache([...cache, item]);
    await writeQueue(enqueue(await readQueue(), { kind: 'create', id: item.id }));
    return item;
  },

  async updateSubscription(
    id: string,
    updates: Partial<Subscription>
  ): Promise<Subscription | null> {
    const cache = await readCache();
    const index = cache.findIndex((s) => s.id === id);
    if (index === -1) return null;

    const merged = { ...cache[index], ...updates, updatedAt: new Date().toISOString() };
    const next = [...cache];
    next[index] = merged;
    await writeCache(next);
    await writeQueue(enqueue(await readQueue(), { kind: 'update', id }));
    return merged;
  },

  async deleteSubscription(id: string): Promise<boolean> {
    const cache = await readCache();
    await writeCache(cache.filter((s) => s.id !== id));
    await writeQueue(enqueue(await readQueue(), { kind: 'delete', id }));
    return true;
  },
};
