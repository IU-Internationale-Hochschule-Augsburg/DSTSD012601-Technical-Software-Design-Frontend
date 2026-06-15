import type { Subscription } from '../types';
import { createSyncService } from './sync.service';
import { STORAGE_KEYS } from '../utils/constants';

/**
 * Offline-First-Service für Abonnements.
 *
 * Nutzt den generischen Sync-Service: alle Mutationen landen sofort lokal in
 * AsyncStorage und werden über `sync()` mit dem Backend abgeglichen.
 * Die UI greift bequem über den `useDatabaseResource`-Hook darauf zu.
 *
 * Hinweis: Hier wird (bewusst) das flache UI-`Subscription`-Modell aus
 * `../types` verwendet, damit die bestehenden Screens unverändert
 * weiterfunktionieren. Das reichere Backend-Modell liegt in `../types/backend`
 * und wird von den Services unter `./backend` bedient.
 */
export const SubscriptionService = createSyncService<Subscription>({
  storageKey: STORAGE_KEYS.SUBSCRIPTIONS,
  endpoint: '/subscriptions',
});
