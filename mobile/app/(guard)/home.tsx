import React, { useState, useEffect, useCallback } from 'react';
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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '../../src/components/Header';
import { QrScannerModal } from '../../src/components/QrScannerModal';
import { AssetDetailView } from '../../src/components/AssetDetailView';
import { MovementSuccessModal } from '../../src/components/MovementSuccessModal';
import { securityGateApi } from '../../src/api/securityGate';
import { GateKPIs, ScannedAssetData, GateMaster } from '../../src/types';
import { colors } from '../../src/theme/colors';

export default function GuardHomeScreen() {
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
  const [gates, setGates] = useState<GateMaster[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Scanner & Resolution States
  const [scannerVisible, setScannerVisible] = useState(false);
  const [scannedAsset, setScannedAsset] = useState<ScannedAssetData | null>(null);
  const [resolving, setResolving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Checkpoint Action State: 'idle' | 'out_form' | 'in_form'
  const [movementAction, setMovementAction] = useState<'idle' | 'out_form' | 'in_form'>('idle');
  const [actionLoading, setActionLoading] = useState(false);

  // Form Fields
  const [destination, setDestination] = useState('');
  const [purpose, setPurpose] = useState('');
  const [expectedReturn, setExpectedReturn] = useState('');
  const [remarks, setRemarks] = useState('');
  const [selectedGateId, setSelectedGateId] = useState<string>('');

  // Success State Modal
  const [successData, setSuccessData] = useState<{
    visible: boolean;
    type: 'OUT' | 'IN';
    assetCode: string;
    assetName: string;
    movementCode?: string;
    gateName?: string;
  } | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [kpisData, gatesData] = await Promise.all([
        securityGateApi.getKPIs().catch(() => null),
        securityGateApi.getGates().catch(() => []),
      ]);
      if (kpisData) setKpis(kpisData);
      if (gatesData && gatesData.length > 0) {
        setGates(gatesData);
        setSelectedGateId(gatesData[0].id);
      }
    } catch (e) {
      console.error('Failed to load guard data', e);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleScan = async (token: string) => {
    setScannerVisible(false);
    setResolving(true);
    setErrorMessage(null);
    setMovementAction('idle');

    try {
      const data = await securityGateApi.scanToken(token);
      setScannedAsset(data);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Unable to resolve QR tag. Please verify that the tag is valid and not revoked.';
      setErrorMessage(msg);
    } finally {
      setResolving(false);
    }
  };

  const resetFormState = () => {
    setScannedAsset(null);
    setMovementAction('idle');
    setDestination('');
    setPurpose('');
    setExpectedReturn('');
    setRemarks('');
  };

  const handleRecordOut = async () => {
    if (!scannedAsset) return;
    if (!destination.trim() || !purpose.trim()) {
      Alert.alert('Required Fields', 'Please enter Destination and Purpose for the exit record.');
      return;
    }

    try {
      setActionLoading(true);
      const gateObj = gates.find((g) => g.id === selectedGateId);
      const res = await securityGateApi.recordOut({
        assetId: scannedAsset.assetId,
        qrCodeId: scannedAsset.qrId,
        gateId: selectedGateId || undefined,
        destination: destination.trim(),
        purpose: purpose.trim(),
        expectedReturn: expectedReturn.trim() ? new Date(expectedReturn.trim()).toISOString() : null,
        remarks: remarks.trim() || null,
      });

      const movementCode = res?.data?.movementCode || res?.movementCode;
      const assetCode = scannedAsset.companyAssetId || scannedAsset.assetCode;
      const assetName = `${scannedAsset.manufacturer ? scannedAsset.manufacturer + ' ' : ''}${scannedAsset.model}`;

      resetFormState();
      loadData();

      setSuccessData({
        visible: true,
        type: 'OUT',
        assetCode,
        assetName,
        movementCode,
        gateName: gateObj?.name || 'Main Security Gate',
      });
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to record asset exit.';
      Alert.alert('Checkpoint Action Failed', msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRecordIn = async () => {
    if (!scannedAsset) return;

    try {
      setActionLoading(true);
      const gateObj = gates.find((g) => g.id === selectedGateId);
      const res = await securityGateApi.recordIn({
        assetId: scannedAsset.assetId,
        qrCodeId: scannedAsset.qrId,
        gateId: selectedGateId || undefined,
        remarks: remarks.trim() || 'Returned on-site in good order',
      });

      const movementCode = res?.data?.movementCode || res?.movementCode;
      const assetCode = scannedAsset.companyAssetId || scannedAsset.assetCode;
      const assetName = `${scannedAsset.manufacturer ? scannedAsset.manufacturer + ' ' : ''}${scannedAsset.model}`;

      resetFormState();
      loadData();

      setSuccessData({
        visible: true,
        type: 'IN',
        assetCode,
        assetName,
        movementCode,
        gateName: gateObj?.name || 'Main Security Gate',
      });
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to record asset return.';
      Alert.alert('Checkpoint Action Failed', msg);
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
        {/* Dominant Primary Action: SCAN ASSET QR */}
        <TouchableOpacity
          style={styles.primaryScanButton}
          onPress={() => setScannerVisible(true)}
          activeOpacity={0.85}
        >
          <View style={styles.scanIconCircle}>
            <Ionicons name="scan" size={42} color={colors.textDark} />
          </View>
          <Text style={styles.primaryScanText}>SCAN ASSET QR</Text>
          <Text style={styles.primaryScanSubtext}>Tap to open camera and verify asset pass</Text>
        </TouchableOpacity>

        {/* Operational Presence KPIs */}
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

        {/* Quick Navigation Cards */}
        <View style={styles.navRow}>
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => router.push('/(guard)/outside')}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-up-circle-outline" size={20} color={colors.amber} />
            <Text style={styles.navButtonText}>Current Outside ({kpis.assetsOutside})</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navButton}
            onPress={() => router.push('/(guard)/movements')}
            activeOpacity={0.7}
          >
            <Ionicons name="time-outline" size={20} color={colors.cyan} />
            <Text style={styles.navButtonText}>Today's Movement Log</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* QR Camera Scanner Modal */}
      <QrScannerModal
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        onScan={handleScan}
        title="Gate Scanner Terminal"
        subtitle="Align physical asset QR tag"
      />

      {/* Loading Overlay */}
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
              <Text style={styles.alertTitle}>Gate Verification Notice</Text>
              <Text style={styles.alertMessage}>{errorMessage}</Text>
              <TouchableOpacity style={styles.alertButton} onPress={() => setErrorMessage(null)}>
                <Text style={styles.alertButtonText}>Dismiss & Try Again</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* Verified Asset Checkpoint Sheet (Single Unified Layer) */}
      {scannedAsset && (
        <Modal
          visible={!!scannedAsset}
          animationType="slide"
          onRequestClose={() => resetFormState()}
        >
          <KeyboardAvoidingView
            style={styles.checkpointModal}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            {/* Header with Safe Inset */}
            <View style={[styles.checkpointHeader, { paddingTop: Math.max(insets.top + 8, 20) }]}>
              <View>
                <Text style={styles.checkpointAssetCode}>
                  {scannedAsset.companyAssetId || scannedAsset.assetCode}
                </Text>
                <Text style={styles.checkpointSub}>
                  {scannedAsset.manufacturer ? `${scannedAsset.manufacturer} ` : ''}{scannedAsset.model} ({scannedAsset.assetType})
                </Text>
              </View>
              <TouchableOpacity
                style={styles.closeCheckpoint}
                onPress={() => resetFormState()}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={20} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Scrollable Checkpoint Content */}
            <ScrollView style={styles.checkpointBody} contentContainerStyle={styles.checkpointScroll}>
              <AssetDetailView asset={scannedAsset} role="SECURITY_GUARD" />

              {/* OUT Form Inline Expansion */}
              {movementAction === 'out_form' && (
                <View style={styles.inlineFormCard}>
                  <View style={styles.inlineFormHeader}>
                    <Ionicons name="arrow-up-circle" size={18} color={colors.amber} />
                    <Text style={[styles.inlineFormTitle, { color: colors.amber }]}>
                      Record Asset Exit (OUT)
                    </Text>
                  </View>

                  <Text style={styles.formLabel}>Destination / Client Site *</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="e.g. Pune Plant / On-site customer facility"
                    placeholderTextColor={colors.textMuted}
                    value={destination}
                    onChangeText={setDestination}
                  />

                  <Text style={styles.formLabel}>Operational Purpose *</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="e.g. Testing, Maintenance, Offsite Commissioning"
                    placeholderTextColor={colors.textMuted}
                    value={purpose}
                    onChangeText={setPurpose}
                  />

                  <Text style={styles.formLabel}>Expected Return Date (YYYY-MM-DD)</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="e.g. 2026-09-10 (Optional)"
                    placeholderTextColor={colors.textMuted}
                    value={expectedReturn}
                    onChangeText={setExpectedReturn}
                  />

                  <Text style={styles.formLabel}>Security Remarks (Optional)</Text>
                  <TextInput
                    style={[styles.formInput, { height: 54 }]}
                    placeholder="e.g. Power adapter & bag verified"
                    placeholderTextColor={colors.textMuted}
                    value={remarks}
                    onChangeText={setRemarks}
                    multiline
                  />

                  <View style={styles.inlineBtnRow}>
                    <TouchableOpacity
                      style={styles.inlineCancelBtn}
                      onPress={() => setMovementAction('idle')}
                    >
                      <Text style={styles.inlineCancelText}>Back</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.inlineSubmitBtn, { backgroundColor: colors.amber }]}
                      onPress={handleRecordOut}
                      disabled={actionLoading}
                    >
                      {actionLoading ? (
                        <ActivityIndicator color={colors.textDark} />
                      ) : (
                        <Text style={styles.inlineSubmitText}>Confirm Exit</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* IN Form Inline Expansion */}
              {movementAction === 'in_form' && (
                <View style={styles.inlineFormCard}>
                  <View style={styles.inlineFormHeader}>
                    <Ionicons name="arrow-down-circle" size={18} color={colors.emerald} />
                    <Text style={[styles.inlineFormTitle, { color: colors.emerald }]}>
                      Record Asset Return (IN)
                    </Text>
                  </View>

                  <View style={styles.inNotice}>
                    <Ionicons name="information-circle-outline" size={16} color={colors.emerald} />
                    <Text style={styles.inNoticeText}>
                      Asset return will automatically close and verify the open exit record.
                    </Text>
                  </View>

                  <Text style={styles.formLabel}>Return Remarks (Optional)</Text>
                  <TextInput
                    style={[styles.formInput, { height: 60 }]}
                    placeholder="e.g. Device returned safely in good condition"
                    placeholderTextColor={colors.textMuted}
                    value={remarks}
                    onChangeText={setRemarks}
                    multiline
                  />

                  <View style={styles.inlineBtnRow}>
                    <TouchableOpacity
                      style={styles.inlineCancelBtn}
                      onPress={() => setMovementAction('idle')}
                    >
                      <Text style={styles.inlineCancelText}>Back</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.inlineSubmitBtn, { backgroundColor: colors.emerald }]}
                      onPress={handleRecordIn}
                      disabled={actionLoading}
                    >
                      {actionLoading ? (
                        <ActivityIndicator color={colors.textDark} />
                      ) : (
                        <Text style={styles.inlineSubmitText}>Confirm Return</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Action Bar based on INSIDE vs OUTSIDE */}
            {movementAction === 'idle' && (
              <View style={[styles.actionFooter, { paddingBottom: Math.max(insets.bottom + 8, 16) }]}>
                {scannedAsset.gatePresence === 'INSIDE' ? (
                  <TouchableOpacity
                    style={styles.btnRecordOut}
                    onPress={() => setMovementAction('out_form')}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="arrow-up-circle" size={20} color={colors.textDark} />
                    <Text style={styles.btnRecordText}>RECORD ASSET OUT</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.btnRecordIn}
                    onPress={() => setMovementAction('in_form')}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="arrow-down-circle" size={20} color={colors.textDark} />
                    <Text style={styles.btnRecordText}>RECORD ASSET IN</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </KeyboardAvoidingView>
        </Modal>
      )}

      {/* Movement Success Modal with instant SCAN NEXT */}
      {successData && (
        <MovementSuccessModal
          visible={successData.visible}
          type={successData.type}
          assetCode={successData.assetCode}
          assetName={successData.assetName}
          movementCode={successData.movementCode}
          gateName={successData.gateName}
          onScanNext={() => {
            setSuccessData(null);
            setScannerVisible(true);
          }}
          onClose={() => setSuccessData(null)}
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
  scrollContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 32,
  },
  primaryScanButton: {
    backgroundColor: colors.cyan,
    borderRadius: 20,
    paddingVertical: 26,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: colors.cyan,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  scanIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
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
    fontWeight: '700',
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
    paddingBottom: 12,
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
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkpointBody: {
    flex: 1,
  },
  checkpointScroll: {
    paddingBottom: 24,
  },
  inlineFormCard: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  inlineFormHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  inlineFormTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  formLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: 8,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  formInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    color: colors.textPrimary,
    fontSize: 13,
  },
  inNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.emeraldBg,
    borderColor: colors.emeraldBorder,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  inNoticeText: {
    fontSize: 11,
    color: colors.emeraldLight,
    flex: 1,
  },
  inlineBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  inlineCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
  },
  inlineCancelText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  inlineSubmitBtn: {
    flex: 1.6,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineSubmitText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textDark,
  },
  actionFooter: {
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  btnRecordOut: {
    backgroundColor: colors.amber,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
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
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: colors.emerald,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  btnRecordText: {
    color: colors.textDark,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
});
