import type { Category } from '../../types/backend';
import { createSyncService } from '../sync.service';
import { STORAGE_KEYS } from '../../utils/constants';

/**
 * Lokaler, mit dem Backend synchronisierter Store für Kategorien.
 */
export const CategoryService = createSyncService<Category>({
  storageKey: STORAGE_KEYS.BACKEND_CATEGORIES,
  endpoint: '/categories',
});
