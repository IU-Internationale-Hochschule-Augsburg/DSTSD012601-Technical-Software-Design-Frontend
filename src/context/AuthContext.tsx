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
  setIsLoading: (val: boolean) => void;
}

export const AuthContext = createContext<AuthContextProps>({
  user: null,
  isLoading: true,
  setUser: () => {},
  logout: async () => {},
  requireMfaSetup: false,
  setRequireMfaSetup: () => {},
  setIsLoading: () => {},
});

const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [requireMfaSetup, setRequireMfaSetup] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await AuthService.getCurrentUser();
        handleSetUser(currentUser);
        // Bei aktiver 2FA muss der Code auch beim (Auto-)Start erneut bestätigt
        // werden → MFA-Gate öffnen.
        if (currentUser) {
          const { configured, enabled } = await AuthService.getMfaStatus();
          if (configured && enabled) setRequireMfaSetup(true);
        }
      } catch (error) {
        console.error('Failed to load user session', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

export default AuthProvider;
