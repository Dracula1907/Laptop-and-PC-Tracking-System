import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

interface MovementSuccessModalProps {
  visible: boolean;
  type: 'OUT' | 'IN';
  assetCode: string;
  assetName: string;
  movementCode?: string;
  gateName?: string;
  time?: string;
  onScanNext: () => void;
  onClose: () => void;
}

export const MovementSuccessModal: React.FC<MovementSuccessModalProps> = ({
  visible,
  type,
  assetCode,
  assetName,
  movementCode,
  gateName = 'Main Security Gate',
  time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  onScanNext,
  onClose,
}) => {
  if (!visible) return null;

  const isOut = type === 'OUT';
  const themeColor = isOut ? colors.amber : colors.emerald;
  const themeBg = isOut ? colors.amberBg : colors.emeraldBg;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Top Check Icon */}
          <View style={[styles.iconCircle, { backgroundColor: themeBg, borderColor: themeColor }]}>
            <Ionicons name="checkmark-sharp" size={36} color={themeColor} />
          </View>

          <Text style={[styles.title, { color: themeColor }]}>
            {isOut ? 'ASSET EXIT RECORDED' : 'ASSET ENTRY RECORDED'}
          </Text>

          <View style={styles.detailsCard}>
            <View style={styles.row}>
              <Text style={styles.label}>ASSET ID</Text>
              <Text style={styles.valueCode}>{assetCode}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>MODEL / DEVICE</Text>
              <Text style={styles.value}>{assetName}</Text>
            </View>
            {movementCode && (
              <View style={styles.row}>
                <Text style={styles.label}>PASS CODE</Text>
                <Text style={styles.valueMono}>{movementCode}</Text>
              </View>
            )}
            <View style={styles.row}>
              <Text style={styles.label}>GATE / CHECKPOINT</Text>
              <Text style={styles.value}>{gateName}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>RECORDED TIME</Text>
              <Text style={styles.value}>{time}</Text>
            </View>
          </View>

          {/* Primary Action: SCAN NEXT */}
          <TouchableOpacity
            style={[styles.btnScanNext, { backgroundColor: colors.cyan }]}
            onPress={onScanNext}
            activeOpacity={0.85}
          >
            <Ionicons name="scan" size={20} color={colors.textDark} />
            <Text style={styles.btnScanNextText}>SCAN NEXT ASSET</Text>
          </TouchableOpacity>

          {/* Secondary Action: Return to Dashboard */}
          <TouchableOpacity style={styles.btnClose} onPress={onClose} activeOpacity={0.7}>
            <Text style={styles.btnCloseText}>Done (Back to Gate)</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 7, 12, 0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    width: '100%',
    maxWidth: 360,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
    textAlign: 'center',
  },
  detailsCard: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginVertical: 16,
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  label: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 12,
    color: colors.textPrimary,
    fontWeight: '600',
    maxWidth: '65%',
    textAlign: 'right',
  },
  valueCode: {
    fontSize: 13,
    color: colors.cyan,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  valueMono: {
    fontSize: 11,
    color: colors.textSecondary,
    fontFamily: 'monospace',
  },
  btnScanNext: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: colors.cyan,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  btnScanNextText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textDark,
    letterSpacing: 0.8,
  },
  btnClose: {
    marginTop: 12,
    paddingVertical: 8,
  },
  btnCloseText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
});
