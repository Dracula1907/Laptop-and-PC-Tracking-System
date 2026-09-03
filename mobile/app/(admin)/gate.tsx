import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '../../src/components/Header';
import { MetricCard } from '../../src/components/MetricCard';
import { PaginationFooter } from '../../src/components/PaginationFooter';
import { EmptyState } from '../../src/components/EmptyState';
import { AssetDetailView } from '../../src/components/AssetDetailView';
import { securityGateApi } from '../../src/api/securityGate';
import { GateKPIs, CurrentOutsideItem, GateMovementRecord } from '../../src/types';
import { colors } from '../../src/theme/colors';

export default function AdminGateScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<'outside' | 'history'>('outside');
  const [kpis, setKpis] = useState<GateKPIs | null>(null);
  const [outsideItems, setOutsideItems] = useState<CurrentOutsideItem[]>([]);
  const [movements, setMovements] = useState<GateMovementRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Pagination for movements
  const [page, setPage] = useState(1);
  const [hasMoreMovements, setHasMoreMovements] = useState(true);

  // Inspected asset modal
  const [inspectedAsset, setInspectedAsset] = useState<any | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [kpisData, outsideData, historyData] = await Promise.all([
        securityGateApi.getKPIs().catch(() => null),
        securityGateApi.getCurrentOutside().catch(() => null),
        securityGateApi.getMovements({ page: 1, limit: 15 }).catch(() => null),
      ]);

      if (kpisData) setKpis(kpisData);
      if (outsideData) setOutsideItems(outsideData.rows || []);
      if (historyData) {
        setMovements(historyData.movements || []);
        const total = historyData.total || 0;
        setHasMoreMovements(15 < total);
      }
    } catch (e) {
      console.error('Failed to load gate data', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    setPage(1);
    loadData();
  };

  const loadMoreMovements = async () => {
    if (activeTab !== 'history' || loading || loadingMore || !hasMoreMovements) return;

    try {
      setLoadingMore(true);
      const nextPage = page + 1;
      const res = await securityGateApi.getMovements({ page: nextPage, limit: 15 });
      const newRows = res.movements || [];
      const total = res.total || 0;

      setMovements((prev) => {
        const existingIds = new Set(prev.map((m) => m.id));
        const uniqueNew = newRows.filter((m: any) => !existingIds.has(m.id));
        return [...prev, ...uniqueNew];
      });

      setPage(nextPage);
      setHasMoreMovements(nextPage * 15 < total);
    } catch (e) {
      console.error('Failed to load more movements', e);
    } finally {
      setLoadingMore(false);
    }
  };

  const inspectOutsideItem = (item: CurrentOutsideItem) => {
    setInspectedAsset({
      qrId: '',
      token: '',
      qrStatus: 'ACTIVE',
      assetId: item.assetId,
      assetCode: item.assetCode,
      assetName: item.model,
      assetType: item.assetType,
      model: item.model,
      currentHolder: item.holderName,
      department: item.department,
      location: item.location || 'HQ',
      gatePresence: 'OUTSIDE',
      openOutMovement: {
        id: item.movementId || '',
        movementCode: 'PASS',
        assetId: item.assetId,
        movementType: 'OUT',
        movementDateTime: item.outDateTime,
        destination: item.destination,
        purpose: item.purpose,
        expectedReturn: item.expectedReturn,
        gateName: item.gateName,
      },
    });
  };

  const renderOutsideRow = ({ item }: { item: CurrentOutsideItem }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => inspectOutsideItem(item)}
      activeOpacity={0.7}
    >
      <View style={styles.cardTop}>
        <View style={styles.codeBadge}>
          <Text style={styles.codeText}>{item.assetCode}</Text>
        </View>
        <View style={[styles.durationBadge, item.isOverdue && styles.overdueBadge]}>
          <Ionicons
            name="time-outline"
            size={12}
            color={item.isOverdue ? colors.rose : colors.amber}
          />
          <Text style={[styles.durationText, item.isOverdue && styles.overdueText]}>
            {item.durationHours}h OUT {item.isOverdue ? '(OVERDUE)' : ''}
          </Text>
        </View>
      </View>

      <Text style={styles.modelText}>{item.model} ({item.assetType})</Text>
      <Text style={styles.holderText}>
        Holder: <Text style={styles.whiteText}>{item.holderName}</Text> • {item.department}
      </Text>

      <View style={styles.destinationBox}>
        <Text style={styles.destLabel}>Destination & Purpose:</Text>
        <Text style={styles.destValue}>{item.destination} — {item.purpose}</Text>
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.footerInfo}>Gate: {item.gateName}</Text>
        <View style={styles.tapToInspect}>
          <Text style={styles.inspectText}>Inspect Profile</Text>
          <Ionicons name="chevron-forward" size={12} color={colors.cyan} />
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderHistoryRow = ({ item }: { item: GateMovementRecord }) => {
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
              size={13}
              color={isOut ? colors.amber : colors.emerald}
            />
            <Text
              style={[
                styles.movementBadgeText,
                { color: isOut ? colors.amber : colors.emerald },
              ]}
            >
              {item.movementType}
            </Text>
          </View>
          <Text style={styles.movementCode}>{item.movementCode}</Text>
        </View>

        <Text style={styles.modelText}>
          {item.asset?.assetCode} — {item.asset?.model || item.asset?.assetName}
        </Text>

        <View style={styles.historyMeta}>
          <Text style={styles.metaText}>
            Gate: {item.gate?.name || 'Main Gate'} • {new Date(item.movementDateTime).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>

        {item.destination && (
          <Text style={styles.destSnippet} numberOfLines={1}>
            Destination: {item.destination} {item.purpose ? `(${item.purpose})` : ''}
          </Text>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Header
        title="Security Gate Station"
        subtitle="Physical perimeter monitoring"
        showBack={true}
        onBack={() => router.back()}
      />

      {/* KPI Metrics */}
      <View style={styles.metricsContainer}>
        <MetricCard
          label="CURRENT OUTSIDE"
          value={kpis?.assetsOutside ?? '—'}
          subvalue={kpis?.overdueReturns ? `${kpis.overdueReturns} overdue` : undefined}
          color={colors.amber}
          icon="arrow-up-circle-outline"
        />
        <MetricCard
          label="TODAY'S EXITS"
          value={kpis?.todayOut ?? '—'}
          color={colors.cyan}
          icon="exit-outline"
        />
        <MetricCard
          label="TODAY'S RETURNS"
          value={kpis?.todayIn ?? '—'}
          color={colors.emerald}
          icon="enter-outline"
        />
      </View>

      {/* Tab Switcher */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'outside' && styles.tabButtonActive]}
          onPress={() => setActiveTab('outside')}
        >
          <Ionicons
            name="arrow-up-circle"
            size={14}
            color={activeTab === 'outside' ? colors.amber : colors.textMuted}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'outside' && { color: colors.amber, fontWeight: '800' },
            ]}
          >
            Currently Outside ({outsideItems.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'history' && styles.tabButtonActive]}
          onPress={() => setActiveTab('history')}
        >
          <Ionicons
            name="time-outline"
            size={14}
            color={activeTab === 'history' ? colors.cyan : colors.textMuted}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'history' && { color: colors.cyan, fontWeight: '800' },
            ]}
          >
            Movement Ledger
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.cyan} />
          <Text style={styles.loadingText}>Fetching gate movements...</Text>
        </View>
      ) : activeTab === 'outside' ? (
        <FlatList
          data={outsideItems}
          keyExtractor={(item) => item.assetId}
          renderItem={renderOutsideRow}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.amber} />
          }
          ListEmptyComponent={
            <EmptyState
              icon="shield-checkmark-outline"
              title="No Assets Outside"
              message="All inventory laptops and PCs are safely accounted for inside company premises."
              accentColor={colors.emerald}
            />
          }
        />
      ) : (
        <FlatList
          data={movements}
          keyExtractor={(item) => item.id}
          renderItem={renderHistoryRow}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.cyan} />
          }
          onEndReached={loadMoreMovements}
          onEndReachedThreshold={0.35}
          ListFooterComponent={
            <PaginationFooter
              loading={loadingMore}
              hasMore={hasMoreMovements}
              itemCount={movements.length}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="time-outline"
              title="No Movement Logs"
              message="No security gate passage transactions recorded yet."
            />
          }
        />
      )}

      {/* Asset Inspection Modal */}
      {inspectedAsset && (
        <Modal
          visible={!!inspectedAsset}
          animationType="slide"
          onRequestClose={() => setInspectedAsset(null)}
        >
          <View style={styles.fullModalContainer}>
            <View style={[styles.modalHeader, { paddingTop: Math.max(insets.top + 8, 20) }]}>
              <View>
                <Text style={styles.modalHeaderTitle}>{inspectedAsset.assetCode}</Text>
                <Text style={styles.modalHeaderSubtitle}>
                  {inspectedAsset.model} ({inspectedAsset.assetType})
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setInspectedAsset(null)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={20} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <AssetDetailView asset={inspectedAsset} role="ADMIN" />
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  metricsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 8,
  },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: colors.surface,
  },
  tabText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
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
  codeBadge: {
    backgroundColor: colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  codeText: {
    fontFamily: 'monospace',
    fontSize: 12,
    fontWeight: '800',
    color: colors.cyan,
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.amberBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.amberBorder,
  },
  overdueBadge: {
    backgroundColor: colors.roseBg,
    borderColor: colors.roseBorder,
  },
  durationText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.amber,
    fontFamily: 'monospace',
  },
  overdueText: {
    color: colors.roseLight,
    fontWeight: '800',
  },
  modelText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  holderText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  whiteText: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  destinationBox: {
    backgroundColor: colors.surface,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  destLabel: {
    fontSize: 9,
    color: colors.textMuted,
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  destValue: {
    fontSize: 12,
    color: colors.textPrimary,
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerInfo: {
    fontSize: 10,
    color: colors.textMuted,
  },
  tapToInspect: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  inspectText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.cyan,
  },
  movementBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
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
  },
  historyMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  destSnippet: {
    fontSize: 11,
    color: colors.cyanLight,
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
  fullModalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
    fontFamily: 'monospace',
  },
  modalHeaderSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
