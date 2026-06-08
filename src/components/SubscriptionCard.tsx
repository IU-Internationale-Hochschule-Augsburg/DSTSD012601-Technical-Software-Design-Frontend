import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, Text, useTheme, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { Subscription } from '../types';
import { CATEGORY_LABELS, CATEGORY_ICONS } from '../types';
import { formatCurrency, formatPaymentDay, formatRelativeDate } from '../utils/formatters';

interface Props {
  subscription: Subscription;
  onPress: () => void;
  onEdit?: () => void;
}

export const SubscriptionCard = ({ subscription, onPress, onEdit }: Props) => {
  const theme = useTheme();
  const iconName = CATEGORY_ICONS[subscription.category] as keyof typeof MaterialCommunityIcons.glyphMap || 'dots-horizontal-circle';

  return (
    <Card 
      style={styles.card} 
      onPress={onPress}
      mode="elevated"
    >
      <Card.Content style={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: theme.colors.primaryContainer }]}>
          <MaterialCommunityIcons 
            name={iconName} 
            size={24} 
            color={theme.colors.onPrimaryContainer} 
          />
        </View>

        <View style={styles.details}>
          <Text variant="titleMedium" numberOfLines={1}>
            {subscription.name}
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {CATEGORY_LABELS[subscription.category]} • Kündigung {subscription.cancellationPeriod}
          </Text>
          {subscription.isTrialPeriod && (
             <Text variant="labelSmall" style={{ color: theme.colors.primary, marginTop: 4 }}>
               Probe bis {subscription.trialEndDate ? formatRelativeDate(subscription.trialEndDate) : 'unbekannt'}
             </Text>
          )}
        </View>

        <View style={styles.priceContainer}>
          <Text variant="titleMedium" style={{ color: theme.colors.primary }}>
            {formatCurrency(subscription.amount)}
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            am {formatPaymentDay(subscription.paymentDay)}
          </Text>
        </View>

        {onEdit && (
          <IconButton
            icon="pencil-outline"
            size={20}
            onPress={onEdit}
            style={styles.editButton}
          />
        )}
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginVertical: 8,
    marginHorizontal: 16,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  details: {
    flex: 1,
    marginRight: 8,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  editButton: {
    margin: 0,
    marginLeft: 4,
  }
});
