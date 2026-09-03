import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '../../src/components/Header';
import { EmptyState } from '../../src/components/EmptyState';
import { PaginationFooter } from '../../src/components/PaginationFooter';
import { securityGateApi } from '../../src/api/securityGate';
import { GateMovementRecord } from '../../src/types';
import { colors } from '../../src/theme/colors';

const LIMIT = 20;

export default function GuardMovementsScreen() {
  const insets = useSafeAreaInsets();

  const [movements, setMovements] = useState<GateMovementRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filter, setFilter] = useState<'ALL' | 'OUT' | 'IN'>('ALL');

  const fetchMovements = useCallback(async (pg: number, f: 'ALL' | 'OUT' | 'IN', replace = false) => {
    if (pg === 1) setLoading(true);
    else setLoadingMore(true);
    try {
      const params: any = { page: pg, limit: LIMIT };
      if (f !== 'ALL') params.movementType = f;
      const res = await securityGateApi.getMovements(params);
      setTotal(res.total);
      setMovements(prev => replace ? res.movements : [...prev, ...res.movements]);
      setPage(pg);
    } catch (e) { console.error('Movements load failed', e); }
    finally { setLoading(false); setLoadingMore(false); }
  }, []);

  useEffect(() => { fetchMovements(1, filter, true); }, [filter]);

  const onRefresh = async () => { setRefreshing(true); await fetchMovements(1, filter, true); setRefreshing(false); };
  const loadMore = () => { if (!loadingMore && movements.length < total) fetchMovements(page + 1, filter); };
  const changeFilter = (f: 'ALL' | 'OUT' | 'IN') => { setFilter(f); setPage(1); };

  const renderMovement = ({ item }: { item: GateMovementRecord }) => {
    const isOut = item.movementType === 'OUT';
    const movColor = isOut ? colors.amberLight : colors.emeraldLight;
    const movBg = isOut ? colors.amberBg : colors.emeraldBg;
    const movBorder = isOut ? colors.amberBorder : colors.emeraldBorder;

    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <Text style={styles.movCode}>{item.movementCode}</Text>
          <View style={[styles.typePill, { backgroundColor: movBg, borderColor: movBorder }]}>
            <Ionicons name={isOut ? 'exit-outline' : 'enter-outline'} size={10} color={movColor} />
            <Text style={[styles.typeText, { color: movColor }]}>{item.movementType}</Text>
          </View>
        </View>
        <Text style={styles.assetName}>{item.asset.assetName}</Text>
        <Text style={styles.assetCode}>{item.asset.assetCode}</Text>
        <Text style={styles.dateText}>{new Date(item.movementDateTime).toLocaleString()}</Text>
        <View style={styles.metaRow}>
          {item.gate && (
            <>
              <Ionicons name="shield-outline" size={11} color={colors.textMuted} />
              <Text style={styles.metaText}>{item.gate.name}</Text>
              <Text style={styles.dot}>·</Text>
            </>
          )}
          {item.guardUser && (
            <>
              <Ionicons name="person-outline" size={11} color={colors.textMuted} />
              <Text style={styles.metaText}>{item.guardUser.username}</Text>
            </>
          )}
        </View>
        {item.destination && (
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={11} color={colors.textMuted} />
            <Text style={styles.metaText}>{item.destination} · {item.purpose}</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Header title="Movement Log" subtitle={`${total} records`} showProfile={false} />

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {(['ALL', 'OUT', 'IN'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterTab, filter === f && styles.filterTabActive]}
            onPress={() => changeFilter(f)}
          >
            <Text style={[styles.filterTabText, filter === f && styles.filterTabTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading && page === 1 ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.cyanLight} />
        </View>
      ) : (
        <FlatList
          data={movements}
          keyExtractor={(item) => item.id}
          renderItem={renderMovement}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.cyanLight} />}
          ListEmptyComponent={<EmptyState icon="time-outline" title="No Movements Found" subtitle="No gate movements match the current filter." />}
          ListFooterComponent={<PaginationFooter loading={loadingMore} hasMore={movements.length < total} />}
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
  filterRow: {
    flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, gap: 8,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  filterTab: {
    flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center',
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
  },
  filterTabActive: { backgroundColor: colors.cyanGlow, borderColor: colors.borderCyan },
  filterTabText: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
  filterTabTextActive: { color: colors.cyanLight },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: 16, paddingTop: 8 },
  card: {
    backgroundColor: colors.card, borderRadius: 10, padding: 14,
    borderWidth: 1, borderColor: colors.border, gap: 4,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  movCode: { fontSize: 10, color: colors.textMuted, fontFamily: 'monospace' },
  typePill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1,
  },
  typeText: { fontSize: 10, fontWeight: '800' },
  assetName: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  assetCode: { fontSize: 10, color: colors.cyanLight, fontFamily: 'monospace' },
  dateText: { fontSize: 11, color: colors.textSecondary },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontSize: 11, color: colors.textSecondary },
  dot: { color: colors.textMuted, fontSize: 11 },
});
