import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, useTheme, Button, Avatar, List, Switch } from 'react-native-paper';
import { useAuth } from '../../hooks/useAuth';
import { ThemeContext } from '../../context/ThemeContext';
import { APP_VERSION } from '../../utils/constants';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { themeMode, toggleTheme } = React.useContext(ThemeContext);
  const theme = useTheme();
  const [loggingOut, setLoggingOut] = useState(false);

  // Echtes Abmelden: Tokens + Session löschen (Backend-Logout inkl.).
  // Der Navigation-Guard im Root-Layout leitet danach automatisch zum Login.
  const logUserOut = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
         {user?.avatarUrl ? (
           <Avatar.Image size={80} source={{ uri: user.avatarUrl }} />
         ) : (
           <Avatar.Text size={80} label={user?.displayName?.substring(0,2).toUpperCase() || 'U'} />
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
  }
});
