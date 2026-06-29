import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { TextInput, Button, Text, useTheme, Snackbar, ActivityIndicator } from 'react-native-paper';
import { Link, useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { AuthService } from '../../services/auth.service';
import { SSOButtons } from '../../components/SSOButtons';
import { APP_NAME } from '../../utils/constants';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLoadingIndicator, setShowLoadingIndicator] = useState(false);

  const { setUser, setRequireMfaSetup, setIsLoading } = useAuth();
  const theme = useTheme();
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Bitte E-Mail und Passwort eingeben.');
      return;
    }

    setLoading(true);
    try {
      const user = await AuthService.loginWithEmail(email, password);
      // MFA Simulation: if requires MFA, we route via layout rules, 
      // but let's assume we set the user to trigger layout reaction
      if (!user.mfaEnabled) {
          setRequireMfaSetup(true);
      }
      setUser(user);
      setIsLoading(false);
      router.replace('/(auth)/mfa-setup');
    } catch (e) {
      setError('Login fehlgeschlagen. Bitte überprüfen Sie Ihre Daten.');
    } finally {
      setLoading(false);
    }
  };

  const handleSSOSuccess = () => {
    // SSO-User wird durch SSOButtons direkt in den Auth-Context gesetzt
    // Wir zeigen einen kurzen Loading-State und navigieren dann
    setShowLoadingIndicator(true);
    setTimeout(() => {
      router.replace('/(tabs)');
    }, 500);
  };

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1, backgroundColor: theme.colors.background }} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        {showLoadingIndicator && (
          <View style={[styles.loadingOverlay, { backgroundColor: theme.colors.background }]}>
            <ActivityIndicator animating={true} size="large" color={theme.colors.primary} />
          </View>
        )}

        <View style={styles.header}>
          <Text variant="displaySmall" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
            {APP_NAME}
          </Text>
          <Text variant="titleMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
            Willkommen zurück!
          </Text>
        </View>

        <TextInput
          mode="outlined"
          label="E-Mail"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
          accessibilityLabel="E-Mail Eingabefeld"
          disabled={loading || showLoadingIndicator}
        />
        
        <TextInput
          mode="outlined"
          label="Passwort"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={styles.input}
          accessibilityLabel="Passwort Eingabefeld"
          disabled={loading || showLoadingIndicator}
        />

        <Button 
          mode="contained" 
          onPress={handleLogin} 
          loading={loading}
          disabled={loading || showLoadingIndicator}
          style={styles.loginButton}
          contentStyle={{ paddingVertical: 8 }}
        >
          Anmelden
        </Button>

        <View style={styles.divider}>
          <View style={[styles.line, { backgroundColor: theme.colors.outlineVariant }]} />
          <Text style={{ marginHorizontal: 8, color: theme.colors.onSurfaceVariant }}>ODER</Text>
          <View style={[styles.line, { backgroundColor: theme.colors.outlineVariant }]} />
        </View>

        <SSOButtons onSuccess={handleSSOSuccess} mode="login" />

        <View style={styles.footer}>
          <Text style={{ color: theme.colors.onSurfaceVariant }}>Noch kein Konto? </Text>
          <Link href="/(auth)/register" asChild>
            <Text style={{ color: theme.colors.primary, fontWeight: 'bold' }}>Hier registrieren</Text>
          </Link>
        </View>

        <Snackbar visible={!!error} onDismiss={() => setError(null)} duration={3000}>
          {error}
        </Snackbar>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
    position: 'relative',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  input: {
    marginBottom: 16,
  },
  loginButton: {
    marginTop: 8,
    borderRadius: 8,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  line: {
    flex: 1,
    height: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 32,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  }
});
