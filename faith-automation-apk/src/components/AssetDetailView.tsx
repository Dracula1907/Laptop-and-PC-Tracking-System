import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScannedAssetData } from '../types';
import { colors } from '../theme/colors';

interface AssetDetailViewProps {
  asset: ScannedAssetData;
  roleCode: string;
  onClose: () => void;
  actionButton?: React.ReactNode;
}

const Row: React.FC<{ label: string; value?: string | null; mono?: boolean }> = ({ label, value, mono }) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={[styles.rowValue, mono && styles.rowValueMono]} selectable>
      {value || '—'}
    </Text>
  </View>
);

const Section: React.FC<{ title: string; icon: string; children: React.ReactNode }> = ({ title, icon, children }) => (
  <View style={styles.section}>
    <View style={styles.sectionHeader}>
      <Ionicons name={icon as any} size={14} color={colors.cyanLight} />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
    <View style={styles.sectionBody}>{children}</View>
  </View>
);

export const AssetDetailView: React.FC<AssetDetailViewProps> = ({ asset, roleCode, onClose, actionButton }) => {
  const isAdmin = roleCode === 'ADMIN';
  const isManager = roleCode === 'MANAGER';
  const isGuard = roleCode === 'SECURITY_GUARD';

  const presenceColor = asset.gatePresence === 'OUTSIDE' ? colors.amberLight : colors.emeraldLight;
  const presenceBg = asset.gatePresence === 'OUTSIDE' ? colors.amberBg : colors.emeraldBg;
  const presenceBorder = asset.gatePresence === 'OUTSIDE' ? colors.amberBorder : colors.emeraldBorder;

  return (
    <View style={styles.container}>
      {/* Asset Header */}
      <View style={styles.assetHeader}>
        <View style={styles.assetHeaderLeft}>
          <View style={[styles.presenceBadge, { backgroundColor: presenceBg, borderColor: presenceBorder }]}>
            <Text style={[styles.presenceText, { color: presenceColor }]}>
              {asset.gatePresence === 'OUTSIDE' ? '⚠ OUTSIDE' : '✓ INSIDE'}
            </Text>
          </View>
          <Text style={styles.assetName} numberOfLines={2}>{asset.assetName}</Text>
          <Text style={styles.assetCode}>{asset.assetCode}</Text>
        </View>
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Ionicons name="close" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Basic Identity */}
        <Section title="Asset Identity" icon="barcode-outline">
          <Row label="Asset Type" value={asset.assetType} />
          <Row label="Manufacturer" value={asset.manufacturer} />
          <Row label="Model" value={asset.model} />
          <Row label="Serial Number" value={asset.serialNumber} mono />
          {asset.companyAssetId && <Row label="Company Asset ID" value={asset.companyAssetId} mono />}
        </Section>

        {/* Allocation */}
        <Section title="Allocation" icon="person-outline">
          <Row label="Current Holder" value={asset.currentHolder} />
          <Row label="Department" value={asset.department} />
          <Row label="Location" value={asset.location} />
        </Section>

        {/* Gate State */}
        <Section title="Gate Presence" icon="shield-checkmark-outline">
          <Row label="Current State" value={asset.gatePresence} />
          {asset.openOutMovement && (
            <>
              <View style={styles.movementWarning}>
                <Ionicons name="warning-outline" size={14} color={colors.amberLight} />
                <Text style={styles.movementWarningText}>Active OUT Movement</Text>
              </View>
              <Row label="Movement Code" value={asset.openOutMovement.movementCode} mono />
              <Row label="Out Since" value={new Date(asset.openOutMovement.movementDateTime).toLocaleString()} />
              <Row label="Gate" value={asset.openOutMovement.gateName} />
              <Row label="Destination" value={asset.openOutMovement.destination} />
              <Row label="Purpose" value={asset.openOutMovement.purpose} />
              {asset.openOutMovement.expectedReturn && (
                <Row label="Expected Return" value={new Date(asset.openOutMovement.expectedReturn).toLocaleString()} />
              )}
              <Row label="Recorded By" value={asset.openOutMovement.guardName} />
            </>
          )}
        </Section>

        {/* Full details for Admin/Manager only */}
        {(isAdmin || isManager) && asset.fullDetails && (
          <>
            <Section title="Status" icon="information-circle-outline">
              <Row label="Asset Status" value={asset.fullDetails.status} />
              <Row label="Allocation Status" value={asset.fullDetails.allocationStatus} />
              <Row label="Criticality" value={asset.fullDetails.criticality} />
            </Section>

            {(isAdmin) && asset.fullDetails.specifications && (
              <Section title="Hardware & Network" icon="hardware-chip-outline">
                <Row label="CPU" value={asset.fullDetails.specifications.cpu} />
                <Row label="RAM" value={asset.fullDetails.specifications.ram} />
                <Row label="Storage" value={asset.fullDetails.specifications.storage} />
                <Row label="Monitor" value={asset.fullDetails.specifications.monitor} />
                <Row label="LAN IP" value={asset.fullDetails.specifications.lanIp} mono />
                <Row label="MAC Address" value={asset.fullDetails.specifications.lanMacAddress} mono />
              </Section>
            )}

            {asset.fullDetails.warrantyEnd && (
              <Section title="Warranty" icon="shield-outline">
                <Row label="Warranty End" value={asset.fullDetails.warrantyEnd ? new Date(asset.fullDetails.warrantyEnd).toLocaleDateString() : null} />
              </Section>
            )}
          </>
        )}

        {actionButton && <View style={styles.actionArea}>{actionButton}</View>}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  assetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  assetHeaderLeft: { flex: 1, gap: 6 },
  presenceBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  presenceText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  assetName: { fontSize: 18, fontWeight: '800', color: colors.textPrimary, lineHeight: 24 },
  assetCode: { fontSize: 12, color: colors.textSecondary, fontFamily: 'monospace' },
  closeBtn: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center', marginLeft: 12,
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 12 },
  section: {
    borderRadius: 10, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.card, overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: colors.cardElevated, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: colors.cyanLight, letterSpacing: 0.4 },
  sectionBody: { paddingVertical: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
    gap: 12,
  },
  rowLabel: { fontSize: 12, color: colors.textSecondary, flex: 0.45 },
  rowValue: { fontSize: 12, color: colors.textPrimary, fontWeight: '600', flex: 0.55, textAlign: 'right' },
  rowValueMono: { fontFamily: 'monospace', fontSize: 11 },
  movementWarning: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginHorizontal: 14, marginVertical: 8,
    paddingVertical: 8, paddingHorizontal: 10,
    borderRadius: 6, backgroundColor: colors.amberBg, borderWidth: 1, borderColor: colors.amberBorder,
  },
  movementWarningText: { fontSize: 12, color: colors.amberLight, fontWeight: '700' },
  actionArea: { marginTop: 8 },
});
