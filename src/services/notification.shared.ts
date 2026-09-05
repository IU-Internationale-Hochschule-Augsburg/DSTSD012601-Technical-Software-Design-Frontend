// Gemeinsame Typen für die (plattformgeteilte) Notification-Anbindung.

export interface PushPayload {
  title: string;
  message: string;
  /** Optionale Nutzdaten (z. B. Abo-ID fürs Deep-Linking beim Klick). */
  data?: Record<string, string>;
}
