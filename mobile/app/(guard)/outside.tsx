import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../../src/components/Header';
import { EmptyState } from '../../src/components/EmptyState';
import { securityGateApi } from '../../src/api/securityGate';
import { CurrentOutsideItem } from '../../src/types';
import { colors } from '../../src/theme/colors';

export default function GuardOutsideScreen() {
  const router = useRouter();

  const [items, setItems] = useState<CurrentOutsideItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

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

  // Client-side search filtering
  const filteredItems = useMemo(() => {
    if (!search.trim()) return items;
    const query = search.toLowerCase();
    return items.filter(
      (item) =>
        item.assetCode.toLowerCase().includes(query) ||
        item.holderName.toLowerCase().includes(query) ||
        item.destination.toLowerCase().includes(query) ||
        item.model.toLowerCase().includes(query)
    );
  }, [items, search]);

  const handleQuickIn = async (item: CurrentOutsideItem) => {
    Alert.alert(
      'Confirm Check-In',
      `Record arrival of ${item.assetCode} (${item.model}) on company premises?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Entry',
          onPress: async () => {
            try {
              setActionLoadingId(item.assetId);
              await securityGateApi.recordIn({
                assetId: item.assetId,
                remarks: 'Quick return via Outside Asset monitor',
              });
              await fetchItems();
              Alert.alert('Asset Verified Inside', `${item.assetCode} return recorded successfully.`);
            } catch (err: any) {
              const msg = err?.response?.data?.message || err?.message || 'Failed to record check-in.';
              Alert.alert('Check-In Error', msg);
            } finally {
              setActionLoadingId(null);
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: CurrentOutsideItem }) => {
    const isOverdue = item.isOverdue;
    const isActing = actionLoadingId === item.assetId;

    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.codeBadge}>
            <Text style={styles.codeText}>{item.assetCode}</Text>
          </View>
          <View style={[styles.durationBadge, isOverdue && styles.overdueBadge]}>
            <Ionicons
              name="time-outline"
              size={12}
              color={isOverdue ? colors.rose : colors.amber}
            />
            <Text style={[styles.durationText, isOverdue && styles.overdueText]}>
              {item.durationHours}h OUT {isOverdue ? '(OVERDUE)' : ''}
            </Text>
          </View>
        </View>

        <Text style={styles.modelText}>{item.model} ({item.assetType})</Text>
        <Text style={styles.holderText}>
          Holder: <Text style={styles.whiteText}>{item.holderName}</Text> • {item.department}
        </Text>

        <View style={styles.destBox}>
          <Text style={styles.destLabel}>Destination & Purpose:</Text>
          <Text style={styles.destValue}>
            {item.destination} — {item.purpose}
          </Text>
        </View>

        <View style={styles.cardFooter}>
          <View>
            <Text style={styles.footerTime}>
              Checked out: {item.outDateTime ? new Date(item.outDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
            </Text>
            {item.expectedReturn && (
              <Text style={[styles.footerDue, isOverdue && styles.overdueText]}>
                Return due: {new Date(item.expectedReturn).toLocaleDateString()}
              </Text>
            )}
          </View>

          <TouchableOpacity
            style={styles.btnQuickIn}
            onPress={() => handleQuickIn(item)}
            disabled={isActing}
            activeOpacity={0.8}
          >
            {isActing ? (
              <ActivityIndicator size="small" color={colors.textDark} />
            ) : (
              <>
                <Ionicons name="arrow-down-circle" size={14} color={colors.textDark} />
                <Text style={styles.btnQuickInText}>Check IN</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Header
        title="Current Outside Assets"
        subtitle={`${items.length} devices off company premises`}
        showBack={true}
        onBack={() => router.back()}
      />

      {/* Search Filter Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={16} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by code, holder, or destination..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.amber} />
          <Text style={styles.loadingText}>Fetching outside assets...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => item.assetId}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.amber} />
          }
          ListEmptyComponent={
            search ? (
              <EmptyState
                icon="search-outline"
                title="No Matching Assets"
                message={`No outside devices found matching "${search}".`}
                actionLabel="Clear Search"
                onAction={() => setSearch('')}
              />
            ) : (
              <EmptyState
                icon="shield-checkmark-outline"
                title="All Assets Inside"
                message="All inventory laptops and PCs are safely accounted for on company premises."
                accentColor={colors.emerald}
              />
            )
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
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 13,
  },
  listContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  codeBadge: {
    backgroundColor: colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  codeText: {
    fontFamily: 'monospace',
    fontSize: 12,
    fontWeight: '800',
    color: colors.cyan,
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.amberBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.amberBorder,
  },
  overdueBadge: {
    backgroundColor: colors.roseBg,
    borderColor: colors.roseBorder,
  },
  durationText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.amber,
    fontFamily: 'monospace',
  },
  overdueText: {
    color: colors.roseLight,
    fontWeight: '800',
  },
  modelText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  holderText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  whiteText: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  destBox: {
    backgroundColor: colors.surface,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  destLabel: {
    fontSize: 9,
    color: colors.textMuted,
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  destValue: {
    fontSize: 12,
    color: colors.textPrimary,
    marginTop: 2,
    fontWeight: '500',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerTime: {
    fontSize: 10,
    color: colors.textMuted,
  },
  footerDue: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  btnQuickIn: {
    backgroundColor: colors.emerald,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 96,
    justifyContent: 'center',
  },
  btnQuickInText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textDark,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});
