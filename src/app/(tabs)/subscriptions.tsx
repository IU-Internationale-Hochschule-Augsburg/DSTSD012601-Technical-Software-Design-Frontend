import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  ScrollView,
  type ListRenderItem,
} from 'react-native';
import { useTheme, FAB, Portal, Dialog, Chip, Button } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useSubscriptions } from '../../hooks/useSubscriptions';
import { FilterBar } from '../../components/FilterBar';
import { SubscriptionCard } from '../../components/SubscriptionCard';
import { EmptyState } from '../../components/EmptyState';
import {
  CATEGORY_LABELS,
  SubscriptionCategory,
  type Subscription,
  type FilterOptions,
  type SortOption,
  type SortField,
} from '../../types';

const keyExtractor = (item: Subscription) => item.id;
const ALL_CATEGORIES = Object.values(SubscriptionCategory);

export default function SubscriptionsScreen() {
  const { loading, syncing, refresh, getFilteredAndSorted } = useSubscriptions();
  const theme = useTheme();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const [filterVisible, setFilterVisible] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<SubscriptionCategory[]>([]);

  const toggleCategory = (cat: SubscriptionCategory) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const filterOptions: FilterOptions = useMemo(
    () => ({ categories: selectedCategories, searchQuery }),
    [selectedCategories, searchQuery]
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
        onFilterPress={() => setFilterVisible(true)}
        sortField={sortField}
        sortDirection={sortDirection}
        onSortToggle={toggleSort}
        categoryCount={selectedCategories.length}
      />

      <FlatList
        data={data}
        extraData={sortOption}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
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

      <Portal>
        <Dialog visible={filterVisible} onDismiss={() => setFilterVisible(false)}>
          <Dialog.Title>Nach Kategorie filtern</Dialog.Title>
          <Dialog.ScrollArea>
            <ScrollView contentContainerStyle={styles.chipWrap}>
              {ALL_CATEGORIES.map((cat) => (
                <Chip
                  key={cat}
                  mode={selectedCategories.includes(cat) ? 'flat' : 'outlined'}
                  selected={selectedCategories.includes(cat)}
                  showSelectedOverlay
                  onPress={() => toggleCategory(cat)}
                  style={styles.filterChip}
                >
                  {CATEGORY_LABELS[cat]}
                </Chip>
              ))}
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setSelectedCategories([])}>Zurücksetzen</Button>
            <Button onPress={() => setFilterVisible(false)}>Fertig</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
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
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingVertical: 8,
  },
  filterChip: {
    marginBottom: 4,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});
