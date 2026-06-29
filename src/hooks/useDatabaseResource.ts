import { useCallback, useEffect, useRef, useState } from 'react';
import type { Guid, SyncableEntity } from '../types/backend';
import type { SyncService } from '../services/sync.service';

export interface UseDatabaseResourceResult<T> {
  /** Aktuelle Daten (zuerst lokal, dann ggf. vom Server aktualisiert). */
  data: T[];
  /** true während des initialen Ladens aus dem lokalen Speicher. */
  loading: boolean;
  /** true während im Hintergrund mit dem Server synchronisiert wird. */
  syncing: boolean;
  error: string | null;
  /** Zeitpunkt der letzten erfolgreichen Server-Synchronisierung. */
  lastSyncedAt: string | null;
  /** Erzwingt eine Server-Synchronisierung (z. B. Pull-to-Refresh). */
  refresh: () => Promise<void>;
  /** Liest nur den lokalen Stand neu ein (ohne Servernetz). */
  reload: () => Promise<void>;
  create: (entity: T) => Promise<T>;
  update: (id: Guid, patch: Partial<T>) => Promise<T | null>;
  remove: (id: Guid) => Promise<boolean>;
}

export interface UseDatabaseResourceOptions {
  /** Direkt nach dem lokalen Laden im Hintergrund synchronisieren (Default: true). */
  autoSync?: boolean;
  /** Nach jeder lokalen Mutation automatisch synchronisieren (Default: true). */
  syncOnMutate?: boolean;
}

/**
 * Generischer **Offline-First**-Hook für eine über `createSyncService` verwaltete
 * Ressource.
 *
 * Ablauf:
 *  1. Beim Mount werden sofort die lokal gespeicherten Daten geliefert
 *     (kein Warten auf das Netzwerk → UI ist sofort nutzbar).
 *  2. Asynchron wird im Hintergrund mit dem Server synchronisiert.
 *  3. Bringt der Server neue/aktualisierte Daten, wird der State ersetzt und
 *     die UI re-rendert automatisch ("Frontend Refresh").
 *
 * Mutationen (create/update/remove) schreiben sofort lokal und stoßen – sofern
 * aktiviert – eine Hintergrund-Synchronisierung an.
 */
export function useDatabaseResource<T extends SyncableEntity>(
  service: SyncService<T>,
  options: UseDatabaseResourceOptions = {}
): UseDatabaseResourceResult<T> {
  const { autoSync = true, syncOnMutate = true } = options;

  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  // Verhindert State-Updates nach dem Unmount.
  const mounted = useRef(true);

  const reload = useCallback(async () => {
    const items = await service.getAll();
    if (mounted.current) setData(items);
  }, [service]);

  const runSync = useCallback(async () => {
    if (mounted.current) setSyncing(true);
    try {
      // Snapshot vor der Synchronisierung, um echte Änderungen zu erkennen.
      const before = JSON.stringify(await service.getAll());
      const result = await service.sync();
      const afterItems = await service.getAll();

      if (mounted.current) {
        // Nur neu setzen, wenn sich tatsächlich etwas geändert hat → kein
        // unnötiges Re-Render, aber automatischer Refresh bei neuen Daten.
        if (JSON.stringify(afterItems) !== before) setData(afterItems);
        const meta = await service.getSyncMetadata();
        setLastSyncedAt(meta.lastSyncedAt);
        setError(result.errors.length ? result.errors[0] : null);
      }
    } catch (e) {
      // Offline-First: Netzfehler sind nicht fatal, lokaler Stand bleibt.
      if (mounted.current) setError((e as Error).message);
    } finally {
      if (mounted.current) setSyncing(false);
    }
  }, [service]);

  // Initiales lokales Laden + Hintergrund-Sync.
  useEffect(() => {
    mounted.current = true;
    (async () => {
      try {
        await reload();
      } finally {
        if (mounted.current) setLoading(false);
      }
      if (autoSync) void runSync();
    })();
    return () => {
      mounted.current = false;
    };
  }, [reload, runSync, autoSync]);

  const afterMutation = useCallback(async () => {
    await reload();
    if (syncOnMutate) void runSync();
  }, [reload, runSync, syncOnMutate]);

  const create = useCallback(
    async (entity: T) => {
      const created = await service.create(entity);
      await afterMutation();
      return created;
    },
    [service, afterMutation]
  );

  const update = useCallback(
    async (id: Guid, patch: Partial<T>) => {
      const updated = await service.update(id, patch);
      await afterMutation();
      return updated;
    },
    [service, afterMutation]
  );

  const remove = useCallback(
    async (id: Guid) => {
      const ok = await service.remove(id);
      await afterMutation();
      return ok;
    },
    [service, afterMutation]
  );

  return {
    data,
    loading,
    syncing,
    error,
    lastSyncedAt,
    refresh: runSync,
    reload,
    create,
    update,
    remove,
  };
}
