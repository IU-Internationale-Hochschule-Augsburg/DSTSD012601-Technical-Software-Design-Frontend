import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, useTheme, Button, Avatar, List, Switch } from 'react-native-paper';
import { useAuth } from '../../hooks/useAuth';
import { ThemeContext } from '../../context/ThemeContext';
import { APP_VERSION } from '../../utils/constants';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { themeMode, toggleTheme } = React.useContext(ThemeContext);
  const theme = useTheme();

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
        <List.Item
          title="2-Faktor-Authentifizierung"
          description={user?.mfaEnabled ? 'Aktiviert' : 'Deaktiviert'}
          left={(props) => <List.Icon {...props} icon="shield-lock-outline" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => { /* Navigate to MFA settings */ }}
        />
      </List.Section>

      <View style={styles.footer}>
        <Button 
          mode="outlined" 
          icon="logout" 
          onPress={logout}
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
