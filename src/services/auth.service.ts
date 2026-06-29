import * as Crypto from 'expo-crypto';
import { AuthProvider, type User } from '../types';
import { StorageService } from './storage.service';
import { ApiClient, ApiError } from './api.client';
import { STORAGE_KEYS } from '../utils/constants';
import { generateSecret, buildOtpAuthUri, verifyTotp } from '../utils/totp';

export interface GoogleProfile {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
}

async function deriveSsoPassword(provider: 'google' | 'apple', sub: string, email: string) {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${provider}:${sub}:${email.toLowerCase()}`
  );
}

interface BackendUser {
  id: string;
  email: string;
  name?: string;
  timezone?: string;
}

interface AuthResponse {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  user: BackendUser;
}

function mapUser(b: BackendUser, provider: AuthProvider, mfaEnabled: boolean): User {
  return {
    id: b.id,
    email: b.email,
    displayName: b.name || b.email.split('@')[0],
    provider,
    mfaEnabled,
    createdAt: new Date().toISOString(),
  };
}

async function persistSession(auth: AuthResponse, provider: AuthProvider): Promise<User> {
  await StorageService.set(STORAGE_KEYS.AUTH_TOKEN, auth.accessToken);
  await StorageService.set(STORAGE_KEYS.REFRESH_TOKEN, auth.refreshToken);
  await StorageService.set(STORAGE_KEYS.TOKEN_EXPIRES_AT, auth.accessTokenExpiresAt);
  // mfaEnabled spiegelt die gerätelokale Login-Präferenz (überlebt Logout).
  const loginEnabled =
    (await StorageService.get<boolean>(STORAGE_KEYS.MFA_LOGIN_ENABLED)) === true;
  const user = mapUser(auth.user, provider, loginEnabled);
  await StorageService.set(STORAGE_KEYS.USER, user);
  return user;
}

export const AuthService = {
  async loginWithEmail(email: string, password: string): Promise<User> {
    const auth = await ApiClient.post<AuthResponse>(
      '/api/Auth/login',
      { email, password },
      { auth: false }
    );
    return persistSession(auth, AuthProvider.EMAIL);
  },

  async registerWithEmail(email: string, password: string): Promise<User> {
    // Backend register returns only the user — perform login afterwards to get tokens.
    await ApiClient.post<BackendUser>(
      '/api/Auth/register',
      {
        email,
        password,
        name: email.split('@')[0],
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        notificationsEnabled: true,
        reminderDaysBefore: 3,
      },
      { auth: false }
    );
    return this.loginWithEmail(email, password);
  },

  async loginWithGoogle(): Promise<User> {
    throw new Error('Bitte SSOButtons verwenden — Google-Flow muss vom UI angestoßen werden.');
  },

  /**
   * Verarbeitet ein Google-Profil: erzeugt ein deterministisches Hash-Passwort,
   * legt den User beim Backend an (idempotent — 409 wird ignoriert) und loggt ein.
   */
  async loginWithGoogleProfile(profile: GoogleProfile): Promise<User> {
    const password = await deriveSsoPassword('google', profile.sub, profile.email);

    try {
      await ApiClient.post(
        '/api/Auth/register',
        {
          email: profile.email,
          password,
          name: profile.name || profile.email.split('@')[0],
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          notificationsEnabled: true,
          reminderDaysBefore: 3,
        },
        { auth: false }
      );
    } catch (e) {
      // 409 Conflict = User existiert schon → ok, weiter zum Login.
      if (!(e instanceof ApiError) || e.status !== 409) throw e;
    }

    const auth = await ApiClient.post<AuthResponse>(
      '/api/Auth/login',
      { email: profile.email, password },
      { auth: false }
    );
    return persistSession(auth, AuthProvider.GOOGLE);
  },

  /**
   * Aktueller MFA-Status auf diesem Gerät.
   *  - `configured`: ein TOTP-Secret ist hinterlegt
   *  - `enabled`: MFA soll beim Login abgefragt werden
   */
  async getMfaStatus(): Promise<{ configured: boolean; enabled: boolean }> {
    const secret = await StorageService.get<string>(STORAGE_KEYS.MFA_SECRET);
    const enabled = (await StorageService.get<boolean>(STORAGE_KEYS.MFA_LOGIN_ENABLED)) === true;
    return { configured: !!secret, enabled };
  },

  /**
   * Startet die MFA-Einrichtung: erzeugt ein TOTP-Secret (Google Authenticator
   * kompatibel), persistiert es als "pending" und liefert Secret + otpauth-URI
   * für den QR-Code.
   */
  async setupMFA(): Promise<{ secret: string; otpAuthUri: string }> {
    const cached = await StorageService.get<User>(STORAGE_KEYS.USER);
    const account = cached?.email ?? 'user';

    const secret = generateSecret();
    await StorageService.set(STORAGE_KEYS.MFA_SECRET, secret);

    return { secret, otpAuthUri: buildOtpAuthUri(secret, account) };
  },

  /**
   * Verifiziert einen 6-stelligen TOTP-Code gegen das hinterlegte Secret.
   * Bei Erfolg wird MFA für den Login aktiviert.
   */
  async verifyMFA(code: string): Promise<boolean> {
    const secret = await StorageService.get<string>(STORAGE_KEYS.MFA_SECRET);
    if (!secret) return false;

    const ok = await verifyTotp(code, secret);
    if (ok) {
      await StorageService.set(STORAGE_KEYS.MFA_VERIFIED, true);
      await StorageService.set(STORAGE_KEYS.MFA_LOGIN_ENABLED, true);
      await this.setMfaEnabledFlag(true);
    }
    return ok;
  },

  /** Aktiviert/deaktiviert die MFA-Abfrage beim Login (Secret bleibt erhalten). */
  async setMfaLoginEnabled(enabled: boolean): Promise<User | null> {
    await StorageService.set(STORAGE_KEYS.MFA_LOGIN_ENABLED, enabled);
    return this.setMfaEnabledFlag(enabled);
  },

  /** Überspringt/entfernt die MFA-Einrichtung – MFA bleibt deaktiviert. */
  async skipMFA(): Promise<void> {
    await StorageService.remove(STORAGE_KEYS.MFA_SECRET);
    await StorageService.remove(STORAGE_KEYS.MFA_VERIFIED);
    await StorageService.set(STORAGE_KEYS.MFA_LOGIN_ENABLED, false);
    await this.setMfaEnabledFlag(false);
  },

  /** Hält das `mfaEnabled`-Feld am gecachten User mit der Präferenz konsistent. */
  async setMfaEnabledFlag(enabled: boolean): Promise<User | null> {
    const user = await StorageService.get<User>(STORAGE_KEYS.USER);
    if (!user) return null;
    const updated = { ...user, mfaEnabled: enabled };
    await StorageService.set(STORAGE_KEYS.USER, updated);
    return updated;
  },

  async logout(): Promise<void> {
    const refreshToken = await StorageService.get<string>(STORAGE_KEYS.REFRESH_TOKEN);
    if (refreshToken) {
      try {
        await ApiClient.post('/api/Auth/logout', { refreshToken });
      } catch {
        // Ignore — local logout is the source of truth for UX.
      }
    }
    await StorageService.remove(STORAGE_KEYS.USER);
    await StorageService.remove(STORAGE_KEYS.AUTH_TOKEN);
    await StorageService.remove(STORAGE_KEYS.REFRESH_TOKEN);
    await StorageService.remove(STORAGE_KEYS.TOKEN_EXPIRES_AT);
    // MFA_VERIFIED ist sitzungsbezogen → zurücksetzen, damit beim nächsten Login
    // erneut der Code abgefragt wird.
    await StorageService.remove(STORAGE_KEYS.MFA_VERIFIED);
    // MFA_SECRET und MFA_LOGIN_ENABLED bleiben gerätelokal erhalten, damit die
    // einmal eingerichtete 2FA auch nach dem Logout weiter gilt.
  },

  async getCurrentUser(): Promise<User | null> {
    // The API client refreshes the access token on demand when a request returns 401,
    // so we can hand back the cached user directly.
    return StorageService.get<User>(STORAGE_KEYS.USER);
  },
};
