import * as Crypto from 'expo-crypto';
import { AuthProvider, type User } from '../types';
import { StorageService } from './storage.service';
import { ApiClient, ApiError } from './api.client';
import { STORAGE_KEYS } from '../utils/constants';

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

function mapUser(b: BackendUser, provider: AuthProvider = AuthProvider.EMAIL): User {
  return {
    id: b.id,
    email: b.email,
    displayName: b.name || b.email.split('@')[0],
    provider,
    mfaEnabled: true,
    createdAt: new Date().toISOString(),
  };
}

async function persistSession(auth: AuthResponse, provider: AuthProvider): Promise<User> {
  await StorageService.set(STORAGE_KEYS.AUTH_TOKEN, auth.accessToken);
  await StorageService.set(STORAGE_KEYS.REFRESH_TOKEN, auth.refreshToken);
  await StorageService.set(STORAGE_KEYS.TOKEN_EXPIRES_AT, auth.accessTokenExpiresAt);
  const user = mapUser(auth.user, provider);
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

  async loginWithApple(): Promise<User> {
    throw new Error('Apple SSO ist noch nicht implementiert.');
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

  async setupMFA(): Promise<{ secret: string; qrCodeDataUrl: string }> {
    return {
      secret: 'MOCK_SECRET_BASE32',
      qrCodeDataUrl:
        'otpauth://totp/AboTracker:user@example.com?secret=MOCK_SECRET_BASE32&issuer=AboTracker',
    };
  },

  async verifyMFA(code: string): Promise<boolean> {
    return code === '123456';
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
    await StorageService.remove(STORAGE_KEYS.MFA_VERIFIED);
  },

  async getCurrentUser(): Promise<User | null> {
    // The API client refreshes the access token on demand when a request returns 401,
    // so we can hand back the cached user directly.
    return StorageService.get<User>(STORAGE_KEYS.USER);
  },
};
