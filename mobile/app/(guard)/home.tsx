import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../../src/components/Header';
import { QrScannerModal } from '../../src/components/QrScannerModal';
import { AssetDetailView } from '../../src/components/AssetDetailView';
import { securityGateApi } from '../../src/api/securityGate';
import { GateKPIs, ScannedAssetData, GateMaster } from '../../src/types';
import { colors } from '../../src/theme/colors';

export default function GuardHomeScreen() {
  const router = useRouter();

  const [kpis, setKpis] = useState<GateKPIs>({
    assetsOutside: 0,
    assetsInside: 0,
    todayOut: 0,
    todayIn: 0,
    overdueReturns: 0,
    totalMovements: 0,
  });
  const [gates, setGates] = useState<GateMaster[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Scanner State
  const [scannerVisible, setScannerVisible] = useState(false);
  const [scannedAsset, setScannedAsset] = useState<ScannedAssetData | null>(null);
  const [resolving, setResolving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Movement Action Modals
  const [showOutForm, setShowOutForm] = useState(false);
  const [showInForm, setShowInForm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Form Fields
  const [destination, setDestination] = useState('');
  const [purpose, setPurpose] = useState('');
  const [expectedReturn, setExpectedReturn] = useState('');
  const [remarks, setRemarks] = useState('');
  const [selectedGateId, setSelectedGateId] = useState<string>('');

  const loadData = async () => {
    try {
      const [kpisData, gatesData] = await Promise.all([
        securityGateApi.getKPIs().catch(() => null),
        securityGateApi.getGates().catch(() => []),
      ]);
      if (kpisData) setKpis(kpisData);
      if (gatesData && gatesData.length > 0) {
        setGates(gatesData);
        if (!selectedGateId) setSelectedGateId(gatesData[0].id);
      }
    } catch (e) {
      console.error('Failed to load guard data', e);
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
    setResolving(true);
    setErrorMessage(null);

    try {
      const data = await securityGateApi.scanToken(token);
      setScannedAsset(data);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Unable to resolve QR tag. Please ensure asset tag is valid and not revoked.';
      setErrorMessage(msg);
    } finally {
      setResolving(false);
    }
  };

  const handleRecordOut = async () => {
    if (!scannedAsset) return;
    if (!destination.trim() || !purpose.trim()) {
      Alert.alert('Required Fields', 'Please specify both Destination and Purpose for exit.');
      return;
    }

    try {
      setActionLoading(true);
      const res = await securityGateApi.recordOut({
        assetId: scannedAsset.assetId,
        qrCodeId: scannedAsset.qrId,
        gateId: selectedGateId || undefined,
        destination: destination.trim(),
        purpose: purpose.trim(),
        expectedReturn: expectedReturn ? new Date(expectedReturn).toISOString() : null,
        remarks: remarks.trim() || null,
      });

      setShowOutForm(false);
      setScannedAsset(null);
      setDestination('');
      setPurpose('');
      setExpectedReturn('');
      setRemarks('');
      await loadData();

      Alert.alert(
        'Exit Recorded Successfully',
        `Asset ${scannedAsset.assetCode} is now recorded as OUTSIDE.\nMovement Code: ${res?.data?.movementCode || 'Recorded'}`,
        [{ text: 'Scan Next Asset', onPress: () => setScannerVisible(true) }]
      );
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to record exit.';
      Alert.alert('Gate Exit Failed', msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRecordIn = async () => {
    if (!scannedAsset) return;

    try {
      setActionLoading(true);
      const res = await securityGateApi.recordIn({
        assetId: scannedAsset.assetId,
        qrCodeId: scannedAsset.qrId,
        gateId: selectedGateId || undefined,
        remarks: remarks.trim() || 'Returned on-site in good order',
      });

      setShowInForm(false);
      setScannedAsset(null);
      setRemarks('');
      await loadData();

      Alert.alert(
        'Entry Recorded Successfully',
        `Asset ${scannedAsset.assetCode} is now recorded as INSIDE.\nMovement Code: ${res?.data?.movementCode || 'Completed'}`,
        [{ text: 'Scan Next Asset', onPress: () => setScannerVisible(true) }]
      );
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to record entry.';
      Alert.alert('Gate Entry Failed', msg);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header title="Security Gate Terminal" subtitle="Physical Checkpoint Verification" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.amber} />}
      >
        {/* Giant Primary Action: SCAN QR CODE */}
        <TouchableOpacity
          style={styles.primaryScanButton}
          onPress={() => setScannerVisible(true)}
          activeOpacity={0.85}
        >
          <View style={styles.scanIconCircle}>
            <Ionicons name="scan" size={44} color={colors.textDark} />
          </View>
          <Text style={styles.primaryScanText}>SCAN ASSET QR</Text>
          <Text style={styles.primaryScanSubtext}>Tap to activate camera checkpoint scanner</Text>
        </TouchableOpacity>

        {/* Quick Gate Presence KPIs */}
        <View style={styles.kpiRow}>
          <View style={styles.kpiCardOutside}>
            <Text style={styles.kpiNumber}>{kpis.assetsOutside}</Text>
            <Text style={styles.kpiLabel}>ASSETS OUTSIDE</Text>
          </View>
          <View style={styles.kpiCardToday}>
            <Text style={[styles.kpiNumber, { color: colors.cyan }]}>{kpis.todayOut}</Text>
            <Text style={styles.kpiLabel}>TODAY'S OUT</Text>
          </View>
          <View style={styles.kpiCardToday}>
            <Text style={[styles.kpiNumber, { color: colors.emerald }]}>{kpis.todayIn}</Text>
            <Text style={styles.kpiLabel}>TODAY'S IN</Text>
          </View>
        </View>

        {/* Quick Access Actions */}
        <View style={styles.navRow}>
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => router.push('/(guard)/outside')}
          >
            <Ionicons name="arrow-up-circle-outline" size={20} color={colors.amber} />
            <Text style={styles.navButtonText}>Current Outside ({kpis.assetsOutside})</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navButton}
            onPress={() => router.push('/(guard)/movements')}
          >
            <Ionicons name="time-outline" size={20} color={colors.cyan} />
            <Text style={styles.navButtonText}>Today's Movements</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* QR Scanner Modal */}
      <QrScannerModal
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        onScan={handleScan}
        title="Gate Scanner Terminal"
        subtitle="Align physical asset QR tag"
      />

      {/* Resolving Spinner Modal */}
      {resolving && (
        <Modal transparent visible={resolving}>
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={colors.cyan} />
            <Text style={styles.loadingText}>Verifying QR tag at gate...</Text>
          </View>
        </Modal>
      )}

      {/* Error Alert Modal */}
      {errorMessage && (
        <Modal transparent visible={!!errorMessage} onRequestClose={() => setErrorMessage(null)}>
          <View style={styles.modalOverlay}>
            <View style={styles.alertCard}>
              <Ionicons name="close-circle" size={44} color={colors.rose} />
              <Text style={styles.alertTitle}>Gate Checkpoint Notice</Text>
              <Text style={styles.alertMessage}>{errorMessage}</Text>
              <TouchableOpacity style={styles.alertButton} onPress={() => setErrorMessage(null)}>
                <Text style={styles.alertButtonText}>Dismiss & Try Again</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* Verified Asset Checkpoint Result Modal */}
      {scannedAsset && (
        <Modal visible={!!scannedAsset} animationType="slide">
          <View style={styles.checkpointModal}>
            <View style={styles.checkpointHeader}>
              <View>
                <Text style={styles.checkpointAssetCode}>{scannedAsset.assetCode}</Text>
                <Text style={styles.checkpointSub}>{scannedAsset.model} ({scannedAsset.assetType})</Text>
              </View>
              <TouchableOpacity
                style={styles.closeCheckpoint}
                onPress={() => setScannedAsset(null)}
              >
                <Ionicons name="close" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Limited Gate-Safe Asset Details */}
            <AssetDetailView asset={scannedAsset} role="SECURITY_GUARD" />

            {/* Action Bar based on INSIDE vs OUTSIDE */}
            <View style={styles.actionFooter}>
              {scannedAsset.gatePresence === 'INSIDE' ? (
                <TouchableOpacity
                  style={styles.btnRecordOut}
                  onPress={() => setShowOutForm(true)}
                >
                  <Ionicons name="arrow-up-circle" size={22} color={colors.textDark} />
                  <Text style={styles.btnRecordText}>RECORD ASSET OUT</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.btnRecordIn}
                  onPress={() => setShowInForm(true)}
                >
                  <Ionicons name="arrow-down-circle" size={22} color={colors.textDark} />
                  <Text style={styles.btnRecordText}>RECORD ASSET IN</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </Modal>
      )}

      {/* Record OUT Form Modal */}
      {showOutForm && (
        <Modal visible={showOutForm} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.formCard}>
              <View style={styles.formHeader}>
                <Ionicons name="arrow-up-circle" size={22} color={colors.amber} />
                <Text style={styles.formTitle}>Record Physical Exit (OUT)</Text>
              </View>

              <ScrollView style={styles.formScroll}>
                <Text style={styles.formLabel}>Destination / Client Site *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g. Tata Motors Plant, Pune"
                  placeholderTextColor={colors.textMuted}
                  value={destination}
                  onChangeText={setDestination}
                />

                <Text style={styles.formLabel}>Operational Purpose *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g. Field Commissioning & Automation testing"
                  placeholderTextColor={colors.textMuted}
                  value={purpose}
                  onChangeText={setPurpose}
                />

                <Text style={styles.formLabel}>Expected Return Date (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g. 2026-09-10"
                  placeholderTextColor={colors.textMuted}
                  value={expectedReturn}
                  onChangeText={setExpectedReturn}
                />

                <Text style={styles.formLabel}>Gate Remarks (Optional)</Text>
                <TextInput
                  style={[styles.formInput, { height: 60 }]}
                  placeholder="e.g. Power brick and bag verified"
                  placeholderTextColor={colors.textMuted}
                  value={remarks}
                  onChangeText={setRemarks}
                  multiline
                />
              </ScrollView>

              <View style={styles.formBtnGroup}>
                <TouchableOpacity
                  style={styles.formCancelBtn}
                  onPress={() => setShowOutForm(false)}
                >
                  <Text style={styles.formCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.formSubmitBtn, { backgroundColor: colors.amber }]}
                  onPress={handleRecordOut}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <ActivityIndicator color={colors.textDark} />
                  ) : (
                    <Text style={styles.formSubmitText}>Confirm Exit</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Record IN Form Modal */}
      {showInForm && (
        <Modal visible={showInForm} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.formCard}>
              <View style={styles.formHeader}>
                <Ionicons name="arrow-down-circle" size={22} color={colors.emerald} />
                <Text style={styles.formTitle}>Record Physical Return (IN)</Text>
              </View>

              <ScrollView style={styles.formScroll}>
                <Text style={styles.infoNote}>
                  Asset has returned on-site. The previous open OUT movement will be closed and verified.
                </Text>

                <Text style={styles.formLabel}>Return Remarks / Condition</Text>
                <TextInput
                  style={[styles.formInput, { height: 70 }]}
                  placeholder="e.g. Returned in clean working condition"
                  placeholderTextColor={colors.textMuted}
                  value={remarks}
                  onChangeText={setRemarks}
                  multiline
                />
              </ScrollView>

              <View style={styles.formBtnGroup}>
                <TouchableOpacity
                  style={styles.formCancelBtn}
                  onPress={() => setShowInForm(false)}
                >
                  <Text style={styles.formCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.formSubmitBtn, { backgroundColor: colors.emerald }]}
                  onPress={handleRecordIn}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <ActivityIndicator color={colors.textDark} />
                  ) : (
                    <Text style={styles.formSubmitText}>Confirm Return</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
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
    gap: 16,
    paddingBottom: 32,
  },
  primaryScanButton: {
    backgroundColor: colors.cyan,
    borderRadius: 20,
    paddingVertical: 28,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: colors.cyan,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  scanIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  primaryScanText: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.textDark,
    letterSpacing: 1,
  },
  primaryScanSubtext: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(10, 13, 20, 0.75)',
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 10,
  },
  kpiCardOutside: {
    flex: 1.2,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: colors.amberBorder,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
  },
  kpiCardToday: {
    flex: 1,
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
  },
  kpiNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.amber,
    fontFamily: 'monospace',
  },
  kpiLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.5,
    marginTop: 4,
  },
  navRow: {
    flexDirection: 'row',
    gap: 10,
  },
  navButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.card,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  navButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
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
    padding: 16,
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
  alertButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 6,
  },
  alertButtonText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  checkpointModal: {
    flex: 1,
    backgroundColor: colors.background,
  },
  checkpointHeader: {
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
  checkpointAssetCode: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.cyan,
    fontFamily: 'monospace',
  },
  checkpointSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  closeCheckpoint: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionFooter: {
    padding: 16,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  btnRecordOut: {
    backgroundColor: colors.amber,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: colors.amber,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  btnRecordIn: {
    backgroundColor: colors.emerald,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: colors.emerald,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  btnRecordText: {
    color: colors.textDark,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  formCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    width: '100%',
    maxHeight: '85%',
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: 12,
  },
  formTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  formScroll: {
    maxHeight: 320,
  },
  formLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 4,
    marginTop: 10,
    textTransform: 'uppercase',
  },
  formInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.textPrimary,
    fontSize: 13,
  },
  infoNote: {
    fontSize: 12,
    color: colors.emeraldLight,
    backgroundColor: colors.emeraldBg,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.emeraldBorder,
    marginBottom: 10,
  },
  formBtnGroup: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  formCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
  },
  formCancelText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  formSubmitBtn: {
    flex: 1.5,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formSubmitText: {
    color: colors.textDark,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
