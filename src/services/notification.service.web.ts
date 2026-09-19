import { ONESIGNAL_APP_ID, ONESIGNAL_WEB_ENABLED } from '../utils/constants';
import type { PushPayload } from './notification.shared';

// ─── Web-Benachrichtigungen ───────────────────────────────────────────────────
//
// Zustellung im Browser über die native Notification-API (lokale
// Benachrichtigungen) – kein Backend, kein CORS. Die OneSignal-Anbindung
// (Web-SDK v16, „Page SDK") ist standardmäßig AUS, weil sie im Web ohne
// passende Dashboard-Web-Konfiguration mit „AppID doesn't match existing apps"
// abbricht und keinen Zustell-Nutzen bringt (REST-Versand ist per CORS
// blockiert). Nur via `EXPO_PUBLIC_ONESIGNAL_WEB_ENABLED=true` aktivieren, wenn
// die Web-Plattform im Dashboard eingerichtet ist und ein Backend pusht.
//
// Voraussetzung fürs echte Empfangen von OneSignal-Web-Pushes:
//  · HTTPS (bzw. localhost mit `allowLocalhostAsSecureOrigin`)
//  · Service Worker `OneSignalSDKWorker.js` im Web-Root (siehe public/)

const SDK_URL = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';

type OneSignalWeb = {
  init(options: Record<string, unknown>): Promise<void>;
  login(externalId: string): Promise<void>;
  logout(): Promise<void>;
};

declare global {
  interface Window {
    OneSignalDeferred?: ((os: OneSignalWeb) => void | Promise<void>)[];
  }
}

let scriptInjected = false;
let initialized = false;

/** True, wenn die OneSignal-Web-Anbindung genutzt werden soll. */
function oneSignalWebEnabled(): boolean {
  return ONESIGNAL_WEB_ENABLED && !!ONESIGNAL_APP_ID;
}

/** Reiht eine Aktion in die OneSignal-Deferred-Queue ein (läuft nach SDK-Load). */
function enqueue(action: (os: OneSignalWeb) => void | Promise<void>): void {
  if (typeof window === 'undefined') return;
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(action);
}

/**
 * Liefert die aktive Service-Worker-Registrierung – aber nur, wenn schon eine
 * *aktiv* ist. `navigator.serviceWorker.ready` blockiert sonst unendlich (z. B.
 * wenn der SW nicht registriert werden konnte), daher mit kurzem Timeout.
 */
async function getActiveRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  try {
    const ready = navigator.serviceWorker.ready;
    const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500));
    const reg = await Promise.race([ready, timeout]);
    return reg && (reg as ServiceWorkerRegistration).active
      ? (reg as ServiceWorkerRegistration)
      : null;
  } catch {
    return null;
  }
}

export const NotificationService = {
  init(): void {
    // Web-Zustellung braucht kein SDK. Das OneSignal-Web-SDK nur laden, wenn
    // ausdrücklich aktiviert (sonst crasht es bei falscher Web-Konfiguration).
    if (!oneSignalWebEnabled()) return;
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    if (scriptInjected) return;
    scriptInjected = true;

    enqueue(async (OneSignal) => {
      try {
        await OneSignal.init({
          appId: ONESIGNAL_APP_ID,
          // Erlaubt das Testen auf http://localhost ohne HTTPS.
          allowLocalhostAsSecureOrigin: true,
        });
        initialized = true;
      } catch (e) {
        // z. B. „AppID doesn't match existing apps" bei fehlender Web-Plattform.
        console.warn('[OneSignal] Web-init fehlgeschlagen:', e);
      }
    });

    const script = document.createElement('script');
    script.src = SDK_URL;
    script.defer = true;
    document.head.appendChild(script);
  },

  /** Setzt die App-User-ID als OneSignal-External-ID (für späteren Server-Push). */
  setExternalUserId(userId: string): void {
    if (!oneSignalWebEnabled()) return;
    // Login erst nach erfolgreicher Init aufrufen – sonst crasht der SDK-Login.
    enqueue(async (OneSignal) => {
      if (!initialized) return;
      try {
        await OneSignal.login(userId);
      } catch (e) {
        console.warn('[OneSignal] login fehlgeschlagen:', e);
      }
    });
  },

  logout(): void {
    if (!oneSignalWebEnabled()) return;
    enqueue(async (OneSignal) => {
      if (!initialized) return;
      try {
        await OneSignal.logout();
      } catch (e) {
        console.warn('[OneSignal] logout fehlgeschlagen:', e);
      }
    });
  },

  /**
   * Fragt die Browser-Erlaubnis für Benachrichtigungen an (zeigt den Prompt).
   * @returns true, wenn die Erlaubnis erteilt ist.
   */
  async requestPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;
    try {
      const result = await Notification.requestPermission();
      return result === 'granted';
    } catch (e) {
      console.warn('[Notify] requestPermission fehlgeschlagen:', e);
      return false;
    }
  },

  /**
   * Zeigt eine Abo-Erinnerung als LOKALE Benachrichtigung an.
   *
   * Im Browser ist OneSignal-REST-Versand durch CORS blockiert; die
   * Notification-API funktioniert dagegen ohne Backend und zeigt die Erinnerung
   * direkt an. Bevorzugt über die Service-Worker-Registrierung (auch bei
   * inaktivem Tab), sonst als Fallback über `new Notification`.
   *
   * @param _externalId hier ungenutzt (lokale Anzeige am aktuellen Gerät).
   * @returns true, wenn die Benachrichtigung angezeigt wurde.
   */
  async notifyReminder(_externalId: string, payload: PushPayload): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) return false;
    if (Notification.permission !== 'granted') return false;

    const options: NotificationOptions = {
      body: payload.message,
      icon: '/logo192.png',
      badge: '/logo192.png',
      data: payload.data,
      // Gleiche Abo-Erinnerung ersetzt sich selbst statt sich zu stapeln.
      tag: payload.data?.subscriptionId,
    };

    try {
      // Bevorzugt über den Service Worker (funktioniert auch bei inaktivem Tab);
      // sonst Fallback auf die Page-Notification, solange kein aktiver SW da ist.
      const registration = await getActiveRegistration();
      if (registration) {
        await registration.showNotification(payload.title, options);
      } else {
        new Notification(payload.title, options);
      }
      return true;
    } catch (e) {
      console.warn('[Notify] Lokale Benachrichtigung fehlgeschlagen:', e);
      return false;
    }
  },
};
