import type { User } from '../../types/backend';
import { createSyncService } from '../sync.service';
import { ApiService } from '../api.service';
import { STORAGE_KEYS } from '../../utils/constants';

const base = createSyncService<User>({
  storageKey: STORAGE_KEYS.BACKEND_USERS,
  endpoint: '/users',
});

/**
 * Lokaler, mit dem Backend synchronisierter Store für User.
 * Erweitert den generischen Service um den Abruf des angemeldeten Users.
 */
export const BackendUserService = {
  ...base,

  /**
   * Holt den aktuell angemeldeten User vom Server (`/users/me`) und legt ihn
   * lokal ab. Fällt bei Netzfehlern auf den lokalen Stand zurück.
   */
  async getCurrent(): Promise<User | null> {
    try {
      const me = await ApiService.get<User>('/users/me');
      // Lokal upserten, damit der Stand offline verfügbar bleibt.
      const updated = await base.update(me.id, me);
      if (!updated) await base.create(me);
      return me;
    } catch {
      const all = await base.getAll();
      return all[0] ?? null;
    }
  },
};
