import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
  RefreshControl, Modal, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '../../src/components/Header';
import { EmptyState } from '../../src/components/EmptyState';
import { PaginationFooter } from '../../src/components/PaginationFooter';
import { QrScannerModal } from '../../src/components/QrScannerModal';
import { AssetDetailView } from '../../src/components/AssetDetailView';
import { assetsApi } from '../../src/api/assets';
import { securityGateApi } from '../../src/api/securityGate';
import { Asset, ScannedAssetData } from '../../src/types';
import { colors } from '../../src/theme/colors';

const LIMIT = 20;

export default function AdminAssetsScreen() {
  const insets = useSafeAreaInsets();

  const [assets, setAssets] = useState<Asset[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const [scannerVisible, setScannerVisible] = useState(false);
  const [scannedAsset, setScannedAsset] = useState<ScannedAssetData | null>(null);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  const fetchAssets = useCallback(async (pg: number, q: string, replace = false) => {
    if (pg === 1) setLoading(true);
    else setLoadingMore(true);
    try {
      const res = await assetsApi.getList({ page: pg, limit: LIMIT, search: q || undefined });
      setTotal(res.total);
      setAssets(prev => replace ? res.rows : [...prev, ...res.rows]);
      setPage(pg);
    } catch (e) { console.error('Assets load failed', e); }
    finally { setLoading(false); setLoadingMore(false); }
  }, []);

  useEffect(() => {
    fetchAssets(1, search, true);
  }, [search]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAssets(1, search, true);
    setRefreshing(false);
  };

  const loadMore = () => {
    const totalPages = Math.ceil(total / LIMIT);
    if (!loadingMore && page < totalPages) fetchAssets(page + 1, search);
  };

  const doSearch = () => {
    setSearch(searchInput.trim());
    setPage(1);
  };

  const handleScan = async (token: string) => {
    setScannerVisible(false);
    setScanLoading(true);
    setScanError(null);
    try {
      const data = await securityGateApi.scanToken(token);
      setScannedAsset(data);
    } catch (err: any) {
      setScanError(err?.response?.data?.message || 'QR resolution failed.');
    } finally {
      setScanLoading(false);
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return colors.emeraldLight;
      case 'UNDER_REPAIR': return colors.amberLight;
      case 'DISPOSED': case 'LOST': return colors.roseLight;
      default: return colors.textSecondary;
    }
  };

  const renderAsset = ({ item }: { item: Asset }) => (
    <View style={styles.assetCard}>
      <View style={styles.assetCardLeft}>
        <Text style={styles.assetCode}>{item.assetCode}</Text>
        <Text style={styles.assetName} numberOfLines={1}>{item.assetName}</Text>
        <Text style={styles.assetMeta} numberOfLines={1}>{item.assetType} · {item.manufacturer} {item.model}</Text>
        {item.currentHolder && <Text style={styles.assetHolder} numberOfLines={1}>↳ {item.currentHolder}</Text>}
      </View>
      <View style={styles.assetCardRight}>
        <View style={[styles.statusPill, { borderColor: statusColor(item.status) + '60' }]}>
          <Text style={[styles.statusText, { color: statusColor(item.status) }]}>{item.status}</Text>
        </View>
        {item.gatePresence === 'OUTSIDE' && (
          <View style={styles.outsidePill}>
            <Text style={styles.outsideText}>OUTSIDE</Text>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Header subtitle="Asset Inventory" showProfile={false} />

      {/* Search Bar */}
      <View style={styles.searchBar}>
        <View style={styles.searchInputWrap}>
          <Ionicons name="search-outline" size={16} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search assets, codes, holders..."
            placeholderTextColor={colors.textMuted}
            value={searchInput}
            onChangeText={setSearchInput}
            onSubmitEditing={doSearch}
            returnKeyType="search"
          />
          {searchInput.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchInput(''); setSearch(''); }}>
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.scanBtn} onPress={() => setScannerVisible(true)}>
          <Ionicons name="qr-code-outline" size={20} color={colors.cyanLight} />
        </TouchableOpacity>
      </View>

      {/* Total count */}
      <View style={styles.countRow}>
        <Text style={styles.countText}>{total} assets total</Text>
      </View>

      {loading && page === 1 ? (
        <View style={styles.loadingCenter}>
          <ActivityIndicator color={colors.cyanLight} />
        </View>
      ) : (
        <FlatList
          data={assets}
          keyExtractor={(item) => item.id}
          renderItem={renderAsset}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.cyanLight} />}
          ListEmptyComponent={<EmptyState icon="laptop-outline" title="No assets found" subtitle="Try adjusting your search query." />}
          ListFooterComponent={<PaginationFooter loading={loadingMore} hasMore={assets.length < total} />}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          showsVerticalScrollIndicator={false}
        />
      )}

      <QrScannerModal visible={scannerVisible} onClose={() => setScannerVisible(false)} onScan={handleScan} title="Scan Asset Tag" />

      {scanLoading && (
        <Modal transparent visible>
          <View style={styles.overlay}>
            <ActivityIndicator size="large" color={colors.cyanLight} />
            <Text style={styles.loadingText}>Resolving QR tag...</Text>
          </View>
        </Modal>
      )}

      {!!scanError && (
        <Modal transparent visible onRequestClose={() => setScanError(null)}>
          <View style={styles.overlay}>
            <View style={styles.alertCard}>
              <Ionicons name="alert-circle" size={36} color={colors.roseLight} />
              <Text style={styles.alertTitle}>Scan Failed</Text>
              <Text style={styles.alertMsg}>{scanError}</Text>
              <TouchableOpacity style={styles.alertDismiss} onPress={() => setScanError(null)}>
                <Text style={styles.alertDismissText}>Dismiss</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {!!scannedAsset && (
        <Modal visible animationType="slide" onRequestClose={() => setScannedAsset(null)}>
          <AssetDetailView asset={scannedAsset} roleCode="ADMIN" onClose={() => setScannedAsset(null)} />
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  searchInputWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.card, borderRadius: 10, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 12, height: 44,
  },
  searchInput: { flex: 1, color: colors.textPrimary, fontSize: 14 },
  scanBtn: {
    width: 44, height: 44, borderRadius: 10,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderCyan,
    alignItems: 'center', justifyContent: 'center',
  },
  countRow: { paddingHorizontal: 16, paddingVertical: 8 },
  countText: { fontSize: 11, color: colors.textMuted, fontWeight: '600' },
  loadingCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: 16, paddingTop: 4 },
  assetCard: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: colors.card, borderRadius: 10, padding: 14,
    borderWidth: 1, borderColor: colors.border,
  },
  assetCardLeft: { flex: 1, gap: 3 },
  assetCode: { fontSize: 10, color: colors.cyanLight, fontFamily: 'monospace', fontWeight: '700' },
  assetName: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  assetMeta: { fontSize: 11, color: colors.textSecondary },
  assetHolder: { fontSize: 11, color: colors.textMuted },
  assetCardRight: { alignItems: 'flex-end', gap: 6 },
  statusPill: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1,
  },
  statusText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.4 },
  outsidePill: {
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
    backgroundColor: colors.amberBg, borderWidth: 1, borderColor: colors.amberBorder,
  },
  outsideText: { fontSize: 8, fontWeight: '800', color: colors.amberLight, letterSpacing: 0.5 },
  separator: { height: 8 },
  overlay: { flex: 1, backgroundColor: 'rgba(3,3,9,0.85)', alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: colors.cyanLight, fontSize: 13, fontWeight: '700' },
  alertCard: {
    backgroundColor: colors.card, borderRadius: 16, padding: 24, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', gap: 12, width: '85%',
  },
  alertTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  alertMsg: { fontSize: 12, color: colors.textSecondary, textAlign: 'center' },
  alertDismiss: { paddingVertical: 10, paddingHorizontal: 24, borderRadius: 8, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  alertDismissText: { color: colors.textPrimary, fontSize: 13, fontWeight: '600' },
});
