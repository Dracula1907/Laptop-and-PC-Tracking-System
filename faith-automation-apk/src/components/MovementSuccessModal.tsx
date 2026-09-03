import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

interface MovementSuccessModalProps {
  visible: boolean;
  type: 'OUT' | 'IN';
  assetCode: string;
  assetName: string;
  movementCode?: string;
  gateName?: string;
  onScanNext: () => void;
  onClose: () => void;
}

export const MovementSuccessModal: React.FC<MovementSuccessModalProps> = ({
  visible,
  type,
  assetCode,
  assetName,
  movementCode,
  gateName,
  onScanNext,
  onClose,
}) => {
  const isOut = type === 'OUT';

  return (
    <Modal visible={visible} animationType="fade" transparent statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Icon */}
          <View style={[styles.iconRing, isOut ? styles.iconRingOut : styles.iconRingIn]}>
            <Ionicons
              name={isOut ? 'exit-outline' : 'enter-outline'}
              size={40}
              color={isOut ? colors.amberLight : colors.emeraldLight}
            />
          </View>

          {/* Title */}
          <Text style={styles.title}>
            {isOut ? 'Asset Recorded OUT' : 'Asset Returned IN'}
          </Text>
          <Text style={styles.subtitle}>
            {isOut
              ? 'Movement recorded. Asset is now OUTSIDE.'
              : 'Confirmed. Asset is now back INSIDE.'}
          </Text>

          {/* Details */}
          <View style={styles.details}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Asset</Text>
              <Text style={styles.detailValue}>{assetName}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Code</Text>
              <Text style={[styles.detailValue, styles.mono]}>{assetCode}</Text>
            </View>
            {movementCode && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Movement</Text>
                <Text style={[styles.detailValue, styles.mono]}>{movementCode}</Text>
              </View>
            )}
            {gateName && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Gate</Text>
                <Text style={styles.detailValue}>{gateName}</Text>
              </View>
            )}
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.scanNextBtn} onPress={onScanNext}>
              <Ionicons name="qr-code-outline" size={18} color={colors.textDark} />
              <Text style={styles.scanNextText}>Scan Next Asset</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
              <Text style={styles.doneBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(3, 3, 9, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 24,
    alignItems: 'center',
    gap: 16,
  },
  iconRing: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2,
  },
  iconRingOut: { backgroundColor: colors.amberBg, borderColor: colors.amberBorder },
  iconRingIn: { backgroundColor: colors.emeraldBg, borderColor: colors.emeraldBorder },
  title: { fontSize: 20, fontWeight: '800', color: colors.textPrimary, textAlign: 'center' },
  subtitle: { fontSize: 13, color: colors.textSecondary, textAlign: 'center' },
  details: {
    width: '100%', borderRadius: 8, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface, overflow: 'hidden',
  },
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: 0.5, borderBottomColor: colors.border,
  },
  detailLabel: { fontSize: 12, color: colors.textSecondary },
  detailValue: { fontSize: 13, color: colors.textPrimary, fontWeight: '600' },
  mono: { fontFamily: 'monospace', fontSize: 11 },
  actions: { width: '100%', gap: 10 },
  scanNextBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: 10, backgroundColor: colors.cyanLight,
  },
  scanNextText: { fontSize: 15, fontWeight: '800', color: colors.textDark },
  doneBtn: {
    paddingVertical: 12, borderRadius: 10, alignItems: 'center',
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
  },
  doneBtnText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
});
