import type {
  Guid,
  LocalEntityStore,
  SyncableEntity,
  SyncMetadata,
  SyncResult,
} from '../types/backend';
import { ApiService, ApiError } from './api.service';
import { StorageService } from './storage.service';

/** Erzeugt eine lokal eindeutige Id (für offline angelegte Entitäten). */
export function generateLocalId(): Guid {
  // RFC4122-ähnliche v4-Id ohne externe Abhängigkeit.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const emptySync = (): SyncMetadata => ({
  lastSyncedAt: null,
  pendingCreateIds: [],
  pendingUpdateIds: [],
  pendingDeleteIds: [],
});

const emptyStore = <T extends SyncableEntity>(): LocalEntityStore<T> => ({
  items: [],
  sync: emptySync(),
});

export interface SyncServiceConfig {
  /** AsyncStorage-Key, unter dem der lokale Store liegt. */
  storageKey: string;
  /** REST-Pfad der Collection auf dem Server, z. B. '/subscriptions'. */
  endpoint: string;
}

/**
 * Generischer Offline-First-Service für eine Entität mit `id`.
 *
 * Strategie:
 *  - Alle Mutationen schreiben SOFORT in den lokalen Store und merken sich,
 *    was noch zum Server gepusht werden muss (pending* Listen).
 *  - `sync()` pusht die offenen Änderungen und zieht danach den Serverstand.
 *  - Konflikte werden per "last-write-wins" zugunsten des Servers aufgelöst,
 *    ausgenommen lokal noch nicht gepushte Änderungen.
 */
export function createSyncService<T extends SyncableEntity>(config: SyncServiceConfig) {
  const { storageKey, endpoint } = config;

  async function load(): Promise<LocalEntityStore<T>> {
    const store = await StorageService.get<LocalEntityStore<T>>(storageKey);
    return store ?? emptyStore<T>();
  }

  async function save(store: LocalEntityStore<T>): Promise<void> {
    await StorageService.set(storageKey, store);
  }

  function markPending(sync: SyncMetadata, id: Guid, kind: 'create' | 'update' | 'delete') {
    const without = (arr: Guid[]) => arr.filter((x) => x !== id);
    let { pendingCreateIds, pendingUpdateIds, pendingDeleteIds } = sync;

    if (kind === 'create') {
      pendingCreateIds = [...without(pendingCreateIds), id];
    } else if (kind === 'update') {
      // Wenn die Entität noch als "create" pending ist, bleibt sie das.
      if (!pendingCreateIds.includes(id)) {
        pendingUpdateIds = [...without(pendingUpdateIds), id];
      }
    } else {
      // delete: alle anderen pendings für diese Id verwerfen.
      pendingCreateIds = without(pendingCreateIds);
      pendingUpdateIds = without(pendingUpdateIds);
      // Nur löschen-pushen, wenn die Entität serverseitig existieren könnte.
      pendingDeleteIds = [...without(pendingDeleteIds), id];
    }
    return { ...sync, pendingCreateIds, pendingUpdateIds, pendingDeleteIds };
  }

  // ─── Lokale CRUD-Operationen ───────────────────────────────────────────────

  async function getAll(): Promise<T[]> {
    return (await load()).items;
  }

  async function getById(id: Guid): Promise<T | null> {
    const { items } = await load();
    return items.find((i) => i.id === id) ?? null;
  }

  async function create(entity: T): Promise<T> {
    const store = await load();
    const item = entity.id ? entity : { ...entity, id: generateLocalId() };
    store.items = [...store.items, item];
    store.sync = markPending(store.sync, item.id, 'create');
    await save(store);
    return item;
  }

  async function update(id: Guid, patch: Partial<T>): Promise<T | null> {
    const store = await load();
    const index = store.items.findIndex((i) => i.id === id);
    if (index === -1) return null;

    const updated = { ...store.items[index], ...patch, id } as T;
    store.items = store.items.map((i, idx) => (idx === index ? updated : i));
    store.sync = markPending(store.sync, id, 'update');
    await save(store);
    return updated;
  }

  async function remove(id: Guid): Promise<boolean> {
    const store = await load();
    const exists = store.items.some((i) => i.id === id);
    store.items = store.items.filter((i) => i.id !== id);
    store.sync = markPending(store.sync, id, 'delete');
    await save(store);
    return exists;
  }

  async function clear(): Promise<void> {
    await save(emptyStore<T>());
  }

  // ─── Synchronisierung mit dem Backend ──────────────────────────────────────

  async function push(store: LocalEntityStore<T>, result: SyncResult): Promise<void> {
    const byId = new Map(store.items.map((i) => [i.id, i] as const));
    const { pendingCreateIds, pendingUpdateIds, pendingDeleteIds } = store.sync;

    // 1) Löschungen
    for (const id of pendingDeleteIds) {
      try {
        await ApiService.delete(`${endpoint}/${id}`);
        result.pushed += 1;
      } catch (e) {
        // 404 = serverseitig schon weg → als erledigt betrachten.
        if (e instanceof ApiError && e.status === 404) {
          result.pushed += 1;
        } else {
          result.errors.push(`delete ${id}: ${(e as Error).message}`);
          continue;
        }
      }
      store.sync.pendingDeleteIds = store.sync.pendingDeleteIds.filter((x) => x !== id);
    }

    // 2) Neuanlagen
    for (const id of pendingCreateIds) {
      const local = byId.get(id);
      if (!local) {
        store.sync.pendingCreateIds = store.sync.pendingCreateIds.filter((x) => x !== id);
        continue;
      }
      try {
        const created = await ApiService.post<T>(endpoint, local);
        // Server kann eine eigene Id vergeben → lokal ersetzen.
        store.items = store.items.map((i) => (i.id === id ? created : i));
        store.sync.pendingCreateIds = store.sync.pendingCreateIds.filter((x) => x !== id);
        result.pushed += 1;
      } catch (e) {
        result.errors.push(`create ${id}: ${(e as Error).message}`);
      }
    }

    // 3) Aktualisierungen
    for (const id of pendingUpdateIds) {
      const local = byId.get(id);
      if (!local) {
        store.sync.pendingUpdateIds = store.sync.pendingUpdateIds.filter((x) => x !== id);
        continue;
      }
      try {
        await ApiService.put<T>(`${endpoint}/${id}`, local);
        store.sync.pendingUpdateIds = store.sync.pendingUpdateIds.filter((x) => x !== id);
        result.pushed += 1;
      } catch (e) {
        result.errors.push(`update ${id}: ${(e as Error).message}`);
      }
    }
  }

  async function pull(store: LocalEntityStore<T>, result: SyncResult): Promise<void> {
    const remote = await ApiService.get<T[]>(endpoint);
    const stillPending = new Set<Guid>([
      ...store.sync.pendingCreateIds,
      ...store.sync.pendingUpdateIds,
      ...store.sync.pendingDeleteIds,
    ]);

    const merged = new Map(store.items.map((i) => [i.id, i] as const));
    for (const remoteItem of remote) {
      // Lokale, noch nicht gepushte Änderungen nicht überschreiben.
      if (stillPending.has(remoteItem.id)) {
        result.conflicts += 1;
        continue;
      }
      merged.set(remoteItem.id, remoteItem);
      result.pulled += 1;
    }

    // Serverseitig gelöschte Einträge lokal entfernen (sofern nicht pending).
    const remoteIds = new Set(remote.map((i) => i.id));
    for (const id of [...merged.keys()]) {
      if (!remoteIds.has(id) && !stillPending.has(id)) {
        merged.delete(id);
      }
    }

    store.items = [...merged.values()];
  }

  /** Pusht offene Änderungen und zieht anschließend den aktuellen Serverstand. */
  async function sync(): Promise<SyncResult> {
    const result: SyncResult = { pushed: 0, pulled: 0, conflicts: 0, errors: [] };
    const store = await load();

    await push(store, result);
    try {
      await pull(store, result);
      store.sync.lastSyncedAt = new Date().toISOString();
    } catch (e) {
      result.errors.push(`pull: ${(e as Error).message}`);
    }

    await save(store);
    return result;
  }

  async function getSyncMetadata(): Promise<SyncMetadata> {
    return (await load()).sync;
  }

  async function hasPendingChanges(): Promise<boolean> {
    const { pendingCreateIds, pendingUpdateIds, pendingDeleteIds } = (await load()).sync;
    return pendingCreateIds.length + pendingUpdateIds.length + pendingDeleteIds.length > 0;
  }

  return {
    storageKey,
    endpoint,
    getAll,
    getById,
    create,
    update,
    remove,
    clear,
    sync,
    getSyncMetadata,
    hasPendingChanges,
  };
}

export type SyncService<T extends SyncableEntity> = ReturnType<typeof createSyncService<T>>;
