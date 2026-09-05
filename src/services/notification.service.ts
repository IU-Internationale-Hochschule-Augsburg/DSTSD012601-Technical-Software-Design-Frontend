import { Platform } from 'react-native';
import { LogLevel, OneSignal } from 'react-native-onesignal';
import { ONESIGNAL_APP_ID } from '../utils/constants';
import type { PushPayload } from './notification.shared';
import { sendPushToExternalId } from './onesignal.rest';

const isWeb = Platform.OS === 'web';

/**
 * Wrapper service for integrating OneSignal Push Notifications.
 */
export const NotificationService = {
  /**
   * Initializes OneSignal. Should be called early in the app lifecycle.
   */
  init(): void {
    if (isWeb) return;
    if (!ONESIGNAL_APP_ID) {
      console.warn('[OneSignal] init übersprungen – EXPO_PUBLIC_ONESIGNAL_APP_ID nicht gesetzt.');
      return;
    }
    try {
      // Remove this method to stop OneSignal Debugging
      OneSignal.Debug.setLogLevel(LogLevel.Verbose);

      // OneSignal Initialization
      OneSignal.initialize(ONESIGNAL_APP_ID);

      // requestPermission will show the native iOS or Android notification permission prompt.
      // We recommend removing the following code and instead using an In-App Message to prompt for notification permission
      OneSignal.Notifications.requestPermission(true);

      // Method for listening for notification clicks
      OneSignal.Notifications.addEventListener('click', (event: any) => {
        console.log('OneSignal: notification clicked:', event);
      });
    } catch (e) {
      console.warn('Failed to initialize OneSignal:', e);
    }
  },

  /**
   * Submits custom tags (like User ID) to OneSignal for targeted pushes.
   */
  setExternalUserId(userId: string): void {
    if (isWeb || !ONESIGNAL_APP_ID) return;
    try {
        OneSignal.login(userId);
    } catch(e) {
        console.warn('Failed to set external user id in OneSignal:', e);
    }
  },

  /**
   * Clears external user id on logout.
   */
  logout(): void {
     if (isWeb || !ONESIGNAL_APP_ID) return;
     try {
         OneSignal.logout();
     } catch(e) {
         console.warn('Failed to logout of OneSignal:', e);
     }
  },

  /**
   * Fragt die Push-Erlaubnis an (native System-Dialog).
   * @returns true, wenn die Erlaubnis erteilt ist/wird.
   */
  async requestPermission(): Promise<boolean> {
    if (isWeb || !ONESIGNAL_APP_ID) return false;
    try {
      return await OneSignal.Notifications.requestPermission(true);
    } catch (e) {
      console.warn('Failed to request push permission:', e);
      return false;
    }
  },

  /**
   * Stellt eine Abo-Erinnerung zu. Native: Versand via OneSignal REST an die
   * eigene External-ID. @returns true bei erfolgreichem Versand.
   */
  async notifyReminder(externalId: string, payload: PushPayload): Promise<boolean> {
    return sendPushToExternalId(externalId, payload);
  },
};
