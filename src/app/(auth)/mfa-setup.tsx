import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, TextInput, Button, useTheme, Snackbar, ActivityIndicator } from 'react-native-paper';
import { useRouter } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import { AuthService } from '../../services/auth.service';
import { useAuth } from '../../hooks/useAuth';

export default function MfaSetupScreen() {
  const [code, setCode] = useState('');
  const [otpAuthUri, setOtpAuthUri] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [skipping, setSkipping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const theme = useTheme();
  const router = useRouter();
  const { setRequireMfaSetup } = useAuth();

  useEffect(() => {
    // TOTP-Secret + QR beim Laden generieren.
    AuthService.setupMFA().then((data) => {
      setSecret(data.secret);
      setOtpAuthUri(data.otpAuthUri);
    });
  }, []);

  const handleVerify = async () => {
    if (code.length !== 6) {
      setError('Der Code muss 6 Ziffern lang sein.');
      return;
    }

    setLoading(true);
    try {
      const isValid = await AuthService.verifyMFA(code);
      if (isValid) {
        setRequireMfaSetup(false);
        router.replace('/(tabs)');
      } else {
        setError('Ungültiger Code. Bitte versuchen Sie es erneut.');
      }
    } catch {
      setError('Fehler bei der Verifizierung.');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    setSkipping(true);
    try {
      await AuthService.skipMFA();
      setRequireMfaSetup(false);
      router.replace('/(tabs)');
    } finally {
      setSkipping(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.primary }]}>
        MFA Einrichten
      </Text>

      <Text variant="bodyLarge" style={styles.description}>
        Scannen Sie diesen Code in Ihrer Authenticator-App (z.B. Google Authenticator) oder geben
        Sie den Secret-Schlüssel manuell ein.
      </Text>

      <View style={[styles.qrBox, { backgroundColor: '#fff', borderColor: theme.colors.outline }]}>
        {otpAuthUri ? (
          <QRCode value={otpAuthUri} size={184} />
        ) : (
          <ActivityIndicator />
        )}
      </View>

      <Text variant="bodyMedium" style={styles.secretText}>
        Secret: <Text style={{ fontWeight: 'bold' }}>{secret ?? '…'}</Text>
      </Text>

      <TextInput
        mode="outlined"
        label="6-stelliger Code"
        value={code}
        onChangeText={(t) => setCode(t.replace(/\D/g, ''))}
        keyboardType="number-pad"
        maxLength={6}
        style={styles.input}
      />

      <Button
        mode="contained"
        onPress={handleVerify}
        loading={loading}
        disabled={loading || skipping}
        style={styles.button}
      >
        Bestätigen
      </Button>

      <Button
        mode="text"
        onPress={handleSkip}
        loading={skipping}
        disabled={loading || skipping}
        style={styles.skipButton}
      >
        Überspringen
      </Button>

      <Snackbar visible={!!error} onDismiss={() => setError(null)}>
        {error}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 16,
  },
  description: {
    textAlign: 'center',
    marginBottom: 32,
  },
  qrBox: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 24,
  },
  secretText: {
    marginBottom: 32,
  },
  input: {
    width: '100%',
    marginBottom: 24,
  },
  button: {
    width: '100%',
    paddingVertical: 4,
  },
  skipButton: {
    width: '100%',
    marginTop: 8,
  },
});
