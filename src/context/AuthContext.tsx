import React, { createContext, useState, useEffect, ReactNode } from 'react';
import type { User } from '../types';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';
import {StorageService} from "@/services/storage.service";
import GOOGLE_OAUTH_DATA from "@/utils/googleO2Auth";


const GOOGLE_CLIENT_ID = GOOGLE_OAUTH_DATA.web.client_id;
const GOOGLE_CLIENT_SECRET = GOOGLE_OAUTH_DATA.web.client_secret;

export enum provider {
  GOOGLE = 'google',
  // Weitere Provider können hier hinzugefügt werden
}

export const STORAGE_KEYS = {
  USER: 'auth_user',
};

interface AuthContextProps {
  user: User | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  logout: () => Promise<void>;
  requireMfaSetup: boolean;
  setRequireMfaSetup: (val: boolean) => void;
  setIsLoading: (val: boolean) => void; // ← NEU
}

export const AuthContext = createContext<AuthContextProps>({
  user: null,
  isLoading: true,
  setUser: () => {},
  logout: async () => {},
  requireMfaSetup: false,
  setRequireMfaSetup: () => {},
  setIsLoading: () => {}, // ← NEU
});

const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [requireMfaSetup, setRequireMfaSetup] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        if (typeof window !== 'undefined') {
          const params = new URLSearchParams(window.location.search);
          const code = params.get('code');
          const state = params.get('state');

          if (code && state) {
            // OAuth-Callback direkt hier verarbeiten
            const savedState = localStorage.getItem('oauth_state');
            const codeVerifier = localStorage.getItem('oauth_code_verifier');

            if (!savedState || !codeVerifier || state !== savedState) {
              console.error('Invalid OAuth state');
              setIsLoading(false);
              return;
            }

            localStorage.removeItem('oauth_state');
            localStorage.removeItem('oauth_code_verifier');

            // URL bereinigen
            const url = new URL(window.location.href);
            url.searchParams.delete('code');
            url.searchParams.delete('state');
            url.searchParams.delete('iss');
            url.searchParams.delete('authuser');
            url.searchParams.delete('prompt');
            url.searchParams.delete('scope');
            window.history.replaceState({}, '', url.toString());

            // Token exchange
            const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: new URLSearchParams({
                code,
                client_id: GOOGLE_CLIENT_ID, // aus googleO2Auth importieren
                client_secret: GOOGLE_CLIENT_SECRET,
                redirect_uri: 'https://sparaw.de',
                grant_type: 'authorization_code',
                code_verifier: codeVerifier,
              }),
            });

            const tokens = await tokenRes.json();

            const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${tokens.access_token}` },
            });
            const googleUser = await userRes.json();

            const appUser: User = {
              id: googleUser.sub,
              email: googleUser.email,
              displayName: googleUser.name,
              avatarUrl: googleUser.picture,
              provider: provider.GOOGLE,
              mfaEnabled: true,
              createdAt: new Date().toISOString(),
            };

            await StorageService.set(STORAGE_KEYS.USER, appUser);
            handleSetUser(appUser);
            setIsLoading(false);
            return;
          }
        }

        const currentUser = await AuthService.getCurrentUser();
        handleSetUser(currentUser);
      } catch (error) {
        console.error('Failed to load user session', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadUser();
  }, []);

  const handleSetUser = (newUser: User | null) => {
    setUser(newUser);
    if (newUser) {
       NotificationService.setExternalUserId(newUser.id);
    } else {
       NotificationService.logout();
    }
  };

  const logout = async () => {
    await AuthService.logout();
    handleSetUser(null);
  };


  // @ts-ignore
  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        isLoading, 
        setUser: handleSetUser, 
        logout,
        requireMfaSetup,
        setRequireMfaSetup,
        setIsLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
export default AuthProvider
