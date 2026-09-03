import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScannedAssetData, UserRole } from '../types';
import { colors } from '../theme/colors';

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
          size={20}
          color={asset.gatePresence === 'OUTSIDE' ? colors.amber : colors.emerald}
        />
        <View style={styles.stateTextGroup}>
          <Text style={styles.stateTitle}>
            PHYSICAL PRESENCE: {asset.gatePresence}
          </Text>
          <Text style={styles.stateSubtitle}>
            {asset.gatePresence === 'OUTSIDE'
              ? 'Asset is currently outside company premises'
              : 'Verified inside premises'}
          </Text>
        </View>
      </View>

      {/* Asset Identification Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="laptop-outline" size={18} color={colors.cyan} />
          <Text style={styles.cardTitle}>Asset Identity</Text>
        </View>

        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={styles.label}>Asset ID / Code</Text>
            <Text style={[styles.value, styles.codeText]}>{asset.assetCode}</Text>
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

      {/* If Guard and Outside, show Open OUT Movement info */}
      {asset.gatePresence === 'OUTSIDE' && asset.openOutMovement && (
        <View style={[styles.card, styles.movementCard]}>
          <View style={styles.cardHeader}>
            <Ionicons name="exit-outline" size={18} color={colors.amber} />
            <Text style={[styles.cardTitle, { color: colors.amber }]}>Open Exit Record</Text>
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

      {/* ADMIN & MANAGER ONLY: Rich Specifications, Network, and Lifecycle */}
      {!isSecurityGuard && full && (
        <>
          {/* Status & Governance */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="ribbon-outline" size={18} color={colors.cyan} />
              <Text style={styles.cardTitle}>Status & Classification</Text>
            </View>
            <View style={styles.row}>
              <View style={styles.col}>
                <Text style={styles.label}>Asset Status</Text>
                <Text style={styles.valueHighlight}>{full.status || 'AVAILABLE'}</Text>
              </View>
              <View style={styles.col}>
                <Text style={styles.label}>Allocation</Text>
                <Text style={styles.value}>{full.allocationStatus || 'ALLOCATED'}</Text>
              </View>
              <View style={styles.col}>
                <Text style={styles.label}>Criticality</Text>
                <Text style={styles.value}>{full.criticality || 'MEDIUM'}</Text>
              </View>
            </View>
          </View>

          {/* Hardware & Network */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="hardware-chip-outline" size={18} color={colors.cyan} />
              <Text style={styles.cardTitle}>Hardware & Network Specifications</Text>
            </View>
            <View style={styles.row}>
              <View style={styles.col}>
                <Text style={styles.label}>CPU</Text>
                <Text style={styles.value}>{full.specifications?.cpu || '—'}</Text>
              </View>
              <View style={styles.col}>
                <Text style={styles.label}>RAM</Text>
                <Text style={styles.value}>{full.specifications?.ram || '—'}</Text>
              </View>
              <View style={styles.col}>
                <Text style={styles.label}>Storage</Text>
                <Text style={styles.value}>{full.specifications?.storage || '—'}</Text>
              </View>
            </View>
            <View style={styles.row}>
              <View style={styles.col}>
                <Text style={styles.label}>LAN IP Address</Text>
                <Text style={[styles.value, styles.ipText]}>
                  {full.specifications?.lanIp || '—'}
                </Text>
              </View>
              <View style={styles.col}>
                <Text style={styles.label}>LAN MAC Address</Text>
                <Text style={[styles.value, styles.codeText]}>
                  {full.specifications?.lanMacAddress || '—'}
                </Text>
              </View>
            </View>
          </View>

          {/* Lifecycle & Warranty */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="shield-outline" size={18} color={colors.cyan} />
              <Text style={styles.cardTitle}>Warranty & Maintenance</Text>
            </View>
            <View style={styles.row}>
              <View style={styles.col}>
                <Text style={styles.label}>Warranty End Date</Text>
                <Text style={styles.value}>
                  {full.warrantyEnd ? new Date(full.warrantyEnd).toLocaleDateString() : 'No active warranty'}
                </Text>
              </View>
              <View style={styles.col}>
                <Text style={styles.label}>Maintenance Records</Text>
                <Text style={styles.value}>
                  {full.maintenance?.length ? `${full.maintenance.length} records` : 'None'}
                </Text>
              </View>
            </View>
          </View>
        </>
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
    paddingBottom: 32,
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
    fontWeight: '800',
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
    fontWeight: '600',
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
    fontWeight: '600',
  },
  codeText: {
    fontFamily: 'monospace',
    color: colors.cyanLight,
  },
  ipText: {
    fontFamily: 'monospace',
    color: colors.emeraldLight,
  },
});
