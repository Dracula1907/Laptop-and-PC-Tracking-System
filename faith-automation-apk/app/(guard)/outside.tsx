import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '../../src/components/Header';
import { EmptyState } from '../../src/components/EmptyState';
import { PaginationFooter } from '../../src/components/PaginationFooter';
import { securityGateApi } from '../../src/api/securityGate';
import { CurrentOutsideItem } from '../../src/types';
import { colors } from '../../src/theme/colors';

const LIMIT = 20;

export default function GuardOutsideScreen() {
  const insets = useSafeAreaInsets();

  const [items, setItems] = useState<CurrentOutsideItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const fetchItems = useCallback(async (pg: number, q: string, replace = false) => {
    if (pg === 1) setLoading(true);
    else setLoadingMore(true);
    try {
      const res = await securityGateApi.getCurrentOutside({ page: pg, limit: LIMIT, search: q || undefined });
      setTotal(res.total);
      setItems(prev => replace ? res.rows : [...prev, ...res.rows]);
      setPage(pg);
    } catch (e) { console.error('Outside load failed', e); }
    finally { setLoading(false); setLoadingMore(false); }
  }, []);

  useEffect(() => { fetchItems(1, search, true); }, [search]);

  const onRefresh = async () => { setRefreshing(true); await fetchItems(1, search, true); setRefreshing(false); };
  const loadMore = () => {
    if (!loadingMore && items.length < total) fetchItems(page + 1, search);
  };

  const renderItem = ({ item }: { item: CurrentOutsideItem }) => (
    <View style={[styles.card, item.isOverdue && styles.overdueCard]}>
      <View style={styles.cardTop}>
        <Text style={styles.movCode}>{item.movementCode}</Text>
        <View style={styles.badges}>
          {item.isOverdue && (
            <View style={styles.overduePill}>
              <Text style={styles.overdueText}>OVERDUE</Text>
            </View>
          )}
          <Text style={styles.durationText}>
            {item.durationHours < 1 ? '<1h' : `${Math.floor(item.durationHours)}h ${Math.round((item.durationHours % 1) * 60)}m`}
          </Text>
        </View>
      </View>
      <Text style={styles.assetName}>{item.assetName}</Text>
      <Text style={styles.assetCode}>{item.assetCode}</Text>
      <View style={styles.metaRow}>
        <Ionicons name="person-outline" size={11} color={colors.textMuted} />
        <Text style={styles.metaText}>{item.holderName} · {item.department}</Text>
      </View>
      <View style={styles.metaRow}>
        <Ionicons name="shield-outline" size={11} color={colors.textMuted} />
        <Text style={styles.metaText}>{item.gateName} · {item.guardName}</Text>
      </View>
      {item.destination && (
        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={11} color={colors.textMuted} />
          <Text style={styles.metaText}>{item.destination} · {item.purpose}</Text>
        </View>
      )}
      {item.expectedReturn && (
        <View style={styles.metaRow}>
          <Ionicons name="time-outline" size={11} color={colors.textMuted} />
          <Text style={styles.metaText}>Expected: {new Date(item.expectedReturn).toLocaleDateString()}</Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <Header title="Currently Outside" subtitle={`${total} items total`} showProfile={false} />

      <View style={styles.searchBar}>
        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={16} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search assets, holders..."
            placeholderTextColor={colors.textMuted}
            value={searchInput}
            onChangeText={setSearchInput}
            onSubmitEditing={() => setSearch(searchInput.trim())}
            returnKeyType="search"
          />
          {searchInput.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchInput(''); setSearch(''); }}>
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading && page === 1 ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.cyanLight} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.movementId || item.assetId}
          renderItem={renderItem}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.cyanLight} />}
          ListEmptyComponent={<EmptyState icon="checkmark-circle-outline" title="All Assets Inside" subtitle="No assets are currently outside the facility." />}
          ListFooterComponent={<PaginationFooter loading={loadingMore} hasMore={items.length < total} />}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  searchBar: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.card, borderRadius: 10, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 12, height: 42,
  },
  searchInput: { flex: 1, color: colors.textPrimary, fontSize: 14 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: 16, paddingTop: 8 },
  card: {
    backgroundColor: colors.card, borderRadius: 10, padding: 14,
    borderWidth: 1, borderColor: colors.border, gap: 4,
  },
  overdueCard: { borderColor: colors.roseBorder },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  movCode: { fontSize: 10, color: colors.textMuted, fontFamily: 'monospace' },
  badges: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  overduePill: {
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 4,
    backgroundColor: colors.roseBg, borderWidth: 1, borderColor: colors.roseBorder,
  },
  overdueText: { fontSize: 9, fontWeight: '800', color: colors.roseLight },
  durationText: { fontSize: 11, color: colors.amberLight, fontWeight: '700' },
  assetName: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  assetCode: { fontSize: 10, color: colors.cyanLight, fontFamily: 'monospace', marginBottom: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontSize: 11, color: colors.textSecondary },
});
