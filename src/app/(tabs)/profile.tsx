import React, { useCallback, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, useTheme, Button, Avatar, List, Switch, Snackbar } from 'react-native-paper';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { runReminderScan } from '../../hooks/usePushReminders';
import { ThemeContext } from '../../context/ThemeContext';
import { APP_VERSION } from '../../utils/constants';

export default function ProfileScreen() {
  const { user, setUser, setRequireMfaSetup, logout } = useAuth();
  const { themeMode, toggleTheme } = React.useContext(ThemeContext);
  const theme = useTheme();
  const router = useRouter();

  const [loggingOut, setLoggingOut] = useState(false);
  const [mfaConfigured, setMfaConfigured] = useState(false);
  const [mfaEnabled, setMfaEnabled] = useState(false);

  const [enablingNotifications, setEnablingNotifications] = useState(false);
  const [snackbar, setSnackbar] = useState<string | null>(null);

  // Erlaubnis per Nutzer-Geste anfragen (Browser unterdrücken Auto-Prompts).
  // Bei Erfolg sofort die fälligen Abos prüfen, damit die erste Erinnerung
  // direkt erscheint.
  const enableNotifications = async () => {
    setEnablingNotifications(true);
    try {
      const granted = await NotificationService.requestPermission();
      if (granted) {
        if (user?.id) await runReminderScan(user.id);
        setSnackbar('Benachrichtigungen sind aktiviert.');
      } else {
        setSnackbar('Keine Erlaubnis erteilt. Bitte in den Browser-/Geräteeinstellungen zulassen.');
      }
    } catch {
      setSnackbar('Benachrichtigungen konnten nicht aktiviert werden.');
    } finally {
      setEnablingNotifications(false);
    }
  };

  // MFA-Status bei jedem Fokussieren neu laden (z. B. nach Rückkehr vom Setup).
  useFocusEffect(
    useCallback(() => {
      let active = true;
      AuthService.getMfaStatus().then(({ configured, enabled }) => {
        if (active) {
          setMfaConfigured(configured);
          setMfaEnabled(enabled);
        }
      });
      return () => {
        active = false;
      };
    }, [])
  );

  const handleToggleMfa = async (next: boolean) => {
    if (next && !mfaConfigured) {
      // Noch nicht eingerichtet → zur Einrichtung (QR scannen).
      setRequireMfaSetup(true);
      router.push('/(auth)/mfa-setup');
      return;
    }
    setMfaEnabled(next); // optimistisch
    const updated = await AuthService.setMfaLoginEnabled(next);
    if (updated) setUser(updated);
  };

  const handleReconfigureMfa = () => {
    setRequireMfaSetup(true);
    router.push('/(auth)/mfa-setup?mode=setup');
  };

  const logUserOut = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        {user?.avatarUrl ? (
          <Avatar.Image size={80} source={{ uri: user.avatarUrl }} />
        ) : (
          <Avatar.Text size={80} label={user?.displayName?.substring(0, 2).toUpperCase() || 'U'} />
        )}
        <Text variant="headlineSmall" style={[styles.name, { color: theme.colors.primary }]}>
          {user?.displayName}
        </Text>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          {user?.email}
        </Text>
      </View>

      <List.Section>
        <List.Subheader>Einstellungen</List.Subheader>
        <List.Item
          title="Dunkles Design (Dark Mode)"
          left={(props) => <List.Icon {...props} icon="theme-light-dark" />}
          right={() => <Switch value={themeMode === 'dark'} onValueChange={toggleTheme} />}
        />
      </List.Section>

      <List.Section>
        <List.Subheader>Benachrichtigungen</List.Subheader>
        <List.Item
          title="Erinnerungen aktivieren"
          description="Werde benachrichtigt, wenn ein Abo bald abläuft oder sich verlängert."
          left={(props) => <List.Icon {...props} icon="bell-ring-outline" />}
          right={() => (
            <Button
              mode="contained-tonal"
              compact
              onPress={enableNotifications}
              loading={enablingNotifications}
              disabled={enablingNotifications}
              style={styles.notifyButton}
            >
              Aktivieren
            </Button>
          )}
        />
      </List.Section>

      <List.Section>
        <List.Subheader>Sicherheit</List.Subheader>
        <List.Item
          title="2-Faktor-Authentifizierung beim Login"
          description={
            mfaConfigured
              ? mfaEnabled
                ? 'Aktiviert – Code wird beim Anmelden abgefragt'
                : 'Eingerichtet, aber deaktiviert'
              : 'Noch nicht eingerichtet'
          }
          left={(props) => <List.Icon {...props} icon="shield-lock-outline" />}
          right={() => <Switch value={mfaEnabled} onValueChange={handleToggleMfa} />}
        />
        {mfaConfigured && (
          <List.Item
            title="Authenticator neu einrichten"
            description="Neuen QR-Code erzeugen und App neu verbinden"
            left={(props) => <List.Icon {...props} icon="qrcode-scan" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={handleReconfigureMfa}
          />
        )}
      </List.Section>

      <View style={styles.footer}>
        <Button
          mode="outlined"
          icon="logout"
          onPress={logUserOut}
          loading={loggingOut}
          disabled={loggingOut}
          textColor={theme.colors.error}
          style={{ borderColor: theme.colors.error }}
        >
          Abmelden
        </Button>
        <Text variant="labelSmall" style={[styles.version, { color: theme.colors.onSurfaceVariant }]}>
          Version {APP_VERSION}
        </Text>
      </View>
    </ScrollView>
      <Snackbar visible={!!snackbar} onDismiss={() => setSnackbar(null)} duration={5000}>
        {snackbar}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  name: {
    fontWeight: 'bold',
    marginTop: 16,
  },
  footer: {
    marginTop: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  version: {
    marginTop: 16,
  },
  notifyButton: {
    alignSelf: 'center',
  },
});
