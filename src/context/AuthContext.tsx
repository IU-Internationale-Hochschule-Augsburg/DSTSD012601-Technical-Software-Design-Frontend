import React, { createContext, useState, useEffect, ReactNode } from 'react';
import type { User } from '../types';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';

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
        // ← NEU: OAuth-Redirect erkannt → isLoading bleibt true
        // SSOButtons übernimmt und ruft setIsLoading(false) auf
        if (typeof window !== 'undefined') {
          const params = new URLSearchParams(window.location.search);
          if (params.get('code') && params.get('state')) {
            return;
          }
        }

        const currentUser = await AuthService.getCurrentUser();
        handleSetUser(currentUser);
        if (currentUser) {
          NotificationService.setExternalUserId(currentUser.id);
        }
      } catch (error) {
        console.error('Failed to load user session', error);
      } finally {
        // ← NEU: nur setIsLoading wenn KEIN OAuth-Redirect
        if (typeof window !== 'undefined') {
          const params = new URLSearchParams(window.location.search);
          if (!params.get('code')) {
            setIsLoading(false);
          }
        } else {
          setIsLoading(false);
        }
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
