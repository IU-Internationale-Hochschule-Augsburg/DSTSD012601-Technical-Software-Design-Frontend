import { AuthProvider, type User } from '../types';
import { StorageService } from './storage.service';
import { STORAGE_KEYS } from '../utils/constants';

/**
 * Stub Service for Authentication and MFA.
 * In a real app, this would connect to Firebase Auth, Supabase, or a custom backend.
 */
export const AuthService = {
  async loginWithEmail(email: string, password: string):Promise<User> {
    // STUB: Real implementation would verify credentials via API
    console.log('Logging in with email:', email);
    
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const mockUser: User = {
      id: 'usr_mock_123',
      email,
      displayName: email.split('@')[0],
      provider: AuthProvider.EMAIL,
      mfaEnabled: true, // Requires MFA by requirements
      createdAt: new Date().toISOString(),
    };
    
    await StorageService.set(STORAGE_KEYS.USER, mockUser);
    return mockUser;
  },

  async registerWithEmail(email: string, password: string): Promise<User> {
    // STUB
    console.log('Registering with email:', email);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const mockUser: User = {
      id: 'usr_mock_123',
      email,
      displayName: email.split('@')[0],
      provider: AuthProvider.EMAIL,
      mfaEnabled: false, // Needs to setup MFA next
      createdAt: new Date().toISOString(),
    };
    await StorageService.set(STORAGE_KEYS.USER, mockUser);
    return mockUser;
  },

  async loginWithGoogle(): Promise<User> {
    // STUB: Would use expo-auth-session
    console.log('Logging in via Google SSO');
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const mockUser: User = {
      id: 'usr_mock_g123',
      email: 'google.user@example.com',
      displayName: 'Google User',
      provider: AuthProvider.GOOGLE,
      mfaEnabled: true,
      createdAt: new Date().toISOString(),
    };
    await StorageService.set(STORAGE_KEYS.USER, mockUser);
    return mockUser;
  },

  async loginWithApple(): Promise<User> {
     // STUB: Would use expo-crypto & expo-auth-session
     console.log('Logging in via Apple SSO');
     await new Promise((resolve) => setTimeout(resolve, 1000));
     const mockUser: User = {
       id: 'usr_mock_a123',
       email: 'apple.user@example.com',
       displayName: 'Apple User',
       provider: AuthProvider.APPLE,
       mfaEnabled: true,
       createdAt: new Date().toISOString(),
     };
     await StorageService.set(STORAGE_KEYS.USER, mockUser);
     return mockUser;
  },

  /**
   * Stubs MFA setup process. Generates a secret and returns a QR code payload.
   */
  async setupMFA(): Promise<{ secret: string; qrCodeDataUrl: string }> {
    // STUB
    return {
      secret: 'MOCK_SECRET_BASE32',
      qrCodeDataUrl: 'otpauth://totp/AboTracker:user@example.com?secret=MOCK_SECRET_BASE32&issuer=AboTracker',
    };
  },

  /**
   * Verifies the 6-digit MFA code provided by the user.
   */
  async verifyMFA(code: string): Promise<boolean> {
     // STUB
     console.log('Verifying MFA code:', code);
     await new Promise((resolve) => setTimeout(resolve, 800));
     // For demo purposes, '123456' is always correct
     return code === '123456';
  },

  async logout(): Promise<void> {
    // STUB: Clear session tokens
    await StorageService.remove(STORAGE_KEYS.USER);
    await StorageService.remove(STORAGE_KEYS.AUTH_TOKEN);
    await StorageService.remove(STORAGE_KEYS.MFA_VERIFIED);
  },

  async getCurrentUser(): Promise<User | null> {
    return StorageService.get<User>(STORAGE_KEYS.USER);
  }
};
