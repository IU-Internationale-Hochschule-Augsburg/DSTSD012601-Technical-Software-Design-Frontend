import React, { useState } from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import { Button, useTheme, Snackbar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthService } from '../services/auth.service';

interface Props {
  onSuccess: () => void;
  mode?: 'login' | 'register';
}

export const SSOButtons = ({ onSuccess, mode = 'login' }: Props) => {
  const theme = useTheme();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGoogle = async () => {
    setLoading('google');
    try {
      await AuthService.loginWithGoogle();
      onSuccess();
    } catch (e) {
      setError('Google Login fehlgeschlagen.');
    } finally {
      setLoading(null);
    }
  };

  const handleApple = async () => {
    setLoading('apple');
    try {
      await AuthService.loginWithApple();
      onSuccess();
    } catch (e) {
      setError('Apple Login fehlgeschlagen.');
    } finally {
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

      {/* Apple is mostly relevant on iOS devices based on Expo guidelines */}
      {Platform.OS !== 'android' && (
        <Button
          mode="contained"
          buttonColor="#000000"
          textColor="#FFFFFF"
          icon={() => <MaterialCommunityIcons name="apple" size={20} color="#FFFFFF" />}
          onPress={handleApple}
          loading={loading === 'apple'}
          disabled={loading !== null}
          style={styles.button}
        >
          {labelPrefix} Apple
        </Button>
      )}

      <Snackbar
        visible={error !== null}
        onDismiss={() => setError(null)}
        duration={3000}
      >
        {error}
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
