import * as Device from 'expo-device';
import {KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimatedIcon } from '@/components/animated-icon';
import { HintRow } from '@/components/hint-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WebBadge } from '@/components/web-badge';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import React, {useState} from "react";
import {useAuth} from "@/hooks/useAuth";
import {Button, Snackbar, Text, TextInput, useTheme} from "react-native-paper";
import {Link, useRouter} from "expo-router";
import {AuthService} from "@/services/auth.service";
import {APP_NAME} from "@/utils/constants";
import {SSOButtons} from "@/components/SSOButtons";

function getDevMenuHint() {
  if (Platform.OS === 'web') {
    return <ThemedText type="small">use browser devtools</ThemedText>;
  }
  if (Device.isDevice) {
    return (
      <ThemedText type="small">
        shake device or press <ThemedText type="code">m</ThemedText> in terminal
      </ThemedText>
    );
  }
  const shortcut = Platform.OS === 'android' ? 'cmd+m (or ctrl+m)' : 'cmd+d';
  return (
    <ThemedText type="small">
      press <ThemedText type="code">{shortcut}</ThemedText>
    </ThemedText>
  );
}

export default function HomeScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { setUser, setIsLoading, setRequireMfaSetup } = useAuth();
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
    } catch (e) {
      setError('Login fehlgeschlagen. Bitte überprüfen Sie Ihre Daten.');
    } finally {
      setLoading(false);
    }
  };

  const handleMfaVerification = () => {
    // If SSO sets user but user needs MFA
    router.replace('/(tabs)');
  };

  return (
      <KeyboardAvoidingView
          style={{ flex: 1, backgroundColor: theme.colors.background }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.container}>
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
          />

          <TextInput
              mode="outlined"
              label="Passwort"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              style={styles.input}
              accessibilityLabel="Passwort Eingabefeld"
          />

          <Button
              mode="contained"
              onPress={handleLogin}
              loading={loading}
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

          <SSOButtons onSuccess={handleMfaVerification} mode="login" />

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
  }
});
