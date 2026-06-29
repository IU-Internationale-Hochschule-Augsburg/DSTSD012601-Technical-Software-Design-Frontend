import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, useTheme, FAB } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { useSubscriptions } from '../../hooks/useSubscriptions';
import { DashboardWidget } from '../../components/DashboardWidget';
import { SubscriptionCard } from '../../components/SubscriptionCard';
import { formatCurrency } from '../../utils/formatters';
import type { Subscription } from '../../types';

export default function DashboardScreen() {
  const { user } = useAuth();
  const { subscriptions = [] } = useSubscriptions();
  const theme = useTheme();
  const router = useRouter();

  // Abgeleitete Werte nur neu berechnen, wenn sich die Abos ändern.
  const { totalSpendings, upcomingPayments, trialPeriods, upcomingCancellations } = useMemo(() => {
    const sortedByPayment = [...subscriptions].sort(
      (a, b) => new Date(a.nextPaymentDate).getTime() - new Date(b.nextPaymentDate).getTime()
    );

    return {
      totalSpendings: subscriptions.reduce((sum, sub) => sum + sub.amount, 0),
      upcomingPayments: sortedByPayment.slice(0, 5),
      trialPeriods: sortedByPayment.filter((s) => s.isTrialPeriod).slice(0, 5),
      upcomingCancellations: subscriptions
        .filter((s) => s.nextCancellationDate)
        .sort(
          (a, b) =>
            new Date(a.nextCancellationDate!).getTime() -
            new Date(b.nextCancellationDate!).getTime()
        )
        .slice(0, 5),
    };
  }, [subscriptions]);

  return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ScrollView
            style={{ backgroundColor: theme.colors.background }}
            contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.header}>
            <Text variant="headlineSmall" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
              Hallo, {user?.displayName || 'User'}!
            </Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              Hier ist deine aktuelle Übersicht.
            </Text>
          </View>

          <View style={styles.widgetRow}>
            <DashboardWidget
                title="Monatliche Kosten"
                value={formatCurrency(totalSpendings)}
                subtitle={`${subscriptions.length} aktive Abos`}
                icon="currency-eur"
            />
          </View>

          <Section title="Nächste Zahlungen" data={upcomingPayments} emptyText="Keine Zahlungen anstehend." theme={theme} />
          <Section title="Ablaufende Probemonate" data={trialPeriods} emptyText="Keine Probemonate aktiv." theme={theme} />
          <Section title="Kündigungsfristen" data={upcomingCancellations} emptyText="Keine Fristen in Kürze." theme={theme} />

          {/* Spacer for FAB */}
          <View style={{ height: 80 }} />
        </ScrollView>

        <FAB
            icon="plus"
            style={[styles.fab, { backgroundColor: theme.colors.primaryContainer }]}
            color={theme.colors.onPrimaryContainer}
            onPress={() => router.push('/subscription/add')}
        />
      </View>
  );
}

// Inline component for repeating sections
const Section = ({ title, data, emptyText, theme }: any) => (
  <View style={styles.section}>
    <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
      {title}
    </Text>
    {data.length === 0 ? (
      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 16 }}>
        {emptyText}
      </Text>
    ) : (
      data.map((item: Subscription) => (
        <SubscriptionCard 
          key={item.id} 
          subscription={item} 
          onPress={() => {}} 
        />
      ))
    )}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 16,
  },
  header: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  widgetRow: {
    paddingHorizontal: 8,
    marginBottom: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginLeft: 16,
    marginBottom: 8,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});
