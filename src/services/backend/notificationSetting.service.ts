import type { NotificationSetting } from '../../types/backend';
import { ApiService } from '../api.service';
import { StorageService } from '../storage.service';
import { STORAGE_KEYS } from '../../utils/constants';

const DEFAULT_SETTING: NotificationSetting = {
  enabled: true,
  reminderDaysBefore: 3,
};

/**
 * `NotificationSetting` ist ein Value Object (1:1 zum User, ohne eigene Id).
 * Es wird daher als Singleton lokal gehalten und über den User-Endpunkt
 * synchronisiert (`/users/me/notification-settings`).
 */
export const NotificationSettingService = {
  /** Lokal gespeicherte Einstellung (oder Default). */
  async get(): Promise<NotificationSetting> {
    const local = await StorageService.get<NotificationSetting>(
      STORAGE_KEYS.BACKEND_NOTIFICATION_SETTINGS
    );
    return local ?? DEFAULT_SETTING;
  },

  /** Lokal speichern (offline-first). */
  async set(setting: NotificationSetting): Promise<NotificationSetting> {
    await StorageService.set(STORAGE_KEYS.BACKEND_NOTIFICATION_SETTINGS, setting);
    return setting;
  },

  /** Teilaktualisierung. */
  async update(patch: Partial<NotificationSetting>): Promise<NotificationSetting> {
    const current = await this.get();
    return this.set({ ...current, ...patch });
  },

  /** Lokalen Stand zum Server pushen und den Serverstand zurückspeichern. */
  async sync(): Promise<NotificationSetting> {
    const local = await this.get();
    const remote = await ApiService.put<NotificationSetting>(
      '/users/me/notification-settings',
      local
    );
    return this.set(remote);
  },
};
