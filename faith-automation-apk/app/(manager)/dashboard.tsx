import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Modal, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '../../src/components/Header';
import { MetricCard } from '../../src/components/MetricCard';
import { QrScannerModal } from '../../src/components/QrScannerModal';
import { AssetDetailView } from '../../src/components/AssetDetailView';
import { securityGateApi } from '../../src/api/securityGate';
import { assetsApi } from '../../src/api/assets';
import { GateKPIs, ScannedAssetData } from '../../src/types';
import { colors } from '../../src/theme/colors';

export default function ManagerDashboard() {
  const insets = useSafeAreaInsets();

  const [kpis, setKpis] = useState<GateKPIs>({ assetsOutside: 0, assetsInside: 0, todayOut: 0, todayIn: 0, overdueReturns: 0, totalMovements: 0 });
  const [assetCounts, setAssetCounts] = useState({ total: 0, active: 0, repair: 0 });
  const [refreshing, setRefreshing] = useState(false);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [scannedAsset, setScannedAsset] = useState<ScannedAssetData | null>(null);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [gateKpis, counts] = await Promise.all([
        securityGateApi.getKPIs().catch(() => null),
        assetsApi.getCounts().catch(() => null),
      ]);
      if (gateKpis) setKpis(gateKpis);
      if (counts) setAssetCounts({
        total: counts.total || 0,
        active: counts.active || counts.inUse || 0,
        repair: counts.repair || 0,
      });
    } catch (e) { console.error('Manager dashboard load failed', e); }
  };

  useEffect(() => { loadData(); }, []);
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

  return (
    <View style={styles.container}>
      <Header subtitle="Department Manager Console" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.cyanLight} />}
        showsVerticalScrollIndicator={false}
      >
        {/* QR Banner */}
        <TouchableOpacity style={styles.scanBanner} onPress={() => setScannerVisible(true)} activeOpacity={0.8}>
          <View style={styles.scanIconBox}>
            <Ionicons name="qr-code-outline" size={24} color={colors.textDark} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.scanTitle}>SCAN ASSET QR TAG</Text>
            <Text style={styles.scanSubtitle}>View asset details, holder, warranty status</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.cyanLight} />
        </TouchableOpacity>

        {/* Gate Monitoring */}
        <Text style={styles.heading}>GATE MONITORING</Text>
        <View style={styles.metricsRow}>
          <MetricCard label="OUTSIDE" value={kpis.assetsOutside} icon="arrow-up-circle-outline" color={colors.amberLight} bg={colors.amberBg} border={colors.amberBorder} />
          <MetricCard label="TODAY OUT" value={kpis.todayOut} icon="exit-outline" color={colors.cyanLight} bg={colors.cyanGlow} border={colors.borderCyan} />
          <MetricCard label="TODAY IN" value={kpis.todayIn} icon="enter-outline" color={colors.emeraldLight} bg={colors.emeraldBg} border={colors.emeraldBorder} />
        </View>
        {kpis.overdueReturns > 0 && (
          <View style={styles.overdueAlert}>
            <Ionicons name="warning" size={14} color={colors.roseLight} />
            <Text style={styles.overdueText}>{kpis.overdueReturns} asset(s) overdue for return</Text>
          </View>
        )}

        {/* Inventory */}
        <Text style={styles.heading}>INVENTORY OVERVIEW</Text>
        <View style={styles.metricsRow}>
          <MetricCard label="TOTAL ASSETS" value={assetCounts.total} icon="laptop-outline" color={colors.cyanLight} bg={colors.cyanGlow} border={colors.borderCyan} />
          <MetricCard label="ACTIVE IN-USE" value={assetCounts.active} icon="checkmark-circle-outline" color={colors.emeraldLight} bg={colors.emeraldBg} border={colors.emeraldBorder} />
          <MetricCard label="UNDER REPAIR" value={assetCounts.repair} icon="construct-outline" color={colors.roseLight} bg={colors.roseBg} border={colors.roseBorder} />
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={16} color={colors.textMuted} />
          <Text style={styles.infoText}>
            As Department Manager, you have read access to all gate activity and asset inventory. Contact your IT Administrator to make changes.
          </Text>
        </View>
      </ScrollView>

      <QrScannerModal visible={scannerVisible} onClose={() => setScannerVisible(false)} onScan={handleScan} title="Manager Asset Scanner" />

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
          <AssetDetailView asset={scannedAsset} roleCode="MANAGER" onClose={() => setScannedAsset(null)} />
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: 16, paddingBottom: 32, gap: 14 },
  scanBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14,
    backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.borderCyan,
  },
  scanIconBox: {
    width: 46, height: 46, borderRadius: 10, backgroundColor: colors.cyanLight,
    alignItems: 'center', justifyContent: 'center',
  },
  scanTitle: { fontSize: 13, fontWeight: '800', color: colors.textPrimary, letterSpacing: 0.4 },
  scanSubtitle: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  heading: { fontSize: 10, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.8, marginTop: 4 },
  metricsRow: { flexDirection: 'row', gap: 10 },
  overdueAlert: {
    flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10,
    borderRadius: 8, backgroundColor: colors.roseBg, borderWidth: 1, borderColor: colors.roseBorder,
  },
  overdueText: { fontSize: 12, color: colors.roseLight, fontWeight: '600' },
  infoCard: {
    flexDirection: 'row', gap: 10, padding: 14,
    backgroundColor: colors.card, borderRadius: 10, borderWidth: 1, borderColor: colors.border,
    alignItems: 'flex-start',
  },
  infoText: { flex: 1, fontSize: 12, color: colors.textSecondary, lineHeight: 18 },
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
