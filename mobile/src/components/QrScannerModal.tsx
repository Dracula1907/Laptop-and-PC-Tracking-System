import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
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
  subtitle?: string;
}

export const QrScannerModal: React.FC<QrScannerModalProps> = ({
  visible,
  onClose,
  onScan,
  title = 'Scan Asset QR Tag',
  subtitle = 'Align QR code inside the target reticle',
}) => {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [torch, setTorch] = useState(false);
  const [manualToken, setManualToken] = useState('');
  const [showManual, setShowManual] = useState(false);
  const lastScanTimeRef = useRef<number>(0);

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    const now = Date.now();
    // Debounce duplicate reads within 1500ms
    if (scanned || now - lastScanTimeRef.current < 1500 || !data) return;
    lastScanTimeRef.current = now;
    setScanned(true);

    onScan(data.trim());

    // Reset scanned state after 2 seconds
    setTimeout(() => {
      setScanned(false);
    }, 2000);
  };

  const handleManualSubmit = () => {
    if (!manualToken.trim()) return;
    onScan(manualToken.trim());
    setManualToken('');
    setShowManual(false);
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Top Navigation Bar with Dynamic Safe Insets */}
        <View style={[styles.topBar, { paddingTop: Math.max(insets.top + 8, 20) }]}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel="Close scanner"
          >
            <Ionicons name="close" size={22} color={colors.textPrimary} />
          </TouchableOpacity>

          <View style={styles.titleGroup}>
            <Text style={styles.titleText}>{title}</Text>
            <Text style={styles.subtitleText}>{subtitle}</Text>
          </View>

          <TouchableOpacity
            style={[styles.iconButton, torch && styles.iconButtonActive]}
            onPress={() => setTorch(!torch)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel="Toggle flash"
          >
            <Ionicons
              name={torch ? 'flash' : 'flash-outline'}
              size={20}
              color={torch ? colors.cyan : colors.textPrimary}
            />
          </TouchableOpacity>
        </View>

        {/* Camera or Permission View */}
        {!permission ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.cyan} />
            <Text style={styles.infoText}>Requesting camera permission...</Text>
          </View>
        ) : !permission.granted ? (
          <View style={styles.permissionBox}>
            <Ionicons name="camera-outline" size={48} color={colors.cyan} />
            <Text style={styles.permTitle}>Camera Access Required</Text>
            <Text style={styles.permDesc}>
              Faith Automation IT Inventory requires camera access to scan physical laptop and asset QR tags at security gates.
            </Text>
            <TouchableOpacity style={styles.primaryButton} onPress={requestPermission}>
              <Text style={styles.primaryButtonText}>Grant Camera Permission</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => setShowManual(true)}>
              <Text style={styles.secondaryButtonText}>Enter Token Manually</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.cameraContainer}>
            <CameraView
              style={StyleSheet.absoluteFillObject}
              enableTorch={torch}
              barcodeScannerSettings={{
                barcodeTypes: ['qr'],
              }}
              onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
            />

            {/* Darkened Overlay & Target Reticle */}
            <View style={styles.overlay}>
              <View style={[styles.reticle, scanned && styles.reticleScanned]}>
                {/* Corner Accents */}
                <View style={[styles.corner, styles.topLeft, scanned && styles.cornerScanned]} />
                <View style={[styles.corner, styles.topRight, scanned && styles.cornerScanned]} />
                <View style={[styles.corner, styles.bottomLeft, scanned && styles.cornerScanned]} />
                <View style={[styles.corner, styles.bottomRight, scanned && styles.cornerScanned]} />

                {scanned && (
                  <View style={styles.scannedIndicator}>
                    <ActivityIndicator size="small" color={colors.cyan} />
                    <Text style={styles.scannedText}>Verifying QR Tag...</Text>
                  </View>
                )}
              </View>

              <Text style={styles.guideText}>FAITH AUTOMATION ASSET QR</Text>
            </View>
          </View>
        )}

        {/* Bottom Bar with Dynamic Safe Insets */}
        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom + 8, 16) }]}>
          {showManual ? (
            <View style={styles.manualInputGroup}>
              <TextInput
                style={styles.input}
                placeholder="Enter QR token (FAITH-QR-...)"
                placeholderTextColor={colors.textMuted}
                value={manualToken}
                onChangeText={setManualToken}
                autoCapitalize="characters"
                autoCorrect={false}
              />
              <TouchableOpacity style={styles.submitButton} onPress={handleManualSubmit}>
                <Ionicons name="arrow-forward" size={20} color={colors.textDark} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelManual} onPress={() => setShowManual(false)}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.manualButton} onPress={() => setShowManual(true)}>
              <Ionicons name="keypad-outline" size={16} color={colors.cyan} />
              <Text style={styles.manualButtonText}>Enter QR Token Manually</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonActive: {
    backgroundColor: colors.cyanGlow,
    borderColor: colors.cyan,
  },
  titleGroup: {
    alignItems: 'center',
  },
  titleText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  subtitleText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(10, 13, 20, 0.45)',
  },
  reticle: {
    width: 250,
    height: 250,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reticleScanned: {
    borderColor: colors.cyan,
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: colors.cyan,
  },
  cornerScanned: {
    borderColor: colors.emerald,
  },
  topLeft: {
    top: -2,
    left: -2,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 10,
  },
  topRight: {
    top: -2,
    right: -2,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 10,
  },
  bottomLeft: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 10,
  },
  bottomRight: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 10,
  },
  scannedIndicator: {
    backgroundColor: 'rgba(10, 13, 20, 0.92)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.cyan,
  },
  scannedText: {
    color: colors.cyan,
    fontSize: 12,
    fontWeight: '700',
  },
  guideText: {
    color: colors.cyan,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 24,
    backgroundColor: 'rgba(10, 13, 20, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.borderCyan,
  },
  bottomBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  manualButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  manualButtonText: {
    color: colors.cyan,
    fontSize: 13,
    fontWeight: '600',
  },
  manualInputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    height: 44,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 8,
    paddingHorizontal: 12,
    color: colors.textPrimary,
    fontFamily: 'monospace',
    fontSize: 12,
  },
  submitButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: colors.cyan,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelManual: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  infoText: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  permissionBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 14,
  },
  permTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  permDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 8,
  },
  primaryButton: {
    backgroundColor: colors.cyan,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: colors.textDark,
    fontWeight: '700',
    fontSize: 14,
  },
  secondaryButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  secondaryButtonText: {
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 13,
  },
});
