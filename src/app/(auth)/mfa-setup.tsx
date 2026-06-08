import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, TextInput, Button, useTheme, Snackbar } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { AuthService } from '../../services/auth.service';
import { useAuth } from '../../hooks/useAuth';

export default function MfaSetupScreen() {
  const [code, setCode] = useState('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const theme = useTheme();
  const router = useRouter();
  const { setRequireMfaSetup } = useAuth();

  useEffect(() => {
    // Generate MFA secret when screen loads
    AuthService.setupMFA().then((data) => {
      setSecret(data.secret);
      setQrCodeDataUrl(data.qrCodeDataUrl);
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
    } catch (e) {
      setError('Fehler bei der Verifizierung.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.primary }]}>
        MFA Einrichten
      </Text>
      
      <Text variant="bodyLarge" style={styles.description}>
        Scannen Sie diesen Code in Ihrer Authenticator-App (z.B. Google Authenticator) oder geben Sie den Secret-Schlüssel manuell ein.
      </Text>

      <View style={[styles.qrPlaceholder, { backgroundColor: '#fff', borderColor: theme.colors.outline }]}>
         {/* Platzhalter für QR Code - In Produktion react-native-qrcode-svg nutzen */}
         <Text style={{ color: '#000' }}>[ QR CODE PLATZHALTER ]</Text>
      </View>

      <Text variant="bodyMedium" style={styles.secretText}>
        Secret: <Text style={{ fontWeight: 'bold' }}>{secret}</Text>
      </Text>

      <TextInput
        mode="outlined"
        label="6-stelliger Code"
        value={code}
        onChangeText={setCode}
        keyboardType="number-pad"
        maxLength={6}
        style={styles.input}
      />

      <Button 
        mode="contained" 
        onPress={handleVerify} 
        loading={loading}
        style={styles.button}
      >
        Bestätigen
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
  qrPlaceholder: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
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
  }
});
