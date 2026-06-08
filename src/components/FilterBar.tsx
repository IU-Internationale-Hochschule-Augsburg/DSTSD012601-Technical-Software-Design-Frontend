import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Searchbar, Chip, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { SortField, SortDirection } from '../types';

interface Props {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onFilterPress: () => void;
  sortField: SortField;
  sortDirection: SortDirection;
  onSortToggle: () => void;
}

export const FilterBar = ({ 
  searchQuery, 
  onSearchChange, 
  onFilterPress,
  sortField,
  sortDirection,
  onSortToggle 
}: Props) => {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder="Suchen..."
        onChangeText={onSearchChange}
        value={searchQuery}
        style={styles.searchbar}
        elevation={1}
      />
      <View style={styles.chipsContainer}>
        <Chip 
          icon={() => <MaterialCommunityIcons name="filter-variant" size={18} color={theme.colors.onSurfaceVariant} />} 
          onPress={onFilterPress}
          mode="flat"
          style={styles.chip}
        >
          Kategorien
        </Chip>
        <Chip 
          icon={() => (
            <MaterialCommunityIcons 
              name={sortDirection === 'asc' ? 'sort-ascending' : 'sort-descending'} 
              size={18} 
              color={theme.colors.onSurfaceVariant} 
            />
          )} 
          onPress={onSortToggle}
          mode="flat"
          style={styles.chip}
        >
          {sortField === 'name' ? 'Name' : sortField === 'amount' ? 'Preis' : 'Abrechnung'}
        </Chip>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 8,
  },
  searchbar: {
    marginBottom: 12,
  },
  chipsContainer: {
    flexDirection: 'row',
  },
  chip: {
    marginRight: 8,
  }
});
