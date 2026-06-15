// ─── Backend Services (Offline-First + Sync) ────────────────────────────────────
//
// Pro Backend-Entität ein eigener Service. Entitäten mit `id` nutzen den
// generischen Sync-Service; die Value Objects (BillingCycle, NotificationSetting)
// haben eigene, schlanke Services.

import { BackendUserService } from './user.service';
import { BackendSubscriptionService } from './subscription.service';
import { CategoryService } from './category.service';
import { NotificationService } from './notification.service';
import { NotificationSettingService } from './notificationSetting.service';
import { BillingCycleService } from './billingCycle.service';
import type { SyncResult } from '../../types/backend';

export {
  BackendUserService,
  BackendSubscriptionService,
  CategoryService,
  NotificationService,
  NotificationSettingService,
  BillingCycleService,
};

/**
 * Synchronisiert alle ID-basierten Stores in einem Rutsch.
 * (Value Objects werden über ihre Parent-Entitäten mitsynchronisiert.)
 */
export async function syncAll(): Promise<Record<string, SyncResult>> {
  const [users, subscriptions, categories, notifications] = await Promise.all([
    BackendUserService.sync(),
    BackendSubscriptionService.sync(),
    CategoryService.sync(),
    NotificationService.sync(),
  ]);

  return { users, subscriptions, categories, notifications };
}
