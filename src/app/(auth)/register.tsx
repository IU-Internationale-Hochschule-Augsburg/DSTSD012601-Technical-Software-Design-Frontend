import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { TextInput, Button, Text, useTheme, Snackbar } from 'react-native-paper';
import { Link, useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { AuthService } from '../../services/auth.service';
import { SSOButtons } from '../../components/SSOButtons';

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { setUser, setRequireMfaSetup } = useAuth();
  const theme = useTheme();
  const router = useRouter();

  const handleRegister = async () => {
    if (!email || !password || !confirmPassword) {
      setError('Bitte alle Felder ausfüllen.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwörter stimmen nicht überein.');
      return;
    }

    setLoading(true);
    try {
      const user = await AuthService.registerWithEmail(email, password);
      // New users must setup MFA
      setRequireMfaSetup(true);
      setUser(user);
    } catch (e) {
      setError('Registrierung fehlgeschlagen.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1, backgroundColor: theme.colors.background }} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text variant="displaySmall" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
            Konto erstellen
          </Text>
          <Text variant="titleMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
            Verwalte deine Abos einfach.
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
        />
        
        <TextInput
          mode="outlined"
          label="Passwort"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={styles.input}
        />

        <TextInput
          mode="outlined"
          label="Passwort bestätigen"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          style={styles.input}
        />

        <Button 
          mode="contained" 
          onPress={handleRegister} 
          loading={loading}
          style={styles.registerButton}
          contentStyle={{ paddingVertical: 8 }}
        >
          Registrieren
        </Button>

        <View style={styles.divider}>
          <View style={[styles.line, { backgroundColor: theme.colors.outlineVariant }]} />
          <Text style={{ marginHorizontal: 8, color: theme.colors.onSurfaceVariant }}>ODER</Text>
          <View style={[styles.line, { backgroundColor: theme.colors.outlineVariant }]} />
        </View>

        <SSOButtons onSuccess={() => router.replace('/(tabs)')} mode="register" />

        <View style={styles.footer}>
          <Text style={{ color: theme.colors.onSurfaceVariant }}>Bereits ein Konto? </Text>
          <Link href="/(auth)/login" asChild>
            <Text style={{ color: theme.colors.primary, fontWeight: 'bold' }}>Anmelden</Text>
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
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  input: {
    marginBottom: 16,
  },
  registerButton: {
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
  }
});
