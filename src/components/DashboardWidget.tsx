import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface Props {
  title: string;
  value: string;
  subtitle?: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  color?: string; // override primary
}

export const DashboardWidget = ({ title, value, subtitle, icon, color }: Props) => {
  const theme = useTheme();
  const tintColor = color || theme.colors.primary;

  return (
    <Card style={styles.card} mode="contained">
      <Card.Content style={styles.content}>
        <View style={styles.header}>
           <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
             {title}
           </Text>
           <MaterialCommunityIcons name={icon} size={20} color={tintColor} />
        </View>
        <Text variant="displaySmall" style={[styles.value, { color: tintColor }]}>
          {value}
        </Text>
        {subtitle && (
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {subtitle}
          </Text>
        )}
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    margin: 8,
    minWidth: 150,
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  value: {
    fontWeight: 'bold',
    marginBottom: 4,
  }
});
