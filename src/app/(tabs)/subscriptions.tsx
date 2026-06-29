import React, { useCallback, useMemo, useState } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, type ListRenderItem } from 'react-native';
import { useTheme, FAB } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useSubscriptions } from '../../hooks/useSubscriptions';
import { FilterBar } from '../../components/FilterBar';
import { SubscriptionCard } from '../../components/SubscriptionCard';
import { EmptyState } from '../../components/EmptyState';
import type { Subscription, FilterOptions, SortOption, SortField } from '../../types';

const keyExtractor = (item: Subscription) => item.id;

export default function SubscriptionsScreen() {
  const { loading, syncing, refresh, getFilteredAndSorted } = useSubscriptions();
  const theme = useTheme();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const filterOptions: FilterOptions = useMemo(
    () => ({ categories: [], searchQuery }),
    [searchQuery]
  );

  const sortOption: SortOption = useMemo(
    () => ({ field: sortField, direction: sortDirection }),
    [sortField, sortDirection]
  );

  // Nur neu filtern/sortieren, wenn sich Daten, Filter oder Sortierung ändern.
  const data = useMemo(
    () => getFilteredAndSorted(filterOptions, sortOption),
    [getFilteredAndSorted, filterOptions, sortOption]
  );

  const toggleSort = () => {
    // Cycle logic: Name asc -> Amount desc -> NextPaymentDate asc
    if (sortField === 'name') {
      setSortField('amount');
      setSortDirection('desc');
    } else if (sortField === 'amount') {
      setSortField('nextPaymentDate');
      setSortDirection('asc');
    } else {
      setSortField('name');
      setSortDirection('asc');
    }
  };

  const navigateToSubscription = useCallback(
    (sub: Subscription) => {
      router.push(`/subscription/${sub.id}`);
    },
    [router]
  );

  const renderItem: ListRenderItem<Subscription> = useCallback(
    ({ item }) => (
      <SubscriptionCard
        subscription={item}
        onPress={() => navigateToSubscription(item)}
        onEdit={() => navigateToSubscription(item)}
      />
    ),
    [navigateToSubscription]
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onFilterPress={() => { /* Open filter modal */ }}
        sortField={sortField}
        sortDirection={sortDirection}
        onSortToggle={toggleSort}
      />

      <FlatList
        data={data}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        removeClippedSubviews
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={11}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={syncing} onRefresh={refresh} />
        }
        ListEmptyComponent={
          loading ? null : (
            <EmptyState 
              title="Keine Abos gefunden" 
              message="Füge dein erstes Abonnement hinzu, um den Überblick zu behalten." 
            />
          )
        }
      />

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primaryContainer }]}
        color={theme.colors.onPrimaryContainer}
        onPress={() => router.push('/subscription/add')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 80, // Space for FAB
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});
