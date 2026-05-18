/**
 * Web mock for OneSignal. OneSignal React Native SDK does not support Web.
 * To support PWA notifications, one would use OneSignal's Web SDK here via 
 * a different initialization method, but for this scaffolding we use stubs.
 */
export const NotificationService = {
  init(): void {
    console.log('OneSignal initialized on web (mock)');
  },

  setExternalUserId(userId: string): void {
     console.log(`OneSignal setExternalUserId set to ${userId} on web (mock)`);
  },

  logout(): void {
     console.log('OneSignal logged out on web (mock)');
  }
};
