import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../../src/components/Header';
import { PaginationFooter } from '../../src/components/PaginationFooter';
import { EmptyState } from '../../src/components/EmptyState';
import { securityGateApi } from '../../src/api/securityGate';
import { GateMovementRecord } from '../../src/types';
import { colors } from '../../src/theme/colors';

export default function GuardMovementsScreen() {
  const router = useRouter();

  const [movements, setMovements] = useState<GateMovementRecord[]>([]);
  const [filterType, setFilterType] = useState<'ALL' | 'OUT' | 'IN'>('ALL');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  const fetchMovements = useCallback(async (p = 1, append = false, type = filterType) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      const movementTypeParam = type === 'ALL' ? undefined : type;
      const res = await securityGateApi.getMovements({
        page: p,
        limit: 15,
        movementType: movementTypeParam,
      });

      const newRows: GateMovementRecord[] = res.movements || [];
      const total = res.total || 0;
      setTotalCount(total);

      if (append) {
        setMovements((prev) => {
          // Deduplicate by stable ID
          const existingIds = new Set(prev.map((m) => m.id));
          const uniqueNew = newRows.filter((m) => !existingIds.has(m.id));
          return [...prev, ...uniqueNew];
        });
      } else {
        setMovements(newRows);
      }

      setHasMore(p * 15 < total);
    } catch (e) {
      console.error('Failed to fetch movements', e);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, [filterType]);

  useEffect(() => {
    setPage(1);
    fetchMovements(1, false, filterType);
  }, [filterType, fetchMovements]);

  const onRefresh = () => {
    setRefreshing(true);
    setPage(1);
    fetchMovements(1, false, filterType);
  };

  const loadMore = () => {
    if (!loading && !loadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchMovements(nextPage, true, filterType);
    }
  };

  const handleFilterChange = (type: 'ALL' | 'OUT' | 'IN') => {
    if (type !== filterType) {
      setFilterType(type);
    }
  };

  const renderItem = ({ item }: { item: GateMovementRecord }) => {
    const isOut = item.movementType === 'OUT';

    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View
            style={[
              styles.movementBadge,
              isOut ? styles.badgeOut : styles.badgeIn,
            ]}
          >
            <Ionicons
              name={isOut ? 'arrow-up-circle' : 'arrow-down-circle'}
              size={14}
              color={isOut ? colors.amber : colors.emerald}
            />
            <Text
              style={[
                styles.movementBadgeText,
                { color: isOut ? colors.amber : colors.emerald },
              ]}
            >
              {item.movementType === 'OUT' ? 'EXIT (OUT)' : 'ENTRY (IN)'}
            </Text>
          </View>

          <Text style={styles.movementCode}>{item.movementCode}</Text>
        </View>

        <Text style={styles.modelText}>
          {item.asset?.assetCode} — {item.asset?.model || item.asset?.assetName}
        </Text>

        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={13} color={colors.textMuted} />
          <Text style={styles.metaText}>
            {item.gate?.name || 'Gate Checkpoint'}
          </Text>
          <Text style={styles.metaDot}>•</Text>
          <Ionicons name="time-outline" size={13} color={colors.textMuted} />
          <Text style={styles.metaText}>
            {new Date(item.movementDateTime).toLocaleString([], {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>

        {item.destination && (
          <View style={styles.destBox}>
            <Text style={styles.destLabel}>Destination / Mission:</Text>
            <Text style={styles.destText}>
              {item.destination} {item.purpose ? `(${item.purpose})` : ''}
            </Text>
          </View>
        )}

        {item.remarks && (
          <Text style={styles.remarksText} numberOfLines={1}>
            Remarks: {item.remarks}
          </Text>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Header
        title="Gate Movement Ledger"
        subtitle={`${totalCount} physical transactions logged`}
        showBack={true}
        onBack={() => router.back()}
      />

      {/* Filter Chips Bar */}
      <View style={styles.filterBar}>
        <TouchableOpacity
          style={[styles.filterChip, filterType === 'ALL' && styles.filterChipActive]}
          onPress={() => handleFilterChange('ALL')}
        >
          <Text style={[styles.filterChipText, filterType === 'ALL' && styles.filterChipTextActive]}>
            All ({totalCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterChip,
            filterType === 'OUT' && styles.filterChipActiveOut,
          ]}
          onPress={() => handleFilterChange('OUT')}
        >
          <Ionicons
            name="arrow-up-circle"
            size={13}
            color={filterType === 'OUT' ? colors.amber : colors.textMuted}
          />
          <Text
            style={[
              styles.filterChipText,
              filterType === 'OUT' && { color: colors.amber, fontWeight: '800' },
            ]}
          >
            Exits (OUT)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterChip,
            filterType === 'IN' && styles.filterChipActiveIn,
          ]}
          onPress={() => handleFilterChange('IN')}
        >
          <Ionicons
            name="arrow-down-circle"
            size={13}
            color={filterType === 'IN' ? colors.emerald : colors.textMuted}
          />
          <Text
            style={[
              styles.filterChipText,
              filterType === 'IN' && { color: colors.emerald, fontWeight: '800' },
            ]}
          >
            Returns (IN)
          </Text>
        </TouchableOpacity>
      </View>

      {loading && page === 1 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.cyan} />
          <Text style={styles.loadingText}>Loading movement history...</Text>
        </View>
      ) : (
        <FlatList
          data={movements}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.cyan} />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.35}
          ListFooterComponent={
            <PaginationFooter loading={loadingMore} hasMore={hasMore} itemCount={movements.length} />
          }
          ListEmptyComponent={
            <EmptyState
              icon="time-outline"
              title="No Movement Logs"
              message={`No gate records found for filter: ${filterType}.`}
              actionLabel="View All Logs"
              onAction={() => setFilterType('ALL')}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.cardElevated,
    borderColor: colors.cyan,
  },
  filterChipActiveOut: {
    backgroundColor: colors.amberBg,
    borderColor: colors.amberBorder,
  },
  filterChipActiveIn: {
    backgroundColor: colors.emeraldBg,
    borderColor: colors.emeraldBorder,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: colors.cyan,
    fontWeight: '800',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  movementBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeOut: {
    backgroundColor: colors.amberBg,
    borderColor: colors.amberBorder,
  },
  badgeIn: {
    backgroundColor: colors.emeraldBg,
    borderColor: colors.emeraldBorder,
  },
  movementBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  movementCode: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '700',
  },
  modelText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  metaDot: {
    color: colors.textMuted,
    marginHorizontal: 2,
  },
  destBox: {
    backgroundColor: colors.surface,
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  destLabel: {
    fontSize: 9,
    color: colors.textMuted,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  destText: {
    fontSize: 11,
    color: colors.cyanLight,
    marginTop: 2,
    fontWeight: '500',
  },
  remarksText: {
    fontSize: 10,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});
