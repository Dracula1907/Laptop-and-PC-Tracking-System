import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { securityGateApi } from '../../src/api/securityGate';
import { GateMovementRecord } from '../../src/types';
import { colors } from '../../src/theme/colors';

export default function GuardMovementsScreen() {
  const router = useRouter();

  const [movements, setMovements] = useState<GateMovementRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMovements = async () => {
    try {
      setLoading(true);
      const res = await securityGateApi.getMovements({ limit: 25 });
      setMovements(res.movements || []);
    } catch (e) {
      console.error('Failed to fetch movements', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMovements();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMovements();
  };

  const renderItem = ({ item }: { item: GateMovementRecord }) => {
    const isOut = item.movementType === 'OUT';
    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View
            style={[
              styles.movementBadge,
              isOut ? styles.badgeOut : styles.badgeIn,
            ]}
          >
            <Ionicons
              name={isOut ? 'arrow-up-circle-outline' : 'arrow-down-circle-outline'}
              size={12}
              color={isOut ? colors.amber : colors.emerald}
            />
            <Text
              style={[
                styles.movementBadgeText,
                { color: isOut ? colors.amber : colors.emerald },
              ]}
            >
              {item.movementType}
            </Text>
          </View>
          <Text style={styles.movementCode}>{item.movementCode}</Text>
        </View>

        <Text style={styles.modelText}>
          {item.asset?.assetCode} — {item.asset?.model}
        </Text>
        <Text style={styles.timeText}>
          {new Date(item.movementDateTime).toLocaleString()} • {item.gate?.name || 'Gate'}
        </Text>

        {item.destination && (
          <Text style={styles.destText} numberOfLines={1}>
            {item.destination} {item.purpose ? `(${item.purpose})` : ''}
          </Text>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.titleGroup}>
          <Text style={styles.title}>Gate Movement Log</Text>
          <Text style={styles.subtitle}>Recent physical check-ins and check-outs</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.cyan} />
        </View>
      ) : (
        <FlatList
          data={movements}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.cyan} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="file-tray-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyText}>No recent movements recorded.</Text>
            </View>
          }
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 14,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleGroup: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  listContent: {
    padding: 16,
    gap: 10,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  movementBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  badgeOut: {
    backgroundColor: colors.amberBg,
    borderColor: colors.amberBorder,
  },
  badgeIn: {
    backgroundColor: colors.emeraldBg,
    borderColor: colors.emeraldBorder,
  },
  movementBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  movementCode: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: colors.textMuted,
  },
  modelText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  timeText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  destText: {
    fontSize: 11,
    color: colors.cyanLight,
    marginTop: 2,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 8,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 13,
  },
});
