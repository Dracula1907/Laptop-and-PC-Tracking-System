import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';

interface QrScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onScan: (token: string) => void;
  title?: string;
}

const { width: SCREEN_W } = Dimensions.get('window');
const FRAME_SIZE = SCREEN_W * 0.65;

export const QrScannerModal: React.FC<QrScannerModalProps> = ({
  visible,
  onClose,
  onScan,
  title = 'Scan Asset QR',
}) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const lastScanRef = useRef<string | null>(null);
  const insets = useSafeAreaInsets();

  const handleBarCodeScanned = useCallback(
    ({ data }: { data: string }) => {
      if (scanned || data === lastScanRef.current) return;
      lastScanRef.current = data;
      setScanned(true);
      setScanError(null);
      onScan(data);
    },
    [scanned, onScan]
  );

  const handleClose = () => {
    setScanned(false);
    setScanError(null);
    lastScanRef.current = null;
    onClose();
  };

  const handleRescan = () => {
    setScanned(false);
    setScanError(null);
    lastScanRef.current = null;
  };

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent onRequestClose={handleClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top + 12, 20) }]}>
          <View style={styles.headerLeft}>
            <Ionicons name="qr-code-outline" size={20} color={colors.cyanLight} />
            <Text style={styles.headerTitle}>{title}</Text>
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
            <Ionicons name="close" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Camera / Permission area */}
        <View style={styles.cameraWrap}>
          {!permission ? (
            <View style={styles.centeredContent}>
              <ActivityIndicator size="large" color={colors.cyanLight} />
              <Text style={styles.permissionText}>Checking camera permission...</Text>
            </View>
          ) : !permission.granted ? (
            <View style={styles.centeredContent}>
              <Ionicons name="camera-outline" size={64} color={colors.textMuted} />
              <Text style={styles.permissionTitle}>Camera Access Required</Text>
              <Text style={styles.permissionText}>
                Grant camera permission to scan asset QR identity tags.
              </Text>
              <TouchableOpacity style={styles.grantBtn} onPress={requestPermission}>
                <Text style={styles.grantBtnText}>Grant Camera Access</Text>
              </TouchableOpacity>
            </View>
          ) : scanned ? (
            <View style={styles.centeredContent}>
              <View style={styles.scannedIcon}>
                <Ionicons name="checkmark-circle" size={64} color={colors.emeraldLight} />
              </View>
              <Text style={styles.scannedText}>QR Detected</Text>
              <Text style={styles.scannedSubtext}>Processing asset lookup...</Text>
              <TouchableOpacity style={styles.rescanBtn} onPress={handleRescan}>
                <Ionicons name="refresh-outline" size={16} color={colors.textSecondary} />
                <Text style={styles.rescanBtnText}>Scan Different QR</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <CameraView
                style={StyleSheet.absoluteFillObject}
                facing="back"
                onBarcodeScanned={handleBarCodeScanned}
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              />
              {/* Viewfinder Overlay */}
              <View style={styles.overlay}>
                <View style={styles.overlayTop} />
                <View style={styles.overlayMiddle}>
                  <View style={styles.overlaySide} />
                  <View style={styles.frame}>
                    <View style={[styles.corner, styles.cornerTL]} />
                    <View style={[styles.corner, styles.cornerTR]} />
                    <View style={[styles.corner, styles.cornerBL]} />
                    <View style={[styles.corner, styles.cornerBR]} />
                  </View>
                  <View style={styles.overlaySide} />
                </View>
                <View style={styles.overlayBottom}>
                  <Text style={styles.scanHint}>Position QR code within the frame</Text>
                  <Text style={styles.scanHintSub}>Faith Automation Asset Identity Tag</Text>
                </View>
              </View>
            </>
          )}
        </View>

        {/* Footer */}
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom + 12, 20) }]}>
          {scanError && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={16} color={colors.roseLight} />
              <Text style={styles.errorText}>{scanError}</Text>
            </View>
          )}
          <TouchableOpacity style={styles.cancelBtn} onPress={handleClose}>
            <Text style={styles.cancelBtnText}>Cancel Scan</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const OVERLAY_COLOR = 'rgba(3, 3, 9, 0.75)';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  closeBtn: {
    width: 36, height: 36, borderRadius: 8,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  cameraWrap: { flex: 1, overflow: 'hidden' },
  centeredContent: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  permissionTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, textAlign: 'center' },
  permissionText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  grantBtn: {
    marginTop: 8, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 10,
    backgroundColor: colors.cyanGlow, borderWidth: 1, borderColor: colors.borderCyan,
  },
  grantBtnText: { fontSize: 14, fontWeight: '700', color: colors.cyanLight },
  scannedIcon: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: colors.emeraldBg, borderWidth: 1, borderColor: colors.emeraldBorder,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  scannedText: { fontSize: 20, fontWeight: '800', color: colors.emeraldLight },
  scannedSubtext: { fontSize: 13, color: colors.textSecondary },
  rescanBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 20,
    paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
  },
  rescanBtnText: { fontSize: 13, color: colors.textSecondary, fontWeight: '600' },
  overlay: { ...StyleSheet.absoluteFillObject, flexDirection: 'column' },
  overlayTop: { flex: 1, backgroundColor: OVERLAY_COLOR },
  overlayMiddle: { height: FRAME_SIZE, flexDirection: 'row' },
  overlaySide: { flex: 1, backgroundColor: OVERLAY_COLOR },
  frame: { width: FRAME_SIZE, height: FRAME_SIZE },
  overlayBottom: { flex: 1.2, backgroundColor: OVERLAY_COLOR, alignItems: 'center', justifyContent: 'center', gap: 4 },
  scanHint: { fontSize: 14, color: colors.textPrimary, fontWeight: '600', textAlign: 'center' },
  scanHintSub: { fontSize: 12, color: colors.textSecondary, textAlign: 'center' },
  corner: { position: 'absolute', width: 24, height: 24, borderColor: colors.cyanBright, borderWidth: 3 },
  cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 4 },
  cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 4 },
  cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 4 },
  cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 4 },
  footer: {
    backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border,
    paddingHorizontal: 20, paddingTop: 16, gap: 12,
  },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12,
    borderRadius: 8, backgroundColor: colors.roseBg, borderWidth: 1, borderColor: colors.roseBorder,
  },
  errorText: { flex: 1, fontSize: 13, color: colors.roseLight },
  cancelBtn: {
    paddingVertical: 14, borderRadius: 10, alignItems: 'center',
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
  },
  cancelBtnText: { fontSize: 15, fontWeight: '700', color: colors.textSecondary },
});
