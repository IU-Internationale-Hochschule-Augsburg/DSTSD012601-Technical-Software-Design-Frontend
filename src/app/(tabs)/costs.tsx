import React, { useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, useTheme, SegmentedButtons, Card } from 'react-native-paper';
import { useSubscriptions } from '../../hooks/useSubscriptions';
import { EmptyState } from '../../components/EmptyState';
import { CATEGORY_LABELS, type SubscriptionCategory } from '../../types';
import { formatCurrency } from '../../utils/formatters';

type Period = 'monat' | 'jahr';

export default function CostsScreen() {
  const { subscriptions = [], loading } = useSubscriptions();
  const theme = useTheme();
  const [period, setPeriod] = useState<Period>('monat');

  // Kosten pro Kategorie nur neu aggregieren, wenn sich die Abos ändern.
  const { monthlyTotal, categoryTotals } = useMemo(() => {
    const totals = new Map<SubscriptionCategory, number>();
    let total = 0;
    subscriptions.forEach((sub) => {
      total += sub.amount;
      totals.set(sub.category, (totals.get(sub.category) ?? 0) + sub.amount);
    });
    return {
      monthlyTotal: total,
      categoryTotals: [...totals.entries()].sort((a, b) => b[1] - a[1]),
    };
  }, [subscriptions]);

  const factor = period === 'jahr' ? 12 : 1;
  const displayTotal = monthlyTotal * factor;
  const maxCategoryAmount = categoryTotals[0]?.[1] ?? 0;
  const barColors = [theme.colors.primary, theme.colors.secondary, theme.colors.tertiary, theme.colors.outline];

  if (!loading && subscriptions.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <EmptyState
          title="Noch keine Kosten"
          message="Sobald du ein Abo anlegst, siehst du hier deine monatlichen und jährlichen Kosten im Überblick."
          icon="chart-donut"
        />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
    >
      <SegmentedButtons
        value={period}
        onValueChange={(value) => setPeriod(value as Period)}
        style={styles.segmented}
        buttons={[
          { value: 'monat', label: 'Monat' },
          { value: 'jahr', label: 'Jahr' },
        ]}
      />

      <Card style={[styles.summaryCard, { backgroundColor: theme.colors.primaryContainer }]} mode="contained">
        <Card.Content>
          <Text variant="labelMedium" style={{ color: theme.colors.onPrimaryContainer }}>
            Gesamt pro {period === 'monat' ? 'Monat' : 'Jahr'}
          </Text>
          <Text variant="displaySmall" style={[styles.summaryValue, { color: theme.colors.onPrimaryContainer }]}>
            {formatCurrency(displayTotal)}
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onPrimaryContainer }}>
            {period === 'monat'
              ? `≈ ${formatCurrency(monthlyTotal * 12)} hochgerechnet aufs Jahr`
              : `≈ ${formatCurrency(monthlyTotal)} pro Monat`}
            {' · '}
            {subscriptions.length} aktive Abos
          </Text>
        </Card.Content>
      </Card>

      <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
        Nach Kategorie
      </Text>
      {categoryTotals.map(([category, amount], index) => (
        <View key={category} style={styles.categoryRow}>
          <Text
            variant="bodyMedium"
            numberOfLines={1}
            style={[styles.categoryLabel, { color: theme.colors.onSurface }]}
          >
            {CATEGORY_LABELS[category]}
          </Text>
          <View style={[styles.barTrack, { backgroundColor: theme.colors.surfaceVariant }]}>
            <View
              style={[
                styles.bar,
                {
                  width: maxCategoryAmount > 0 ? `${(amount / maxCategoryAmount) * 100}%` : '0%',
                  backgroundColor: barColors[index % barColors.length],
                },
              ]}
            />
          </View>
          <Text variant="bodyMedium" style={[styles.categoryValue, { color: theme.colors.onSurfaceVariant }]}>
            {formatCurrency(amount * factor)}
          </Text>
        </View>
      ))}

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
  segmented: {
    marginBottom: 16,
  },
  summaryCard: {
    marginBottom: 24,
  },
  summaryValue: {
    fontWeight: 'bold',
    marginVertical: 4,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 12,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  categoryLabel: {
    width: 90,
  },
  barTrack: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    marginHorizontal: 12,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: 5,
  },
  categoryValue: {
    width: 80,
    textAlign: 'right',
  },
});
