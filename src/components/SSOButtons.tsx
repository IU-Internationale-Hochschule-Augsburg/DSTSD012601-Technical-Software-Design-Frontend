import React from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import { Button, useTheme, Snackbar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useGoogleAuth } from '../hooks/useGoogleAuth';
import { useAuth } from '../hooks/useAuth';
import { AuthProvider, type User } from '../types';

interface Props {
  onSuccess: () => void;
  mode?: 'login' | 'register';
}

export const SSOButtons = ({ onSuccess, mode = 'login' }: Props) => {
  const theme = useTheme();
  const { signIn: googleSignIn, isLoading: googleLoading, error: googleError, user: googleUser } = useGoogleAuth();
  const { setUser, setIsLoading } = useAuth();
  const [appleLoading, setAppleLoading] = React.useState(false);
  const [appleError, setAppleError] = React.useState<string | null>(null);

  React.useEffect(() => {
    console.log('googleUser:', googleUser);
    console.log('setIsLoading type:', typeof setIsLoading);
    // Wenn Google-User vorhanden ist, setze ihn in den Auth-Context
    if (googleUser) {
      const appUser: User = {
        id: googleUser.id,
        email: googleUser.email,
        displayName: googleUser.name,
        avatarUrl: googleUser.picture,
        provider: AuthProvider.GOOGLE,
        mfaEnabled: true, // Google SSO-User benötigen MFA
        createdAt: new Date().toISOString(),
      };
      setUser(appUser);
      setIsLoading(false);
    }
  }, [googleUser, setUser, onSuccess]);

  const handleGoogle = async () => {
    try {
      await googleSignIn();
    } catch (e) {
      console.error('Google Login error:', e);
    }
  };

  const handleApple = async () => {
    setAppleLoading(true);
    try {
      // Stub: Apple Login würde hier implementiert werden
      // Für jetzt: Mock implementation
      setAppleError('Apple Login wird noch nicht unterstützt.');
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
          // googleError wird durch useGoogleAuth selbst verwaltet
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
    gap: 12, // React Native 0.71+ handles gap
  },
  button: {
    borderRadius: 8,
  }
});
