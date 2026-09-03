import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, Modal, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '../../src/components/Header';
import { MetricCard } from '../../src/components/MetricCard';
import { QrScannerModal } from '../../src/components/QrScannerModal';
import { AssetDetailView } from '../../src/components/AssetDetailView';
import { EmptyState } from '../../src/components/EmptyState';
import { securityGateApi } from '../../src/api/securityGate';
import { CurrentOutsideItem, GateKPIs, ScannedAssetData } from '../../src/types';
import { colors } from '../../src/theme/colors';

export default function AdminGateScreen() {
  const insets = useSafeAreaInsets();

  const [kpis, setKpis] = useState<GateKPIs>({ assetsOutside: 0, assetsInside: 0, todayOut: 0, todayIn: 0, overdueReturns: 0, totalMovements: 0 });
  const [outsideItems, setOutsideItems] = useState<CurrentOutsideItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [scannedAsset, setScannedAsset] = useState<ScannedAssetData | null>(null);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [gateKpis, outside] = await Promise.all([
        securityGateApi.getKPIs().catch(() => null),
        securityGateApi.getCurrentOutside({ limit: 50 }).catch(() => null),
      ]);
      if (gateKpis) setKpis(gateKpis);
      if (outside) setOutsideItems(outside.rows);
    } catch (e) { console.error('Gate data load failed', e); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  const handleScan = async (token: string) => {
    setScannerVisible(false);
    setScanLoading(true);
    setScanError(null);
    try {
      const data = await securityGateApi.scanToken(token);
      setScannedAsset(data);
    } catch (err: any) {
      setScanError(err?.response?.data?.message || 'QR resolution failed.');
    } finally {
      setScanLoading(false);
    }
  };

  const renderOutside = ({ item }: { item: CurrentOutsideItem }) => (
    <View style={[styles.outsideCard, item.isOverdue && styles.overdueCard]}>
      <View style={styles.outsideCardTop}>
        <Text style={styles.movCode}>{item.movementCode}</Text>
        {item.isOverdue && (
          <View style={styles.overduePill}>
            <Text style={styles.overdueText}>OVERDUE</Text>
          </View>
        )}
      </View>
      <Text style={styles.assetName}>{item.assetName}</Text>
      <Text style={styles.assetCode}>{item.assetCode}</Text>
      <View style={styles.metaRow}>
        <Ionicons name="person-outline" size={12} color={colors.textMuted} />
        <Text style={styles.metaText}>{item.holderName}</Text>
        <Text style={styles.metaDot}>·</Text>
        <Text style={styles.metaText}>{item.gateName}</Text>
      </View>
      {item.destination && (
        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={12} color={colors.textMuted} />
          <Text style={styles.metaText}>{item.destination} · {item.purpose}</Text>
        </View>
      )}
      <Text style={styles.durationText}>
        {item.durationHours < 1
          ? 'Less than 1 hour outside'
          : `${Math.floor(item.durationHours)}h ${Math.round((item.durationHours % 1) * 60)}m outside`}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Header subtitle="Security Gate View" showProfile={false} />

      <FlatList
        data={outsideItems}
        keyExtractor={(item) => item.movementId || item.assetId}
        renderItem={renderOutside}
        ListHeaderComponent={() => (
          <>
            {/* KPI Row */}
            <View style={styles.kpiRow}>
              <MetricCard label="OUTSIDE" value={kpis.assetsOutside} icon="arrow-up-circle-outline" color={colors.amberLight} bg={colors.amberBg} border={colors.amberBorder} />
              <MetricCard label="TODAY OUT" value={kpis.todayOut} icon="exit-outline" color={colors.cyanLight} bg={colors.cyanGlow} border={colors.borderCyan} />
              <MetricCard label="TODAY IN" value={kpis.todayIn} icon="enter-outline" color={colors.emeraldLight} bg={colors.emeraldBg} border={colors.emeraldBorder} />
              <MetricCard label="OVERDUE" value={kpis.overdueReturns} icon="warning-outline" color={colors.roseLight} bg={colors.roseBg} border={colors.roseBorder} />
            </View>

            {/* QR Scan Banner */}
            <TouchableOpacity style={styles.scanBanner} onPress={() => setScannerVisible(true)} activeOpacity={0.8}>
              <Ionicons name="qr-code-outline" size={22} color={colors.cyanLight} />
              <Text style={styles.scanBannerText}>Scan Asset QR for full details</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.cyanLight} />
            </TouchableOpacity>

            <Text style={styles.listHeading}>CURRENTLY OUTSIDE ({outsideItems.length})</Text>
          </>
        )}
        ListEmptyComponent={<EmptyState icon="checkmark-circle-outline" title="All Assets Inside" subtitle="No assets are currently outside the facility." />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.cyanLight} />}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        showsVerticalScrollIndicator={false}
      />

      <QrScannerModal visible={scannerVisible} onClose={() => setScannerVisible(false)} onScan={handleScan} title="Gate Scanner" />

      {scanLoading && (
        <Modal transparent visible>
          <View style={styles.overlay}>
            <ActivityIndicator size="large" color={colors.cyanLight} />
            <Text style={styles.loadingText}>Resolving QR tag...</Text>
          </View>
        </Modal>
      )}

      {!!scanError && (
        <Modal transparent visible onRequestClose={() => setScanError(null)}>
          <View style={styles.overlay}>
            <View style={styles.alertCard}>
              <Ionicons name="alert-circle" size={36} color={colors.roseLight} />
              <Text style={styles.alertTitle}>Scan Failed</Text>
              <Text style={styles.alertMsg}>{scanError}</Text>
              <TouchableOpacity style={styles.alertDismiss} onPress={() => setScanError(null)}>
                <Text style={styles.alertDismissText}>Dismiss</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {!!scannedAsset && (
        <Modal visible animationType="slide" onRequestClose={() => setScannedAsset(null)}>
          <AssetDetailView asset={scannedAsset} roleCode="ADMIN" onClose={() => setScannedAsset(null)} />
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  listContent: { paddingHorizontal: 16, paddingTop: 12, gap: 0 },
  kpiRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  scanBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14,
    backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.borderCyan,
    marginBottom: 14,
  },
  scanBannerText: { flex: 1, fontSize: 13, color: colors.textPrimary, fontWeight: '600' },
  listHeading: { fontSize: 10, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.8, marginBottom: 8 },
  outsideCard: {
    backgroundColor: colors.card, borderRadius: 10, padding: 14,
    borderWidth: 1, borderColor: colors.border, gap: 4,
  },
  overdueCard: { borderColor: colors.roseBorder, backgroundColor: colors.roseBg + '22' },
  outsideCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  movCode: { fontSize: 10, color: colors.textMuted, fontFamily: 'monospace' },
  overduePill: {
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 4,
    backgroundColor: colors.roseBg, borderWidth: 1, borderColor: colors.roseBorder,
  },
  overdueText: { fontSize: 9, fontWeight: '800', color: colors.roseLight },
  assetName: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  assetCode: { fontSize: 10, color: colors.cyanLight, fontFamily: 'monospace' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  metaText: { fontSize: 11, color: colors.textSecondary },
  metaDot: { fontSize: 11, color: colors.textMuted },
  durationText: { fontSize: 11, color: colors.amberLight, fontWeight: '600', marginTop: 4 },
  overlay: { flex: 1, backgroundColor: 'rgba(3,3,9,0.85)', alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: colors.cyanLight, fontSize: 13, fontWeight: '700' },
  alertCard: {
    backgroundColor: colors.card, borderRadius: 16, padding: 24, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', gap: 12, width: '85%',
  },
  alertTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  alertMsg: { fontSize: 12, color: colors.textSecondary, textAlign: 'center' },
  alertDismiss: { paddingVertical: 10, paddingHorizontal: 24, borderRadius: 8, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  alertDismissText: { color: colors.textPrimary, fontSize: 13, fontWeight: '600' },
});
