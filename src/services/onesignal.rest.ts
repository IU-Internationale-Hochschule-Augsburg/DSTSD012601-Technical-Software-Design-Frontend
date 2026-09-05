import {
  ONESIGNAL_API_URL,
  ONESIGNAL_APP_ID,
  ONESIGNAL_REST_API_KEY,
} from '../utils/constants';
import type { PushPayload } from './notification.shared';

// ─── OneSignal REST-Versand (nur Native) ──────────────────────────────────────
//
// Der OneSignal-Client (react-native-onesignal) kann Pushes nur *empfangen*;
// das *Senden* läuft über die REST-API. Auf Native (iOS/Android) ist das ein
// direkter HTTPS-Aufruf ohne CORS.
//
// WICHTIG: Im Browser ist dieser Aufruf durch CORS blockiert – die OneSignal
// REST-API liefert bewusst kein `Access-Control-Allow-Origin`. Deshalb nutzt
// die Web-Variante (`notification.service.web.ts`) stattdessen lokale
// Benachrichtigungen und ruft diese Funktion NICHT auf.
//
// Zielsteuerung: `include_aliases.external_id` = unsere User-ID (per
// `OneSignal.login(userId)` als External-ID am Gerät hinterlegt).

/** True, wenn App-ID und REST-Key gepflegt sind (sonst wird der Versand übersprungen). */
export function isPushSendingConfigured(): boolean {
  return ONESIGNAL_APP_ID.length > 0 && ONESIGNAL_REST_API_KEY.length > 0;
}

/**
 * Sendet einen Push an ein einzelnes Gerät/Nutzer via External-ID.
 * @returns true bei erfolgreichem Versand, sonst false (nie werfend – die App
 *          soll durch fehlgeschlagene Pushes nicht beeinträchtigt werden).
 */
export async function sendPushToExternalId(
  externalId: string,
  payload: PushPayload
): Promise<boolean> {
  if (!isPushSendingConfigured()) {
    console.warn(
      '[OneSignal] Push übersprungen – EXPO_PUBLIC_ONESIGNAL_APP_ID / _REST_API_KEY nicht gesetzt.'
    );
    return false;
  }

  try {
    const res = await fetch(ONESIGNAL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // OneSignal API v16 erwartet das Schema `Key <REST_API_KEY>`.
        Authorization: `Key ${ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        target_channel: 'push',
        include_aliases: { external_id: [externalId] },
        headings: { en: payload.title, de: payload.title },
        contents: { en: payload.message, de: payload.message },
        data: payload.data,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.warn(`[OneSignal] Versand fehlgeschlagen (${res.status}): ${body}`);
      return false;
    }
    return true;
  } catch (e) {
    // Offline / CORS / Netzwerkfehler → App läuft normal weiter.
    console.warn('[OneSignal] Versand-Fehler:', e);
    return false;
  }
}
