import React, { useState, useEffect } from 'react';
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
import { securityGateApi } from '../../src/api/securityGate';
import { MetricCard } from '../../src/components/MetricCard';
import { GateKPIs, CurrentOutsideItem, GateMovementRecord } from '../../src/types';
import { colors } from '../../src/theme/colors';

export default function AdminGateScreen() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'outside' | 'history'>('outside');
  const [kpis, setKpis] = useState<GateKPIs>({
    assetsOutside: 0,
    assetsInside: 0,
    todayOut: 0,
    todayIn: 0,
    overdueReturns: 0,
    totalMovements: 0,
  });
  const [outsideItems, setOutsideItems] = useState<CurrentOutsideItem[]>([]);
  const [movements, setMovements] = useState<GateMovementRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [kpisData, outsideData, historyData] = await Promise.all([
        securityGateApi.getKPIs().catch(() => null),
        securityGateApi.getCurrentOutside().catch(() => null),
        securityGateApi.getMovements({ limit: 20 }).catch(() => null),
      ]);

      if (kpisData) setKpis(kpisData);
      if (outsideData) setOutsideItems(outsideData.rows || []);
      if (historyData) setMovements(historyData.movements || []);
    } catch (e) {
      console.error('Failed to load gate data', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const renderOutsideRow = ({ item }: { item: CurrentOutsideItem }) => (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.codeBadge}>
          <Text style={styles.codeText}>{item.assetCode}</Text>
        </View>
        <View style={styles.durationBadge}>
          <Ionicons name="time-outline" size={12} color={colors.amber} />
          <Text style={styles.durationText}>{item.durationHours}h OUT</Text>
        </View>
      </View>

      <Text style={styles.modelText}>{item.model} ({item.assetType})</Text>
      <Text style={styles.holderText}>Holder: {item.holderName} • {item.department}</Text>

      <View style={styles.destinationBox}>
        <Text style={styles.destLabel}>Destination & Purpose:</Text>
        <Text style={styles.destValue}>{item.destination} — {item.purpose}</Text>
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.footerInfo}>Gate: {item.gateName}</Text>
        {item.expectedReturn && (
          <Text style={[styles.footerInfo, item.isOverdue && styles.overdueText]}>
            Due: {new Date(item.expectedReturn).toLocaleDateString()}
          </Text>
        )}
      </View>
    </View>
  );

  const renderMovementRow = ({ item }: { item: GateMovementRecord }) => {
    const isOut = item.movementType === 'OUT';
    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={[styles.movementBadge, isOut ? styles.badgeOut : styles.badgeIn]}>
            <Ionicons
              name={isOut ? 'arrow-up-circle-outline' : 'arrow-down-circle-outline'}
              size={12}
              color={isOut ? colors.amber : colors.emerald}
            />
            <Text style={[styles.movementBadgeText, { color: isOut ? colors.amber : colors.emerald }]}>
              {item.movementType}
            </Text>
          </View>
          <Text style={styles.movementCode}>{item.movementCode}</Text>
        </View>

        <Text style={styles.modelText}>{item.asset?.assetCode} — {item.asset?.model}</Text>
        <Text style={styles.holderText}>
          {new Date(item.movementDateTime).toLocaleString()} • {item.gate?.name || 'Gate'}
        </Text>

        {item.destination && (
          <Text style={styles.destValue} numberOfLines={1}>
            {item.destination} ({item.purpose || 'Site visit'})
          </Text>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTitleGroup}>
          <Text style={styles.headerTitle}>Security Gate Console</Text>
          <Text style={styles.headerSubtitle}>Premises Physical Asset Movement</Text>
        </View>
      </View>

      {/* KPI Cards */}
      <View style={styles.kpiContainer}>
        <View style={styles.kpiRow}>
          <MetricCard
            label="OUTSIDE NOW"
            value={kpis.assetsOutside}
            subtitle="Off-premises"
            icon="arrow-up-circle-outline"
            color={colors.amber}
            bg="rgba(245, 158, 11, 0.08)"
            borderColor={colors.amberBorder}
          />
          <MetricCard
            label="INSIDE PREMISES"
            value={kpis.assetsInside}
            subtitle="Verified on-site"
            icon="shield-checkmark-outline"
            color={colors.emerald}
            bg="rgba(16, 185, 129, 0.08)"
            borderColor={colors.emeraldBorder}
          />
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'outside' && styles.tabButtonActive]}
          onPress={() => setActiveTab('outside')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'outside' && styles.tabButtonTextActive]}>
            Current Outside ({outsideItems.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'history' && styles.tabButtonActive]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'history' && styles.tabButtonTextActive]}>
            Recent Movements
          </Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.cyan} />
        </View>
      ) : activeTab === 'outside' ? (
        <FlatList
          data={outsideItems}
          keyExtractor={(item) => item.assetId}
          renderItem={renderOutsideRow}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.cyan} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="checkmark-circle-outline" size={48} color={colors.emerald} />
              <Text style={styles.emptyText}>All assets are currently inside premises!</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={movements}
          keyExtractor={(item) => item.id}
          renderItem={renderMovementRow}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.cyan} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="file-tray-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyText}>No recent movements recorded.</Text>
            </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 14,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleGroup: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  kpiContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 10,
  },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  tabButtonActive: {
    backgroundColor: colors.surface,
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabButtonTextActive: {
    color: colors.cyan,
  },
  listContent: {
    padding: 16,
    gap: 10,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  codeBadge: {
    backgroundColor: colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  codeText: {
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: '700',
    color: colors.cyan,
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.amberBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.amberBorder,
  },
  durationText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.amber,
    fontFamily: 'monospace',
  },
  movementBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
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
  },
  movementCode: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: colors.textMuted,
  },
  modelText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  holderText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  destinationBox: {
    backgroundColor: colors.surface,
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginTop: 4,
  },
  destLabel: {
    fontSize: 9,
    color: colors.textMuted,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  destValue: {
    fontSize: 11,
    color: colors.textPrimary,
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  footerInfo: {
    fontSize: 10,
    color: colors.textMuted,
  },
  overdueText: {
    color: colors.rose,
    fontWeight: '700',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 8,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 13,
  },
});
