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
import { CurrentOutsideItem } from '../../src/types';
import { colors } from '../../src/theme/colors';

export default function GuardOutsideScreen() {
  const router = useRouter();

  const [items, setItems] = useState<CurrentOutsideItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const res = await securityGateApi.getCurrentOutside();
      setItems(res.rows || []);
    } catch (e) {
      console.error('Failed to fetch outside items', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchItems();
  };

  const renderItem = ({ item }: { item: CurrentOutsideItem }) => (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.codeBadge}>
          <Text style={styles.codeText}>{item.assetCode}</Text>
        </View>
        <View style={styles.durationBadge}>
          <Ionicons name="time-outline" size={12} color={colors.amber} />
          <Text style={styles.durationText}>{item.durationHours}h OUT</Text>
        </View>
      </View>

      <Text style={styles.modelText}>{item.model} ({item.assetType})</Text>
      <Text style={styles.holderText}>Holder: {item.holderName} • {item.department}</Text>

      <View style={styles.destBox}>
        <Text style={styles.destLabel}>Destination & Purpose:</Text>
        <Text style={styles.destValue}>{item.destination} — {item.purpose}</Text>
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.footerText}>Checked out at: {item.outDateTime ? new Date(item.outDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}</Text>
        {item.expectedReturn && (
          <Text style={[styles.footerText, item.isOverdue && styles.overdueText]}>
            Due: {new Date(item.expectedReturn).toLocaleDateString()}
          </Text>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.titleGroup}>
          <Text style={styles.title}>Current Outside Assets</Text>
          <Text style={styles.subtitle}>{items.length} assets off company premises</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.amber} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.assetId}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.amber} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="shield-checkmark-outline" size={48} color={colors.emerald} />
              <Text style={styles.emptyText}>All assets are safely inside premises!</Text>
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
  codeBadge: {
    backgroundColor: colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  codeText: {
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: '700',
    color: colors.cyan,
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.amberBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.amberBorder,
  },
  durationText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.amber,
    fontFamily: 'monospace',
  },
  modelText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  holderText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  destBox: {
    backgroundColor: colors.surface,
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginTop: 4,
  },
  destLabel: {
    fontSize: 9,
    color: colors.textMuted,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  destValue: {
    fontSize: 11,
    color: colors.textPrimary,
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  footerText: {
    fontSize: 10,
    color: colors.textMuted,
  },
  overdueText: {
    color: colors.rose,
    fontWeight: '700',
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
