import React, { useState, useEffect } from 'react';
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
import { assetsApi } from '../../src/api/assets';
import { AssetDetailView } from '../../src/components/AssetDetailView';
import { colors } from '../../src/theme/colors';

export default function AssetsScreen() {
  const router = useRouter();

  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [selectedAsset, setSelectedAsset] = useState<any | null>(null);

  const fetchAssets = async (p = 1, append = false) => {
    try {
      if (!append) setLoading(true);
      const res = await assetsApi.getAssets({ page: p, limit: 15, search });
      const rows = res.assets || res.rows || res || [];
      if (append) {
        setAssets((prev) => [...prev, ...rows]);
      } else {
        setAssets(rows);
      }
      if (res.pagination) {
        setTotalPages(res.pagination.totalPages || 1);
      }
    } catch (e) {
      console.error('Failed to fetch assets', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchAssets(1, false);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const onRefresh = () => {
    setRefreshing(true);
    setPage(1);
    fetchAssets(1, false);
  };

  const loadMore = () => {
    if (page < totalPages && !loading) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchAssets(nextPage, true);
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const isOutside = item.gatePresence === 'OUTSIDE';
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => setSelectedAsset(item)}
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
        <Text style={styles.typeText}>{item.assetType}</Text>

        <View style={styles.divider} />

        <View style={styles.cardBottom}>
          <View style={styles.holderCol}>
            <Ionicons name="person-outline" size={12} color={colors.textMuted} />
            <Text style={styles.holderText} numberOfLines={1}>
              {item.currentHolder?.fullName || item.employeeNameSource || 'Stock'}
            </Text>
          </View>
          <View style={styles.deptCol}>
            <Ionicons name="business-outline" size={12} color={colors.textMuted} />
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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTitleGroup}>
          <Text style={styles.headerTitle}>Asset Inventory</Text>
          <Text style={styles.headerSubtitle}>Corporate IT Hardware Registry</Text>
        </View>
      </View>

      {/* Search Input */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={16} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by code, model, employee..."
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Asset FlatList */}
      {loading && page === 1 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.cyan} />
          <Text style={styles.loadingText}>Loading assets...</Text>
        </View>
      ) : (
        <FlatList
          data={assets}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.cyan} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="file-tray-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyText}>No assets found matching your criteria.</Text>
            </View>
          }
        />
      )}

      {/* Asset Detail Modal */}
      {selectedAsset && (
        <Modal
          visible={!!selectedAsset}
          animationType="slide"
          onRequestClose={() => setSelectedAsset(null)}
        >
          <View style={styles.fullModalContainer}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalHeaderTitle}>
                  {selectedAsset.companyAssetId || selectedAsset.assetCode}
                </Text>
                <Text style={styles.modalHeaderSubtitle}>
                  {selectedAsset.manufacturer} {selectedAsset.model}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setSelectedAsset(null)}
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
                assetName: selectedAsset.assetName || selectedAsset.model,
                assetType: selectedAsset.assetType,
                manufacturer: selectedAsset.manufacturer,
                model: selectedAsset.model,
                serialNumber: selectedAsset.serialNumber || 'N/A',
                currentHolder: selectedAsset.currentHolder?.fullName || selectedAsset.employeeNameSource || 'Stock',
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
  headerTitleGroup: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 10,
    margin: 16,
    marginBottom: 8,
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
    paddingTop: 8,
    gap: 10,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
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
  stateBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
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
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  modelText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  typeText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
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
    gap: 4,
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
    gap: 4,
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
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 8,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 13,
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
    paddingTop: 48,
    paddingBottom: 14,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
    marginTop: 1,
  },
  modalCloseButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
