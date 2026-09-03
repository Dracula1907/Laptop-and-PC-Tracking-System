import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '../../src/components/Header';
import { PaginationFooter } from '../../src/components/PaginationFooter';
import { EmptyState } from '../../src/components/EmptyState';
import { AssetDetailView } from '../../src/components/AssetDetailView';
import { assetsApi } from '../../src/api/assets';
import { colors } from '../../src/theme/colors';

export default function AssetsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Filter Chip State: 'ALL' | 'LAPTOP' | 'PC' | 'OUTSIDE' | 'INSIDE'
  const [filterType, setFilterType] = useState<'ALL' | 'LAPTOP' | 'PC' | 'OUTSIDE' | 'INSIDE'>('ALL');

  // Selected Asset for Full Detail View
  const [selectedAsset, setSelectedAsset] = useState<any | null>(null);

  // Request counter to protect against stale in-flight responses
  const searchRequestIdRef = useRef<number>(0);

  const fetchAssets = useCallback(
    async (p = 1, append = false, query = search, filter = filterType) => {
      const currentReqId = ++searchRequestIdRef.current;

      try {
        if (append) {
          setLoadingMore(true);
        } else {
          setLoading(true);
        }

        const params: any = {
          page: p,
          limit: 15,
          search: query.trim() || undefined,
        };

        if (filter === 'LAPTOP') params.assetType = 'LAPTOP';
        if (filter === 'PC') params.assetType = 'PC';
        if (filter === 'OUTSIDE') params.gatePresence = 'OUTSIDE';
        if (filter === 'INSIDE') params.gatePresence = 'INSIDE';

        const res = await assetsApi.getAssets(params);

        // Ignore response if a newer search/filter request was initiated
        if (currentReqId !== searchRequestIdRef.current) return;

        const newRows: any[] = res.assets || res.rows || (Array.isArray(res) ? res : []);
        const total = res.pagination?.total || res.total || newRows.length;
        setTotalCount(total);

        if (append) {
          setAssets((prev) => {
            const existingIds = new Set(prev.map((a) => a.id));
            const uniqueNew = newRows.filter((a) => !existingIds.has(a.id));
            return [...prev, ...uniqueNew];
          });
        } else {
          setAssets(newRows);
        }

        const totalPages = res.pagination?.totalPages || Math.ceil(total / 15) || 1;
        setHasMore(p < totalPages);
      } catch (e) {
        console.error('Failed to fetch assets', e);
      } finally {
        if (currentReqId === searchRequestIdRef.current) {
          setLoading(false);
          setLoadingMore(false);
          setRefreshing(false);
        }
      }
    },
    [search, filterType]
  );

  // Search debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchAssets(1, false, search, filterType);
    }, 350);
    return () => clearTimeout(timer);
  }, [search, filterType, fetchAssets]);

  const onRefresh = () => {
    setRefreshing(true);
    setPage(1);
    fetchAssets(1, false, search, filterType);
  };

  const loadMore = () => {
    if (!loading && !loadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchAssets(nextPage, true, search, filterType);
    }
  };

  const handleFilterSelect = (filter: 'ALL' | 'LAPTOP' | 'PC' | 'OUTSIDE' | 'INSIDE') => {
    if (filter !== filterType) {
      setFilterType(filter);
      setPage(1);
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const isOutside = item.gatePresence === 'OUTSIDE';

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => setSelectedAsset(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardTop}>
          <View style={styles.codeBadge}>
            <Text style={styles.codeText}>{item.companyAssetId || item.assetCode}</Text>
          </View>
          <View
            style={[
              styles.stateBadge,
              isOutside ? styles.stateBadgeOutside : styles.stateBadgeInside,
            ]}
          >
            <Text
              style={[
                styles.stateBadgeText,
                { color: isOutside ? colors.amber : colors.emerald },
              ]}
            >
              {item.gatePresence || 'INSIDE'}
            </Text>
          </View>
        </View>

        <Text style={styles.modelText}>
          {item.manufacturer ? `${item.manufacturer} ` : ''}{item.model}
        </Text>
        <Text style={styles.typeText}>{item.assetType} • {item.allocationStatus || 'Allocated'}</Text>

        <View style={styles.divider} />

        <View style={styles.cardBottom}>
          <View style={styles.holderCol}>
            <Ionicons name="person-outline" size={13} color={colors.textMuted} />
            <Text style={styles.holderText} numberOfLines={1}>
              {item.currentHolder?.fullName || item.employeeNameSource || 'Unallocated Stock'}
            </Text>
          </View>
          <View style={styles.deptCol}>
            <Ionicons name="business-outline" size={13} color={colors.textMuted} />
            <Text style={styles.deptText} numberOfLines={1}>
              {item.department?.name || item.location || 'HQ'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Header
        title="Asset Inventory"
        subtitle={`${totalCount} registered company devices`}
        showBack={true}
        onBack={() => router.back()}
      />

      {/* Search Input Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={16} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by code, model, or employee..."
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

      {/* Filter Chips Bar */}
      <View style={styles.filterBar}>
        <TouchableOpacity
          style={[styles.filterChip, filterType === 'ALL' && styles.filterChipActive]}
          onPress={() => handleFilterSelect('ALL')}
        >
          <Text style={[styles.filterChipText, filterType === 'ALL' && styles.filterChipTextActive]}>
            All
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterChip, filterType === 'LAPTOP' && styles.filterChipActive]}
          onPress={() => handleFilterSelect('LAPTOP')}
        >
          <Text style={[styles.filterChipText, filterType === 'LAPTOP' && styles.filterChipTextActive]}>
            Laptops
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterChip, filterType === 'PC' && styles.filterChipActive]}
          onPress={() => handleFilterSelect('PC')}
        >
          <Text style={[styles.filterChipText, filterType === 'PC' && styles.filterChipTextActive]}>
            Desktops
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterChip, filterType === 'OUTSIDE' && styles.filterChipActiveOutside]}
          onPress={() => handleFilterSelect('OUTSIDE')}
        >
          <Ionicons
            name="arrow-up-circle"
            size={12}
            color={filterType === 'OUTSIDE' ? colors.amber : colors.textMuted}
          />
          <Text
            style={[
              styles.filterChipText,
              filterType === 'OUTSIDE' && { color: colors.amber, fontWeight: '800' },
            ]}
          >
            Outside
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterChip, filterType === 'INSIDE' && styles.filterChipActiveInside]}
          onPress={() => handleFilterSelect('INSIDE')}
        >
          <Ionicons
            name="shield-checkmark"
            size={12}
            color={filterType === 'INSIDE' ? colors.emerald : colors.textMuted}
          />
          <Text
            style={[
              styles.filterChipText,
              filterType === 'INSIDE' && { color: colors.emerald, fontWeight: '800' },
            ]}
          >
            Inside
          </Text>
        </TouchableOpacity>
      </View>

      {/* Asset FlatList with Infinite Scroll & Deduplication */}
      {loading && page === 1 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.cyan} />
          <Text style={styles.loadingText}>Loading inventory records...</Text>
        </View>
      ) : (
        <FlatList
          data={assets}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.cyan} />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.35}
          ListFooterComponent={
            <PaginationFooter loading={loadingMore} hasMore={hasMore} itemCount={assets.length} />
          }
          ListEmptyComponent={
            search || filterType !== 'ALL' ? (
              <EmptyState
                icon="search-outline"
                title="No Matching Assets"
                message="No inventory items matched your active search and filter criteria."
                actionLabel="Clear Filters"
                onAction={() => {
                  setSearch('');
                  setFilterType('ALL');
                }}
              />
            ) : (
              <EmptyState
                icon="laptop-outline"
                title="Inventory Empty"
                message="No hardware inventory assets currently recorded."
              />
            )
          }
        />
      )}

      {/* Asset Full Inspection Modal */}
      {selectedAsset && (
        <Modal
          visible={!!selectedAsset}
          animationType="slide"
          onRequestClose={() => setSelectedAsset(null)}
        >
          <View style={styles.fullModalContainer}>
            <View style={[styles.modalHeader, { paddingTop: Math.max(insets.top + 8, 20) }]}>
              <View style={styles.modalHeaderTitleGroup}>
                <Text style={styles.modalHeaderTitle}>
                  {selectedAsset.companyAssetId || selectedAsset.assetCode}
                </Text>
                <Text style={styles.modalHeaderSubtitle}>
                  {selectedAsset.manufacturer} {selectedAsset.model} ({selectedAsset.assetType})
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setSelectedAsset(null)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={20} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <AssetDetailView
              asset={{
                qrId: '',
                token: '',
                qrStatus: 'ACTIVE',
                assetId: selectedAsset.id,
                assetCode: selectedAsset.companyAssetId || selectedAsset.assetCode,
                companyAssetId: selectedAsset.companyAssetId,
                assetName: selectedAsset.assetName || selectedAsset.model,
                assetType: selectedAsset.assetType,
                manufacturer: selectedAsset.manufacturer,
                model: selectedAsset.model,
                serialNumber: selectedAsset.serialNumber || 'N/A',
                currentHolder:
                  selectedAsset.currentHolder?.fullName || selectedAsset.employeeNameSource || 'Unallocated Stock',
                employeeCode: selectedAsset.currentHolder?.employeeCode || null,
                department: selectedAsset.department?.name || selectedAsset.location || 'General',
                location: selectedAsset.locationRel?.name || selectedAsset.location || 'HQ',
                gatePresence: selectedAsset.gatePresence || 'INSIDE',
                openOutMovement: null,
                fullDetails: {
                  status: selectedAsset.status,
                  allocationStatus: selectedAsset.allocationStatus,
                  criticality: selectedAsset.criticality,
                  specifications: selectedAsset.specifications,
                  warranties: selectedAsset.warranties,
                  maintenance: selectedAsset.maintenance,
                  gateMovements: selectedAsset.gateMovements,
                },
              }}
              role="ADMIN"
            />
          </View>
        </Modal>
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
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.cardElevated,
    borderColor: colors.cyan,
  },
  filterChipActiveOutside: {
    backgroundColor: colors.amberBg,
    borderColor: colors.amberBorder,
  },
  filterChipActiveInside: {
    backgroundColor: colors.emeraldBg,
    borderColor: colors.emeraldBorder,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: colors.cyan,
    fontWeight: '800',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
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
  stateBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  stateBadgeInside: {
    backgroundColor: colors.emeraldBg,
    borderColor: colors.emeraldBorder,
  },
  stateBadgeOutside: {
    backgroundColor: colors.amberBg,
    borderColor: colors.amberBorder,
  },
  stateBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  modelText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  typeText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 10,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  holderCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  holderText: {
    fontSize: 11,
    color: colors.textSecondary,
    flex: 1,
  },
  deptCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  deptText: {
    fontSize: 11,
    color: colors.textSecondary,
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  fullModalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalHeaderTitleGroup: {
    flex: 1,
  },
  modalHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
    fontFamily: 'monospace',
  },
  modalHeaderSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
