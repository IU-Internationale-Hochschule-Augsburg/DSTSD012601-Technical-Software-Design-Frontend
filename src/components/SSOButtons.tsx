import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, useTheme, Snackbar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { AuthService, type GoogleProfile } from '../services/auth.service';
import { useAuth } from '../hooks/useAuth';

WebBrowser.maybeCompleteAuthSession();

interface Props {
  onSuccess: () => void;
  mode?: 'login' | 'register';
}

const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';

export const SSOButtons = ({ onSuccess, mode = 'login' }: Props) => {
  const theme = useTheme();
  const { setUser, setRequireMfaSetup } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [, response, promptAsync] = Google.useAuthRequest({
    clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
    scopes: ['openid', 'email', 'profile'],
  });

  // Handle the Google response → fetch profile → backend login
  useEffect(() => {
    if (!response) return;

    if (response.type !== 'success') {
      if (response.type === 'error') setError('Google Login fehlgeschlagen.');
      setLoading(null);
      return;
    }

    const accessToken = response.authentication?.accessToken;
    if (!accessToken) {
      setError('Kein Token von Google erhalten.');
      setLoading(null);
      return;
    }

    (async () => {
      try {
        const res = await fetch(GOOGLE_USERINFO_URL, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!res.ok) throw new Error('Userinfo fehlgeschlagen');
        const profile = (await res.json()) as GoogleProfile;
        if (!profile.email || !profile.sub) throw new Error('Profil unvollständig');

        const user = await AuthService.loginWithGoogleProfile(profile);
        // MFA-Gate: nur wenn 2FA eingerichtet UND beim Login aktiviert ist.
        const { configured, enabled } = await AuthService.getMfaStatus();
        setRequireMfaSetup(configured && enabled);
        setUser(user);
        onSuccess();
      } catch (e) {
        console.error('Google SSO error', e);
        setError('Anmeldung am Backend fehlgeschlagen.');
      } finally {
        setLoading(null);
      }
    })();
  }, [response, onSuccess, setUser, setRequireMfaSetup]);

  const handleGoogle = async () => {
    setLoading('google');
    try {
      await promptAsync();
    } catch {
      setError('Google Login konnte nicht gestartet werden.');
      setLoading(null);
    }
  };

  const labelPrefix = mode === 'login' ? 'Anmelden mit' : 'Registrieren mit';

  return (
    <View style={styles.container}>
      <Button
        mode="outlined"
        icon={() => <MaterialCommunityIcons name="google" size={20} color={theme.colors.error} />}
        onPress={handleGoogle}
        loading={loading === 'google'}
        disabled={loading !== null}
        style={styles.button}
      >
        {labelPrefix} Google
      </Button>

      <Snackbar visible={error !== null} onDismiss={() => setError(null)} duration={3000}>
        {error}
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
  },
});
