import React, { useState } from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import { Button, useTheme, Snackbar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthService } from '../services/auth.service';
import { useGoogleAuth } from '../hooks/useGoogleAuth';
import { useAuth } from '../hooks/useAuth';
import { AuthProvider, type User } from '../types';
import { STANDALONE } from '../utils/constants';

interface Props {
  onSuccess: () => void;
  mode?: 'login' | 'register';
}

export const SSOButtons = ({ onSuccess, mode = 'login' }: Props) => {
  const theme = useTheme();
  const { setUser, setIsLoading } = useAuth();
  const { signIn: googleSignIn, isLoading: googleLoading, error: googleError, user: googleUser } = useGoogleAuth();
  const [appleLoading, setAppleLoading] = useState(false);
  const [appleError, setAppleError] = useState<string | null>(null);

  React.useEffect(() => {
    // If not in standalone mode and googleUser is fetched from Google SSO redirect callback
    if (!STANDALONE && googleUser) {
      const appUser: User = {
        id: googleUser.id,
        email: googleUser.email,
        displayName: googleUser.name,
        avatarUrl: googleUser.picture,
        provider: AuthProvider.GOOGLE,
        mfaEnabled: true,
        createdAt: new Date().toISOString(),
      };
      setUser(appUser);
      setIsLoading(false);
      onSuccess();
    }
  }, [googleUser, setUser, setIsLoading, onSuccess]);

  const handleGoogle = async () => {
    if (STANDALONE) {
      try {
        const user = await AuthService.loginWithGoogle();
        setUser(user);
        onSuccess();
      } catch (e) {
        console.error('Google Login error:', e);
      }
    } else {
      try {
        await googleSignIn();
      } catch (e) {
        console.error('Google Sign-In Error:', e);
      }
    }
  };

  const handleApple = async () => {
    setAppleLoading(true);
    try {
      const user = await AuthService.loginWithApple();
      setUser(user);
      onSuccess();
    } catch (e) {
      setAppleError('Apple Login fehlgeschlagen.');
    } finally {
      setAppleLoading(false);
    }
  };

  const labelPrefix = mode === 'login' ? 'Anmelden mit' : 'Registrieren mit';
  const displayError = googleError || appleError;

  return (
    <View style={styles.container}>
      <Button
        mode="outlined"
        icon={() => <MaterialCommunityIcons name="google" size={20} color={theme.colors.error} />}
        onPress={handleGoogle}
        loading={googleLoading}
        disabled={googleLoading || appleLoading}
        style={styles.button}
      >
        {googleLoading ? '' : `${labelPrefix} Google`}
      </Button>
      <Snackbar
        visible={displayError !== null}
        onDismiss={() => {
          setAppleError(null);
        }}
        duration={3000}
      >
        {displayError}
      </Snackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingVertical: 16,
    gap: 12,
  },
  button: {
    borderRadius: 8,
  }
});
