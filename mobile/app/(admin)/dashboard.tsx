import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
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

  const [kpis, setKpis] = useState<GateKPIs>({
    assetsOutside: 0,
    assetsInside: 0,
    todayOut: 0,
    todayIn: 0,
    overdueReturns: 0,
    totalMovements: 0,
  });
  const [assetCounts, setAssetCounts] = useState<{ total: number; active: number; repair: number }>({
    total: 0,
    active: 0,
    repair: 0,
  });
  const [refreshing, setRefreshing] = useState(false);

  // Scanner & Scanned Result Modal
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
      if (counts) {
        setAssetCounts({
          total: counts.total || counts.totalAssets || 0,
          active: counts.active || counts.inUse || 0,
          repair: counts.underRepair || counts.repair || 0,
        });
      }
    } catch (e) {
      console.error('Failed to load dashboard data', e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleScan = async (token: string) => {
    setScannerVisible(false);
    setScanLoading(true);
    setScanError(null);
    try {
      const data = await securityGateApi.scanToken(token);
      setScannedAsset(data);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'QR tag resolution failed.';
      setScanError(msg);
    } finally {
      setScanLoading(false);
    }
  };

  const modules = [
    { name: 'Asset Inventory', icon: 'laptop-outline', route: '/(admin)/assets', color: colors.cyan },
    { name: 'Security Gate', icon: 'shield-outline', route: '/(admin)/gate', color: colors.amber },
    { name: 'Assignments', icon: 'person-add-outline', route: '/(admin)/assets', color: colors.cyanLight },
    { name: 'Transfers', icon: 'swap-horizontal-outline', route: '/(admin)/assets', color: colors.cyan },
    { name: 'Returns', icon: 'return-down-back-outline', route: '/(admin)/assets', color: colors.emerald },
    { name: 'Maintenance', icon: 'construct-outline', route: '/(admin)/assets', color: colors.rose },
    { name: 'Warranties', icon: 'ribbon-outline', route: '/(admin)/assets', color: colors.cyanDark },
    { name: 'Approvals', icon: 'checkmark-circle-outline', route: '/(admin)/assets', color: colors.amberLight },
  ];

  return (
    <View style={styles.container}>
      <Header subtitle="Administrator Mobile Console" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.cyan} />}
      >
        {/* Quick QR Scanner Action */}
        <TouchableOpacity style={styles.scanBanner} onPress={() => setScannerVisible(true)}>
          <View style={styles.scanIconBox}>
            <Ionicons name="qr-code-outline" size={28} color={colors.textDark} />
          </View>
          <View style={styles.scanTextGroup}>
            <Text style={styles.scanTitle}>SCAN ANY ASSET QR</Text>
            <Text style={styles.scanSubtitle}>Instant full asset profile & hardware inspection</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.cyan} />
        </TouchableOpacity>

        {/* Operational KPIs */}
        <Text style={styles.sectionHeading}>INVENTORY & GATE OVERVIEW</Text>
        <View style={styles.metricsGrid}>
          <View style={styles.metricsRow}>
            <MetricCard
              label="TOTAL ASSETS"
              value={assetCounts.total || '—'}
              subtitle="Registered in system"
              icon="layers-outline"
              color={colors.cyan}
            />
            <MetricCard
              label="OUTSIDE GATE"
              value={kpis.assetsOutside}
              subtitle="Currently off-site"
              icon="arrow-up-circle-outline"
              color={colors.amber}
              bg="rgba(245, 158, 11, 0.08)"
              borderColor={colors.amberBorder}
            />
          </View>
          <View style={styles.metricsRow}>
            <MetricCard
              label="INSIDE PREMISES"
              value={kpis.assetsInside}
              subtitle="Verified on-site"
              icon="shield-checkmark-outline"
              color={colors.emerald}
              bg="rgba(16, 185, 129, 0.08)"
              borderColor={colors.emeraldBorder}
            />
            <MetricCard
              label="TODAY'S EXITS"
              value={kpis.todayOut}
              subtitle="Movements recorded"
              icon="exit-outline"
              color={colors.cyanLight}
            />
          </View>
        </View>

        {/* Management Modules */}
        <Text style={styles.sectionHeading}>MANAGEMENT MODULES</Text>
        <View style={styles.modulesGrid}>
          {modules.map((m, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.moduleItem}
              onPress={() => router.push(m.route as any)}
            >
              <View style={[styles.moduleIconBox, { borderColor: m.color }]}>
                <Ionicons name={m.icon as any} size={22} color={m.color} />
              </View>
              <Text style={styles.moduleName}>{m.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* QR Scanner Modal */}
      <QrScannerModal
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        onScan={handleScan}
        title="Admin Asset Scanner"
        subtitle="Align QR code to view complete asset profile"
      />

      {/* Scan Loading / Result Modal */}
      {scanLoading && (
        <Modal transparent visible={scanLoading}>
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={colors.cyan} />
            <Text style={styles.loadingText}>Resolving asset identity...</Text>
          </View>
        </Modal>
      )}

      {/* Scan Error Modal */}
      {scanError && (
        <Modal transparent visible={!!scanError} onRequestClose={() => setScanError(null)}>
          <View style={styles.modalOverlay}>
            <View style={styles.alertCard}>
              <Ionicons name="alert-circle" size={40} color={colors.rose} />
              <Text style={styles.alertTitle}>Scan Verification Failed</Text>
              <Text style={styles.alertMessage}>{scanError}</Text>
              <TouchableOpacity style={styles.closeAlertButton} onPress={() => setScanError(null)}>
                <Text style={styles.closeAlertText}>Dismiss</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* Scanned Full Asset Details Modal */}
      {scannedAsset && (
        <Modal
          visible={!!scannedAsset}
          animationType="slide"
          onRequestClose={() => setScannedAsset(null)}
        >
          <View style={styles.fullModalContainer}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalHeaderTitle}>
                  {scannedAsset.companyAssetId || scannedAsset.assetCode}
                </Text>
                <Text style={styles.modalHeaderSubtitle}>
                  {scannedAsset.manufacturer} {scannedAsset.model}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setScannedAsset(null)}
              >
                <Ionicons name="close" size={20} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <AssetDetailView asset={scannedAsset} role="ADMIN" />
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
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
    gap: 16,
  },
  scanBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.borderCyan,
    gap: 12,
  },
  scanIconBox: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: colors.cyan,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanTextGroup: {
    flex: 1,
  },
  scanTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },
  scanSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.8,
    marginTop: 4,
  },
  metricsGrid: {
    gap: 10,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modulesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  moduleItem: {
    width: '48%',
    backgroundColor: colors.card,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    gap: 8,
  },
  moduleIconBox: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moduleName: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  loadingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 13, 20, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: colors.cyan,
    fontSize: 13,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  alertCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    gap: 10,
    width: '100%',
    maxWidth: 320,
  },
  alertTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  alertMessage: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
  closeAlertButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 6,
  },
  closeAlertText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
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
    paddingTop: 48,
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
    marginTop: 1,
  },
  modalCloseButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
