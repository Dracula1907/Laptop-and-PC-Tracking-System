import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { colors } from '../theme/colors';

interface PaginationFooterProps {
  loading: boolean;
  hasMore: boolean;
  itemCount?: number;
}

export const PaginationFooter: React.FC<PaginationFooterProps> = ({
  loading,
  hasMore,
  itemCount,
}) => {
  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color={colors.cyan} />
        <Text style={styles.loadingText}>Loading more records...</Text>
      </View>
    );
  }

  if (!hasMore && itemCount && itemCount > 10) {
    return (
      <View style={styles.container}>
        <View style={styles.line} />
        <Text style={styles.endText}>All {itemCount} records loaded</Text>
        <View style={styles.line} />
      </View>
    );
  }

  return <View style={styles.spacer} />;
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  endText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  line: {
    height: 1,
    width: 30,
    backgroundColor: colors.border,
  },
  spacer: {
    height: 20,
  },
});
