import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Modal, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
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

export default function AdminDashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [kpis, setKpis] = useState<GateKPIs>({
    assetsOutside: 0, assetsInside: 0, todayOut: 0, todayIn: 0,
    overdueReturns: 0, totalMovements: 0,
  });
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
    } catch (e) { console.error('Dashboard load failed', e); }
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
      setScanError(err?.response?.data?.message || 'QR tag resolution failed.');
    } finally {
      setScanLoading(false);
    }
  };

  const modules = [
    { name: 'Asset Inventory', icon: 'laptop-outline', route: '/(admin)/assets', color: colors.cyanLight },
    { name: 'Security Gate', icon: 'shield-outline', route: '/(admin)/gate', color: colors.amberLight },
    { name: 'Assignments', icon: 'person-add-outline', route: '/(admin)/assets', color: colors.cyanLight },
    { name: 'Transfers', icon: 'swap-horizontal-outline', route: '/(admin)/assets', color: colors.cyan },
    { name: 'Returns', icon: 'return-down-back-outline', route: '/(admin)/assets', color: colors.emeraldLight },
    { name: 'Maintenance', icon: 'construct-outline', route: '/(admin)/assets', color: colors.roseLight },
    { name: 'Warranties', icon: 'ribbon-outline', route: '/(admin)/assets', color: colors.cyanDark },
    { name: 'Approvals', icon: 'checkmark-circle-outline', route: '/(admin)/assets', color: colors.amberLight },
  ];

  return (
    <View style={styles.container}>
      <Header subtitle="Enterprise Administration Console" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.cyanLight} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Scan Banner */}
        <TouchableOpacity style={styles.scanBanner} onPress={() => setScannerVisible(true)} activeOpacity={0.8}>
          <View style={styles.scanIconBox}>
            <Ionicons name="qr-code-outline" size={26} color={colors.textDark} />
          </View>
          <View style={styles.scanTextGroup}>
            <Text style={styles.scanTitle}>SCAN ASSET QR TAG</Text>
            <Text style={styles.scanSubtitle}>Instantly resolve hardware identity, warranty, and gate status</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.cyanLight} />
        </TouchableOpacity>

        {/* Gate Monitoring */}
        <Text style={styles.sectionHeading}>PHYSICAL GATE MONITORING</Text>
        <View style={styles.metricsRow}>
          <MetricCard label="ASSETS OUTSIDE" value={kpis.assetsOutside} icon="arrow-up-circle-outline" color={colors.amberLight} bg={colors.amberBg} border={colors.amberBorder} />
          <MetricCard label="TODAY'S EXITS" value={kpis.todayOut} icon="exit-outline" color={colors.cyanLight} bg={colors.cyanGlow} border={colors.borderCyan} />
          <MetricCard label="TODAY'S RETURNS" value={kpis.todayIn} icon="enter-outline" color={colors.emeraldLight} bg={colors.emeraldBg} border={colors.emeraldBorder} />
        </View>
        {kpis.overdueReturns > 0 && (
          <View style={styles.overdueAlert}>
            <Ionicons name="warning-outline" size={15} color={colors.roseLight} />
            <Text style={styles.overdueText}>{kpis.overdueReturns} asset(s) overdue for return</Text>
          </View>
        )}

        {/* Inventory Stats */}
        <Text style={styles.sectionHeading}>INVENTORY LIFECYCLE STATS</Text>
        <View style={styles.metricsRow}>
          <MetricCard label="TOTAL ASSETS" value={assetCounts.total} icon="laptop-outline" color={colors.cyanLight} bg={colors.cyanGlow} border={colors.borderCyan} />
          <MetricCard label="ACTIVE IN-USE" value={assetCounts.active} icon="checkmark-circle-outline" color={colors.emeraldLight} bg={colors.emeraldBg} border={colors.emeraldBorder} />
          <MetricCard label="UNDER REPAIR" value={assetCounts.repair} icon="construct-outline" color={colors.roseLight} bg={colors.roseBg} border={colors.roseBorder} />
        </View>

        {/* Module Grid */}
        <Text style={styles.sectionHeading}>ENTERPRISE MODULES</Text>
        <View style={styles.moduleGrid}>
          {modules.map((m, idx) => (
            <TouchableOpacity key={idx} style={styles.moduleCard} onPress={() => router.push(m.route as any)} activeOpacity={0.75}>
              <View style={[styles.moduleIconBox, { backgroundColor: m.color + '18', borderColor: m.color + '44' }]}>
                <Ionicons name={m.icon as any} size={22} color={m.color} />
              </View>
              <Text style={styles.moduleTitle} numberOfLines={1}>{m.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <QrScannerModal visible={scannerVisible} onClose={() => setScannerVisible(false)} onScan={handleScan} title="Admin Asset Scanner" />

      {scanLoading && (
        <Modal transparent visible>
          <View style={styles.modalOverlay}>
            <ActivityIndicator size="large" color={colors.cyanLight} />
            <Text style={styles.loadingText}>Resolving encrypted QR tag...</Text>
          </View>
        </Modal>
      )}

      {!!scanError && (
        <Modal transparent visible onRequestClose={() => setScanError(null)}>
          <View style={styles.modalOverlay}>
            <View style={styles.alertCard}>
              <Ionicons name="alert-circle" size={40} color={colors.roseLight} />
              <Text style={styles.alertTitle}>Scan Verification Failed</Text>
              <Text style={styles.alertMessage}>{scanError}</Text>
              <TouchableOpacity style={styles.alertDismiss} onPress={() => setScanError(null)}>
                <Text style={styles.alertDismissText}>Dismiss</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {!!scannedAsset && (
        <Modal visible animationType="slide" onRequestClose={() => setScannedAsset(null)}>
          <View style={styles.fullModal}>
            <View style={[styles.modalHeader, { paddingTop: Math.max(insets.top + 8, 20) }]}>
              <View>
                <Text style={styles.modalHeaderTitle}>{scannedAsset.companyAssetId || scannedAsset.assetCode}</Text>
                <Text style={styles.modalHeaderSub}>{scannedAsset.manufacturer} {scannedAsset.model}</Text>
              </View>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setScannedAsset(null)}>
                <Ionicons name="close" size={20} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <AssetDetailView asset={scannedAsset} roleCode="ADMIN" onClose={() => setScannedAsset(null)} />
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: 16, paddingBottom: 32, gap: 14 },
  scanBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.card, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: colors.borderCyan, gap: 12,
  },
  scanIconBox: {
    width: 48, height: 48, borderRadius: 10,
    backgroundColor: colors.cyanLight, alignItems: 'center', justifyContent: 'center',
  },
  scanTextGroup: { flex: 1 },
  scanTitle: { fontSize: 13, fontWeight: '800', color: colors.textPrimary, letterSpacing: 0.5 },
  scanSubtitle: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  sectionHeading: { fontSize: 10, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.8, marginTop: 4 },
  metricsRow: { flexDirection: 'row', gap: 10 },
  overdueAlert: {
    flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10,
    borderRadius: 8, backgroundColor: colors.roseBg, borderWidth: 1, borderColor: colors.roseBorder,
  },
  overdueText: { fontSize: 12, color: colors.roseLight, fontWeight: '600' },
  moduleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  moduleCard: {
    width: '47%', backgroundColor: colors.card, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center', gap: 8,
  },
  moduleIconBox: {
    width: 44, height: 44, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center',
  },
  moduleTitle: { fontSize: 12, fontWeight: '700', color: colors.textPrimary, textAlign: 'center' },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(3,3,9,0.85)', alignItems: 'center', justifyContent: 'center', padding: 20, gap: 12,
  },
  loadingText: { color: colors.cyanLight, fontSize: 13, fontWeight: '700' },
  alertCard: {
    backgroundColor: colors.card, borderRadius: 16, padding: 24, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', gap: 12, width: '100%', maxWidth: 320,
  },
  alertTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  alertMessage: { fontSize: 12, color: colors.textSecondary, textAlign: 'center', lineHeight: 18 },
  alertDismiss: {
    backgroundColor: colors.surface, paddingVertical: 10, paddingHorizontal: 24,
    borderRadius: 8, borderWidth: 1, borderColor: colors.border, marginTop: 4,
  },
  alertDismissText: { color: colors.textPrimary, fontSize: 13, fontWeight: '600' },
  fullModal: { flex: 1, backgroundColor: colors.background },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 14,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  modalHeaderTitle: { fontSize: 16, fontWeight: '800', color: colors.textPrimary, fontFamily: 'monospace' },
  modalHeaderSub: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  modalCloseBtn: {
    width: 36, height: 36, borderRadius: 8, backgroundColor: colors.card,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center',
  },
});
