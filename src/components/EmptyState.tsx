import React from 'react';
import { StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import { Text, useTheme, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface Props {
  title: string;
  message: string;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}

export const EmptyState = ({ title, message, icon = 'package-variant', actionLabel, onAction, style }: Props) => {
  const theme = useTheme();

  return (
    <View style={[styles.container, style]}>
      <View style={[styles.iconBox, { backgroundColor: theme.colors.surfaceVariant }]}>
         <MaterialCommunityIcons name={icon} size={48} color={theme.colors.onSurfaceVariant} />
      </View>
      <Text variant="titleMedium" style={styles.title}>{title}</Text>
      <Text variant="bodyMedium" style={[styles.message, { color: theme.colors.onSurfaceVariant }]}>
        {message}
      </Text>
      {actionLabel && onAction && (
        <Button mode="contained" onPress={onAction} style={styles.button}>
          {actionLabel}
        </Button>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    minHeight: 250,
  },
  iconBox: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    marginTop: 8,
  }
});
