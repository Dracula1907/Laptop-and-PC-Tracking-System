import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Modal, ActivityIndicator, TextInput, Alert,
  KeyboardAvoidingView, Platform,
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

  const [kpis, setKpis] = useState<GateKPIs>({ assetsOutside: 0, assetsInside: 0, todayOut: 0, todayIn: 0, overdueReturns: 0, totalMovements: 0 });
  const [gates, setGates] = useState<GateMaster[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [scannedAsset, setScannedAsset] = useState<ScannedAssetData | null>(null);
  const [resolving, setResolving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [movementAction, setMovementAction] = useState<'idle' | 'out_form' | 'in_form'>('idle');
  const [actionLoading, setActionLoading] = useState(false);
  const [destination, setDestination] = useState('');
  const [purpose, setPurpose] = useState('');
  const [expectedReturn, setExpectedReturn] = useState('');
  const [remarks, setRemarks] = useState('');
  const [selectedGateId, setSelectedGateId] = useState<string>('');
  const [successData, setSuccessData] = useState<{
    visible: boolean; type: 'OUT' | 'IN'; assetCode: string; assetName: string; movementCode?: string; gateName?: string;
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
    } catch (e) { console.error('Guard data load failed', e); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  const handleScan = async (token: string) => {
    setScannerVisible(false);
    setResolving(true);
    setErrorMessage(null);
    setMovementAction('idle');
    try {
      const data = await securityGateApi.scanToken(token);
      setScannedAsset(data);
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || 'Unable to resolve QR tag. Verify the tag is active and not revoked.');
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
      Alert.alert('Required Fields', 'Please enter Destination and Purpose.');
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
      setSuccessData({ visible: true, type: 'OUT', assetCode, assetName, movementCode, gateName: gateObj?.name || 'Security Gate' });
    } catch (err: any) {
      Alert.alert('Action Failed', err?.response?.data?.message || 'Failed to record asset exit.');
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
      setSuccessData({ visible: true, type: 'IN', assetCode, assetName, movementCode, gateName: gateObj?.name || 'Security Gate' });
    } catch (err: any) {
      Alert.alert('Action Failed', err?.response?.data?.message || 'Failed to record asset return.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header title="Security Gate Terminal" subtitle="Physical Checkpoint Verification" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.amberLight} />}
        showsVerticalScrollIndicator={false}
      >
        {/* BIG SCAN BUTTON */}
        <TouchableOpacity style={styles.primaryScanBtn} onPress={() => setScannerVisible(true)} activeOpacity={0.85}>
          <View style={styles.scanIconCircle}>
            <Ionicons name="scan" size={44} color={colors.textDark} />
          </View>
          <Text style={styles.primaryScanText}>SCAN ASSET QR</Text>
          <Text style={styles.primaryScanSub}>Tap to open camera and verify asset pass</Text>
        </TouchableOpacity>

        {/* KPI Row */}
        <View style={styles.kpiRow}>
          <View style={[styles.kpiCard, styles.kpiOutside]}>
            <Text style={[styles.kpiNum, { color: colors.amberLight }]}>{kpis.assetsOutside}</Text>
            <Text style={styles.kpiLabel}>ASSETS{'\n'}OUTSIDE</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={[styles.kpiNum, { color: colors.cyanLight }]}>{kpis.todayOut}</Text>
            <Text style={styles.kpiLabel}>TODAY'S{'\n'}OUT</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={[styles.kpiNum, { color: colors.emeraldLight }]}>{kpis.todayIn}</Text>
            <Text style={styles.kpiLabel}>TODAY'S{'\n'}IN</Text>
          </View>
        </View>

        {/* Nav Shortcuts */}
        <View style={styles.navRow}>
          <TouchableOpacity style={styles.navBtn} onPress={() => router.push('/(guard)/outside')} activeOpacity={0.75}>
            <Ionicons name="arrow-up-circle-outline" size={18} color={colors.amberLight} />
            <Text style={styles.navBtnText}>Currently Outside ({kpis.assetsOutside})</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navBtn} onPress={() => router.push('/(guard)/movements')} activeOpacity={0.75}>
            <Ionicons name="time-outline" size={18} color={colors.cyanLight} />
            <Text style={styles.navBtnText}>Today's Movement Log</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* QR Scanner */}
      <QrScannerModal visible={scannerVisible} onClose={() => setScannerVisible(false)} onScan={handleScan} title="Gate Scanner Terminal" />

      {/* Resolving Loader */}
      {resolving && (
        <Modal transparent visible>
          <View style={styles.overlay}>
            <ActivityIndicator size="large" color={colors.cyanLight} />
            <Text style={styles.overlayText}>Verifying QR tag at gate...</Text>
          </View>
        </Modal>
      )}

      {/* Error Modal */}
      {!!errorMessage && (
        <Modal transparent visible onRequestClose={() => setErrorMessage(null)}>
          <View style={styles.overlay}>
            <View style={styles.alertCard}>
              <Ionicons name="close-circle" size={44} color={colors.roseLight} />
              <Text style={styles.alertTitle}>Gate Verification Notice</Text>
              <Text style={styles.alertMsg}>{errorMessage}</Text>
              <TouchableOpacity style={styles.alertDismiss} onPress={() => setErrorMessage(null)}>
                <Text style={styles.alertDismissText}>Dismiss & Try Again</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* Asset Checkpoint Sheet */}
      {!!scannedAsset && (
        <Modal visible animationType="slide" onRequestClose={resetFormState}>
          <KeyboardAvoidingView style={styles.checkpointModal} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            {/* Header */}
            <View style={[styles.checkpointHeader, { paddingTop: Math.max(insets.top + 8, 20) }]}>
              <View>
                <Text style={styles.checkpointCode}>{scannedAsset.companyAssetId || scannedAsset.assetCode}</Text>
                <Text style={styles.checkpointSub}>{scannedAsset.manufacturer} {scannedAsset.model} ({scannedAsset.assetType})</Text>
              </View>
              <TouchableOpacity style={styles.closeBtn} onPress={resetFormState}>
                <Ionicons name="close" size={20} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.checkpointScroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <AssetDetailView asset={scannedAsset} roleCode="SECURITY_GUARD" onClose={resetFormState} />

              {/* OUT Form */}
              {movementAction === 'out_form' && (
                <View style={styles.formCard}>
                  <View style={styles.formHeader}>
                    <Ionicons name="arrow-up-circle" size={18} color={colors.amberLight} />
                    <Text style={[styles.formTitle, { color: colors.amberLight }]}>Record Asset Exit (OUT)</Text>
                  </View>
                  <Text style={styles.formLabel}>Destination / Client Site *</Text>
                  <TextInput style={styles.formInput} placeholder="e.g. Pune Plant / Client facility" placeholderTextColor={colors.textMuted} value={destination} onChangeText={setDestination} />
                  <Text style={styles.formLabel}>Operational Purpose *</Text>
                  <TextInput style={styles.formInput} placeholder="e.g. Testing, Maintenance, Commissioning" placeholderTextColor={colors.textMuted} value={purpose} onChangeText={setPurpose} />
                  <Text style={styles.formLabel}>Expected Return (YYYY-MM-DD)</Text>
                  <TextInput style={styles.formInput} placeholder="e.g. 2026-09-10 (Optional)" placeholderTextColor={colors.textMuted} value={expectedReturn} onChangeText={setExpectedReturn} />
                  <Text style={styles.formLabel}>Remarks (Optional)</Text>
                  <TextInput style={[styles.formInput, { height: 54 }]} placeholder="e.g. Power adapter & bag verified" placeholderTextColor={colors.textMuted} value={remarks} onChangeText={setRemarks} multiline />
                  {gates.length > 1 && (
                    <>
                      <Text style={styles.formLabel}>Gate</Text>
                      <View style={styles.gateRow}>
                        {gates.map((g) => (
                          <TouchableOpacity
                            key={g.id}
                            style={[styles.gateChip, selectedGateId === g.id && styles.gateChipActive]}
                            onPress={() => setSelectedGateId(g.id)}
                          >
                            <Text style={[styles.gateChipText, selectedGateId === g.id && styles.gateChipTextActive]}>{g.name}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </>
                  )}
                  <View style={styles.formActions}>
                    <TouchableOpacity style={styles.formCancel} onPress={() => setMovementAction('idle')}>
                      <Text style={styles.formCancelText}>Back</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.formSubmit, { backgroundColor: colors.amberLight }]} onPress={handleRecordOut} disabled={actionLoading}>
                      {actionLoading ? <ActivityIndicator color={colors.textDark} /> : <Text style={styles.formSubmitText}>Confirm Exit</Text>}
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* IN Form */}
              {movementAction === 'in_form' && (
                <View style={styles.formCard}>
                  <View style={styles.formHeader}>
                    <Ionicons name="arrow-down-circle" size={18} color={colors.emeraldLight} />
                    <Text style={[styles.formTitle, { color: colors.emeraldLight }]}>Record Asset Return (IN)</Text>
                  </View>
                  <Text style={styles.formLabel}>Condition Remarks (Optional)</Text>
                  <TextInput style={[styles.formInput, { height: 54 }]} placeholder="e.g. Returned in good condition" placeholderTextColor={colors.textMuted} value={remarks} onChangeText={setRemarks} multiline />
                  {gates.length > 1 && (
                    <>
                      <Text style={styles.formLabel}>Gate</Text>
                      <View style={styles.gateRow}>
                        {gates.map((g) => (
                          <TouchableOpacity
                            key={g.id}
                            style={[styles.gateChip, selectedGateId === g.id && styles.gateChipActive]}
                            onPress={() => setSelectedGateId(g.id)}
                          >
                            <Text style={[styles.gateChipText, selectedGateId === g.id && styles.gateChipTextActive]}>{g.name}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </>
                  )}
                  <View style={styles.formActions}>
                    <TouchableOpacity style={styles.formCancel} onPress={() => setMovementAction('idle')}>
                      <Text style={styles.formCancelText}>Back</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.formSubmit, { backgroundColor: colors.emeraldLight }]} onPress={handleRecordIn} disabled={actionLoading}>
                      {actionLoading ? <ActivityIndicator color={colors.textDark} /> : <Text style={styles.formSubmitText}>Confirm Return</Text>}
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Action Decision Buttons (when idle) */}
              {movementAction === 'idle' && (
                <View style={styles.actionRow}>
                  {scannedAsset.gatePresence === 'INSIDE' && (
                    <TouchableOpacity style={styles.actionBtnOut} onPress={() => setMovementAction('out_form')} activeOpacity={0.85}>
                      <Ionicons name="arrow-up-circle-outline" size={22} color={colors.textDark} />
                      <Text style={styles.actionBtnText}>Record EXIT (OUT)</Text>
                    </TouchableOpacity>
                  )}
                  {scannedAsset.gatePresence === 'OUTSIDE' && scannedAsset.openOutMovement && (
                    <TouchableOpacity style={styles.actionBtnIn} onPress={() => setMovementAction('in_form')} activeOpacity={0.85}>
                      <Ionicons name="arrow-down-circle-outline" size={22} color={colors.textDark} />
                      <Text style={styles.actionBtnText}>Record RETURN (IN)</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={styles.actionBtnCancel} onPress={resetFormState}>
                    <Text style={styles.actionBtnCancelText}>Close</Text>
                  </TouchableOpacity>
                </View>
              )}
              <View style={{ height: 40 }} />
            </ScrollView>
          </KeyboardAvoidingView>
        </Modal>
      )}

      {/* Success Modal */}
      {successData && (
        <MovementSuccessModal
          visible={successData.visible}
          type={successData.type}
          assetCode={successData.assetCode}
          assetName={successData.assetName}
          movementCode={successData.movementCode}
          gateName={successData.gateName}
          onScanNext={() => { setSuccessData(null); setScannerVisible(true); }}
          onClose={() => setSuccessData(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: 16, paddingBottom: 32, gap: 16 },
  primaryScanBtn: {
    backgroundColor: colors.card, borderRadius: 18, padding: 28,
    alignItems: 'center', borderWidth: 2, borderColor: colors.amberBorder, gap: 12,
  },
  scanIconCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.amberLight, alignItems: 'center', justifyContent: 'center',
  },
  primaryScanText: { fontSize: 22, fontWeight: '900', color: colors.textPrimary, letterSpacing: 1.5 },
  primaryScanSub: { fontSize: 13, color: colors.textSecondary, textAlign: 'center' },
  kpiRow: { flexDirection: 'row', gap: 10 },
  kpiCard: {
    flex: 1, backgroundColor: colors.card, borderRadius: 10, padding: 14,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center', gap: 6,
  },
  kpiOutside: { borderColor: colors.amberBorder, backgroundColor: colors.amberBg + '18' },
  kpiNum: { fontSize: 28, fontWeight: '900' },
  kpiLabel: { fontSize: 9, color: colors.textMuted, fontWeight: '700', letterSpacing: 0.5, textAlign: 'center' },
  navRow: { gap: 10 },
  navBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16,
    backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border,
  },
  navBtnText: { fontSize: 14, color: colors.textPrimary, fontWeight: '600' },
  overlay: { flex: 1, backgroundColor: 'rgba(3,3,9,0.85)', alignItems: 'center', justifyContent: 'center', gap: 14 },
  overlayText: { color: colors.cyanLight, fontSize: 14, fontWeight: '700' },
  alertCard: {
    backgroundColor: colors.card, borderRadius: 16, padding: 24, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', gap: 12, margin: 24,
  },
  alertTitle: { fontSize: 17, fontWeight: '700', color: colors.textPrimary, textAlign: 'center' },
  alertMsg: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  alertDismiss: {
    paddingVertical: 10, paddingHorizontal: 24, borderRadius: 8,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
  },
  alertDismissText: { color: colors.textPrimary, fontSize: 13, fontWeight: '600' },
  checkpointModal: { flex: 1, backgroundColor: colors.background },
  checkpointHeader: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 14,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  checkpointCode: { fontSize: 16, fontWeight: '800', color: colors.textPrimary, fontFamily: 'monospace' },
  checkpointSub: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  closeBtn: {
    width: 36, height: 36, borderRadius: 8, backgroundColor: colors.card,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center',
  },
  checkpointScroll: { paddingBottom: 40 },
  formCard: {
    margin: 16, backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 10,
  },
  formHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  formTitle: { fontSize: 14, fontWeight: '800' },
  formLabel: { fontSize: 11, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.5 },
  formInput: {
    backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 14, paddingVertical: 10, color: colors.textPrimary, fontSize: 13,
  },
  gateRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  gateChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
  },
  gateChipActive: { backgroundColor: colors.cyanGlow, borderColor: colors.borderCyan },
  gateChipText: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
  gateChipTextActive: { color: colors.cyanLight },
  formActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  formCancel: {
    flex: 0.4, paddingVertical: 13, borderRadius: 10, alignItems: 'center',
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
  },
  formCancelText: { fontSize: 14, color: colors.textSecondary, fontWeight: '600' },
  formSubmit: { flex: 0.6, paddingVertical: 13, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  formSubmitText: { fontSize: 14, fontWeight: '800', color: colors.textDark },
  actionRow: { margin: 16, gap: 12 },
  actionBtnOut: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    paddingVertical: 16, borderRadius: 14, backgroundColor: colors.amberLight,
  },
  actionBtnIn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    paddingVertical: 16, borderRadius: 14, backgroundColor: colors.emeraldLight,
  },
  actionBtnText: { fontSize: 16, fontWeight: '800', color: colors.textDark },
  actionBtnCancel: {
    paddingVertical: 13, borderRadius: 10, alignItems: 'center',
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
  },
  actionBtnCancelText: { fontSize: 14, color: colors.textSecondary, fontWeight: '600' },
});
