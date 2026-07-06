import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, useTheme, Card, Button, List } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSubscriptions } from '../../hooks/useSubscriptions';
import { EmptyState } from '../../components/EmptyState';
import { CATEGORY_ICONS, type Subscription } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { brandColors } from '../../theme';

const URGENT_THRESHOLD_DAYS = 7;
const OK_THRESHOLD_DAYS = 30;

type ReminderKind = 'cancellation' | 'renewal';

interface ReminderItem {
  key: string;
  subscription: Subscription;
  kind: ReminderKind;
  date: string;
  days: number;
}

function daysUntil(isoDate: string, now: Date = new Date()): number {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(isoDate);
  return Math.ceil((target.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24));
}

function categoryIcon(subscription: Subscription) {
  return (CATEGORY_ICONS[subscription.category] ||
    'dots-horizontal-circle') as keyof typeof MaterialCommunityIcons.glyphMap;
}

export default function RemindersScreen() {
  const { subscriptions = [], loading } = useSubscriptions();
  const theme = useTheme();
  const router = useRouter();

  // Fällige Kündigungsfristen und Verlängerungen zu einer sortierten Liste zusammenführen.
  const items = useMemo<ReminderItem[]>(() => {
    const list: ReminderItem[] = [];
    subscriptions.forEach((sub) => {
      if (sub.nextCancellationDate) {
        list.push({
          key: `${sub.id}-cancel`,
          subscription: sub,
          kind: 'cancellation',
          date: sub.nextCancellationDate,
          days: daysUntil(sub.nextCancellationDate),
        });
      }
      list.push({
        key: `${sub.id}-renew`,
        subscription: sub,
        kind: 'renewal',
        date: sub.nextPaymentDate,
        days: daysUntil(sub.nextPaymentDate),
      });
    });
    return list.filter((item) => item.days >= 0).sort((a, b) => a.days - b.days);
  }, [subscriptions]);

  const urgent = items.filter((item) => item.kind === 'cancellation' && item.days <= URGENT_THRESHOLD_DAYS);
  const urgentKeys = new Set(urgent.map((item) => item.key));
  const upcoming = items.filter((item) => !urgentKeys.has(item.key));

  if (!loading && subscriptions.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <EmptyState
          title="Noch keine Erinnerungen"
          message="Sobald du ein Abo anlegst, erinnern wir dich rechtzeitig an Kündigungsfristen und Verlängerungen."
          icon="bell-outline"
        />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
    >
      {urgent.length > 0 && (
        <>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
            Dringend
          </Text>
          {urgent.map((item) => (
            <Card
              key={item.key}
              mode="outlined"
              style={[styles.urgentCard, { borderColor: theme.colors.error }]}
            >
              <Card.Content>
                <View style={styles.row}>
                  <View style={[styles.avatar, { backgroundColor: theme.colors.primaryContainer }]}>
                    <MaterialCommunityIcons
                      name={categoryIcon(item.subscription)}
                      size={22}
                      color={theme.colors.onPrimaryContainer}
                    />
                  </View>
                  <View style={styles.rowText}>
                    <Text variant="titleSmall">
                      {item.subscription.name} kündbar in {item.days} {item.days === 1 ? 'Tag' : 'Tagen'}
                    </Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      Frist endet {formatDate(item.date)}
                    </Text>
                  </View>
                </View>
                <Button
                  mode="contained"
                  style={styles.urgentAction}
                  buttonColor={theme.colors.error}
                  onPress={() => router.push(`/subscription/${item.subscription.id}`)}
                >
                  Jetzt kündigen
                </Button>
              </Card.Content>
            </Card>
          ))}
        </>
      )}

      <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
        Demnächst
      </Text>
      {upcoming.length === 0 ? (
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
          Keine weiteren Erinnerungen.
        </Text>
      ) : (
        <List.Section style={styles.list}>
          {upcoming.map((item) => {
            const tone =
              item.days <= URGENT_THRESHOLD_DAYS ? 'error' : item.days <= 14 ? 'warning' : 'success';
            const pillColor =
              tone === 'error' ? theme.colors.error : tone === 'warning' ? brandColors.warning : brandColors.success;
            const pillBg =
              tone === 'error'
                ? theme.colors.errorContainer
                : tone === 'warning'
                ? 'rgba(237,108,2,0.15)'
                : 'rgba(46,125,50,0.15)';

            return (
              <List.Item
                key={item.key}
                title={item.kind === 'cancellation' ? `${item.subscription.name} kündbar` : `${item.subscription.name} verlängert sich`}
                description={
                  item.kind === 'cancellation'
                    ? `Frist bis ${formatDate(item.date)}`
                    : `am ${formatDate(item.date)} · ${formatCurrency(item.subscription.amount)}`
                }
                onPress={() => router.push(`/subscription/${item.subscription.id}`)}
                left={() => (
                  <View style={[styles.avatar, styles.listAvatar, { backgroundColor: theme.colors.primaryContainer }]}>
                    <MaterialCommunityIcons
                      name={categoryIcon(item.subscription)}
                      size={20}
                      color={theme.colors.onPrimaryContainer}
                    />
                  </View>
                )}
                right={() => (
                  <View style={[styles.pill, { backgroundColor: pillBg }]}>
                    <Text variant="labelSmall" style={{ color: pillColor, fontWeight: '600' }}>
                      {item.days > OK_THRESHOLD_DAYS ? 'OK' : `${item.days} T`}
                    </Text>
                  </View>
                )}
              />
            );
          })}
        </List.Section>
      )}

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 12,
    marginTop: 8,
  },
  urgentCard: {
    marginBottom: 16,
    borderWidth: 1.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowText: {
    flex: 1,
    marginLeft: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listAvatar: {
    marginLeft: 8,
  },
  urgentAction: {
    marginTop: 12,
  },
  list: {
    marginHorizontal: -8,
  },
  pill: {
    alignSelf: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
});
