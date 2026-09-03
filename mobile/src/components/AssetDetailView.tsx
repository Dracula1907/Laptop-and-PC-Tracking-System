import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScannedAssetData, UserRole } from '../types';
import { colors } from '../theme/colors';
import { AccordionSection } from './AccordionSection';

interface AssetDetailViewProps {
  asset: ScannedAssetData;
  role: UserRole;
}

export const AssetDetailView: React.FC<AssetDetailViewProps> = ({ asset, role }) => {
  const isSecurityGuard = role === 'SECURITY_GUARD';
  const full = asset.fullDetails;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Top Banner: Gate State */}
      <View
        style={[
          styles.stateBanner,
          asset.gatePresence === 'OUTSIDE' ? styles.stateOutside : styles.stateInside,
        ]}
      >
        <Ionicons
          name={asset.gatePresence === 'OUTSIDE' ? 'arrow-up-circle' : 'shield-checkmark'}
          size={22}
          color={asset.gatePresence === 'OUTSIDE' ? colors.amber : colors.emerald}
        />
        <View style={styles.stateTextGroup}>
          <Text style={styles.stateTitle}>
            PHYSICAL PRESENCE: {asset.gatePresence}
          </Text>
          <Text style={styles.stateSubtitle}>
            {asset.gatePresence === 'OUTSIDE'
              ? 'Asset is currently recorded as outside company premises'
              : 'Verified safely inside company premises'}
          </Text>
        </View>
      </View>

      {/* Primary Asset Identification Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="laptop-outline" size={18} color={colors.cyan} />
          <Text style={styles.cardTitle}>Asset Identity & Custody</Text>
        </View>

        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={styles.label}>Asset ID / Code</Text>
            <Text style={[styles.value, styles.codeText]}>
              {asset.companyAssetId || asset.assetCode}
            </Text>
          </View>
          <View style={styles.col}>
            <Text style={styles.label}>Asset Type</Text>
            <Text style={styles.value}>{asset.assetType}</Text>
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={styles.label}>Manufacturer & Model</Text>
            <Text style={styles.value}>
              {asset.manufacturer ? `${asset.manufacturer} ` : ''}{asset.model}
            </Text>
          </View>
          {asset.serialNumber && asset.serialNumber !== 'N/A' && (
            <View style={styles.col}>
              <Text style={styles.label}>Serial Number</Text>
              <Text style={[styles.value, styles.codeText]}>{asset.serialNumber}</Text>
            </View>
          )}
        </View>

        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={styles.label}>Current Holder</Text>
            <Text style={styles.valueHighlight}>
              {asset.currentHolder} {asset.employeeCode ? `(${asset.employeeCode})` : ''}
            </Text>
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={styles.label}>Department</Text>
            <Text style={styles.value}>{asset.department}</Text>
          </View>
          <View style={styles.col}>
            <Text style={styles.label}>Location</Text>
            <Text style={styles.value}>{asset.location}</Text>
          </View>
        </View>
      </View>

      {/* If Guard and Outside, show Open OUT Movement Info */}
      {asset.gatePresence === 'OUTSIDE' && asset.openOutMovement && (
        <View style={[styles.card, styles.movementCard]}>
          <View style={styles.cardHeader}>
            <Ionicons name="exit-outline" size={18} color={colors.amber} />
            <Text style={[styles.cardTitle, { color: colors.amber }]}>Active Exit Record</Text>
          </View>
          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>Movement Code</Text>
              <Text style={[styles.value, styles.codeText]}>{asset.openOutMovement.movementCode}</Text>
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>Exit Gate</Text>
              <Text style={styles.value}>{asset.openOutMovement.gateName}</Text>
            </View>
          </View>
          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>Destination</Text>
              <Text style={styles.value}>{asset.openOutMovement.destination}</Text>
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>Purpose</Text>
              <Text style={styles.value}>{asset.openOutMovement.purpose}</Text>
            </View>
          </View>
          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>Exit Time</Text>
              <Text style={styles.value}>
                {new Date(asset.openOutMovement.movementDateTime).toLocaleString()}
              </Text>
            </View>
            {asset.openOutMovement.expectedReturn && (
              <View style={styles.col}>
                <Text style={styles.label}>Expected Return</Text>
                <Text style={[styles.value, { color: colors.amber }]}>
                  {new Date(asset.openOutMovement.expectedReturn).toLocaleDateString()}
                </Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* ADMIN & MANAGER ONLY: Expandable Technical & Lifecycle Sections */}
      {!isSecurityGuard && full && (
        <View style={styles.accordionContainer}>
          {/* Classification & Allocation */}
          <AccordionSection
            title="Classification & Allocation"
            icon="ribbon-outline"
            badge={full.allocationStatus || 'ALLOCATED'}
            badgeColor={colors.cyan}
            initialExpanded={true}
          >
            <View style={styles.row}>
              <View style={styles.col}>
                <Text style={styles.label}>Lifecycle Status</Text>
                <Text style={styles.valueHighlight}>{full.status || 'AVAILABLE'}</Text>
              </View>
              <View style={styles.col}>
                <Text style={styles.label}>Allocation Status</Text>
                <Text style={styles.value}>{full.allocationStatus || 'ALLOCATED'}</Text>
              </View>
              <View style={styles.col}>
                <Text style={styles.label}>Criticality</Text>
                <Text style={styles.value}>{full.criticality || 'MEDIUM'}</Text>
              </View>
            </View>
          </AccordionSection>

          {/* Hardware Specifications */}
          <AccordionSection
            title="Hardware Specifications"
            icon="hardware-chip-outline"
            badge={full.specifications?.cpu ? 'Configured' : undefined}
          >
            <View style={styles.row}>
              <View style={styles.col}>
                <Text style={styles.label}>Processor (CPU)</Text>
                <Text style={styles.value}>{full.specifications?.cpu || '—'}</Text>
              </View>
              <View style={styles.col}>
                <Text style={styles.label}>RAM Memory</Text>
                <Text style={styles.value}>{full.specifications?.ram || '—'}</Text>
              </View>
            </View>
            <View style={styles.row}>
              <View style={styles.col}>
                <Text style={styles.label}>Storage</Text>
                <Text style={styles.value}>{full.specifications?.storage || '—'}</Text>
              </View>
              <View style={styles.col}>
                <Text style={styles.label}>Monitor</Text>
                <Text style={styles.value}>{full.specifications?.monitor || 'Integrated Display'}</Text>
              </View>
            </View>
          </AccordionSection>

          {/* Network Configuration */}
          <AccordionSection
            title="Network Configuration"
            icon="wifi-outline"
            badge={full.specifications?.lanIp || undefined}
            badgeColor={colors.emerald}
          >
            <View style={styles.row}>
              <View style={styles.col}>
                <Text style={styles.label}>LAN IP Address</Text>
                <Text style={[styles.value, styles.ipText]}>
                  {full.specifications?.lanIp || 'Not assigned'}
                </Text>
              </View>
              <View style={styles.col}>
                <Text style={styles.label}>MAC Address</Text>
                <Text style={[styles.value, styles.codeText]}>
                  {full.specifications?.lanMacAddress || 'Not registered'}
                </Text>
              </View>
            </View>
          </AccordionSection>

          {/* Warranty & Lifecycle */}
          <AccordionSection
            title="Warranty Coverage"
            icon="shield-outline"
            badge={full.warrantyEnd ? 'Active' : 'Expired'}
            badgeColor={full.warrantyEnd ? colors.emerald : colors.rose}
          >
            <View style={styles.row}>
              <View style={styles.col}>
                <Text style={styles.label}>Warranty End Date</Text>
                <Text style={styles.value}>
                  {full.warrantyEnd ? new Date(full.warrantyEnd).toLocaleDateString() : 'No active warranty recorded'}
                </Text>
              </View>
              <View style={styles.col}>
                <Text style={styles.label}>Purchase Date</Text>
                <Text style={styles.value}>
                  {full.purchaseDate ? new Date(full.purchaseDate).toLocaleDateString() : '—'}
                </Text>
              </View>
            </View>
          </AccordionSection>

          {/* Gate Movement History */}
          {full.gateMovements && full.gateMovements.length > 0 && (
            <AccordionSection
              title="Recent Physical Gate Movements"
              icon="swap-vertical-outline"
              badge={`${full.gateMovements.length} logs`}
            >
              <View style={styles.movementList}>
                {full.gateMovements.slice(0, 4).map((m: any) => {
                  const isOut = m.movementType === 'OUT';
                  return (
                    <View key={m.id} style={styles.historyRow}>
                      <View style={styles.historyLeft}>
                        <Ionicons
                          name={isOut ? 'arrow-up-circle' : 'arrow-down-circle'}
                          size={16}
                          color={isOut ? colors.amber : colors.emerald}
                        />
                        <View>
                          <Text style={[styles.historyType, { color: isOut ? colors.amber : colors.emerald }]}>
                            {m.movementType} ({m.movementCode})
                          </Text>
                          <Text style={styles.historyDest} numberOfLines={1}>
                            {m.destination || m.purpose || 'Premises passage'}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.historyTime}>
                        {new Date(m.movementDateTime).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </AccordionSection>
          )}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 12,
    paddingBottom: 40,
  },
  stateBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  stateInside: {
    backgroundColor: colors.emeraldBg,
    borderColor: colors.emeraldBorder,
  },
  stateOutside: {
    backgroundColor: colors.amberBg,
    borderColor: colors.amberBorder,
  },
  stateTextGroup: {
    flex: 1,
  },
  stateTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },
  stateSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  movementCard: {
    borderColor: colors.amberBorder,
    backgroundColor: 'rgba(245, 158, 11, 0.05)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 8,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  col: {
    flex: 1,
  },
  label: {
    fontSize: 10,
    color: colors.textMuted,
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  value: {
    fontSize: 12,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  valueHighlight: {
    fontSize: 12,
    color: colors.cyan,
    fontWeight: '700',
  },
  codeText: {
    fontFamily: 'monospace',
    color: colors.cyanLight,
  },
  ipText: {
    fontFamily: 'monospace',
    color: colors.emeraldLight,
    fontWeight: '600',
  },
  accordionContainer: {
    marginTop: 4,
  },
  movementList: {
    gap: 8,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 8,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  historyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  historyType: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  historyDest: {
    fontSize: 10,
    color: colors.textSecondary,
    maxWidth: 180,
  },
  historyTime: {
    fontSize: 10,
    color: colors.textMuted,
    fontFamily: 'monospace',
  },
});
