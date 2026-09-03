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
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [kpis, setKpis] = useState<GateKPIs>({
    assetsOutside: 0,
    assetsInside: 0,
    todayOut: 0,
    todayIn: 0,
    overdueReturns: 0,
    totalMovements: 0,
  });
  const [assetCounts, setAssetCounts] = useState<{ total: number; active: number }>({
    total: 0,
    active: 0,
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
        });
      }
    } catch (e) {
      console.error('Failed to load manager dashboard data', e);
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

  return (
    <View style={styles.container}>
      <Header subtitle="Department Operations Console" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.emerald} />}
      >
        {/* Quick QR Scanner Action */}
        <TouchableOpacity
          style={styles.scanBanner}
          onPress={() => setScannerVisible(true)}
          activeOpacity={0.8}
        >
          <View style={styles.scanIconBox}>
            <Ionicons name="qr-code-outline" size={26} color={colors.textDark} />
          </View>
          <View style={styles.scanTextGroup}>
            <Text style={styles.scanTitle}>SCAN DEPARTMENT ASSET</Text>
            <Text style={styles.scanSubtitle}>
              Inspect custody, physical presence, and specifications
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.emerald} />
        </TouchableOpacity>

        {/* Physical Security Gate Status */}
        <Text style={styles.sectionHeading}>GATE MONITORING</Text>
        <View style={styles.metricsGrid}>
          <MetricCard
            label="ASSETS OUTSIDE"
            value={kpis.assetsOutside}
            subvalue={kpis.overdueReturns ? `${kpis.overdueReturns} Overdue` : undefined}
            color={colors.amber}
            icon="arrow-up-circle-outline"
          />
          <MetricCard
            label="TODAY'S EXITS"
            value={kpis.todayOut}
            color={colors.cyan}
            icon="exit-outline"
          />
          <MetricCard
            label="TODAY'S RETURNS"
            value={kpis.todayIn}
            color={colors.emerald}
            icon="enter-outline"
          />
        </View>

        {/* Department Asset Stats */}
        <Text style={styles.sectionHeading}>DEPARTMENT INVENTORY</Text>
        <View style={styles.metricsGrid}>
          <MetricCard
            label="MANAGED ASSETS"
            value={assetCounts.total}
            color={colors.emerald}
            icon="laptop-outline"
          />
          <MetricCard
            label="CURRENTLY ACTIVE"
            value={assetCounts.active}
            color={colors.cyan}
            icon="checkmark-circle-outline"
          />
        </View>
      </ScrollView>

      {/* QR Scanner Modal */}
      <QrScannerModal
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        onScan={handleScan}
        title="Manager Asset Scanner"
        subtitle="Align QR code to inspect authorized department profile"
      />

      {/* Scan Loading Modal */}
      {scanLoading && (
        <Modal transparent visible={scanLoading}>
          <View style={styles.modalOverlay}>
            <ActivityIndicator size="large" color={colors.emerald} />
            <Text style={styles.loadingText}>Verifying asset record...</Text>
          </View>
        </Modal>
      )}

      {/* Scan Error Modal */}
      {scanError && (
        <Modal transparent visible={!!scanError} onRequestClose={() => setScanError(null)}>
          <View style={styles.modalOverlay}>
            <View style={styles.alertCard}>
              <Ionicons name="alert-circle" size={40} color={colors.rose} />
              <Text style={styles.alertTitle}>Verification Notice</Text>
              <Text style={styles.alertMessage}>{scanError}</Text>
              <TouchableOpacity style={styles.closeAlertButton} onPress={() => setScanError(null)}>
                <Text style={styles.closeAlertText}>Dismiss</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* Scanned Full Asset Details Modal with Dynamic Safe Area */}
      {scannedAsset && (
        <Modal
          visible={!!scannedAsset}
          animationType="slide"
          onRequestClose={() => setScannedAsset(null)}
        >
          <View style={styles.fullModalContainer}>
            <View style={[styles.modalHeader, { paddingTop: Math.max(insets.top + 8, 20) }]}>
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
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={20} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <AssetDetailView asset={scannedAsset} role="MANAGER" />
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
    borderColor: colors.emeraldBorder,
    gap: 12,
  },
  scanIconBox: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: colors.emerald,
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
    fontSize: 10,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.8,
    marginTop: 4,
  },
  metricsGrid: {
    gap: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 13, 20, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 12,
  },
  loadingText: {
    color: colors.emerald,
    fontSize: 13,
    fontWeight: '700',
  },
  alertCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    gap: 12,
    width: '100%',
    maxWidth: 320,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  alertMessage: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  closeAlertButton: {
    backgroundColor: colors.surface,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginTop: 4,
  },
  closeAlertText: {
    color: colors.textPrimary,
    fontSize: 13,
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
