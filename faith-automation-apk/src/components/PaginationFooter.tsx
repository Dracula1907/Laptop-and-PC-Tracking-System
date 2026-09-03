import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { colors } from '../theme/colors';

interface PaginationFooterProps {
  loading: boolean;
  hasMore: boolean;
}

export const PaginationFooter: React.FC<PaginationFooterProps> = ({ loading, hasMore }) => {
  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color={colors.cyanLight} />
        <Text style={styles.text}>Loading more...</Text>
      </View>
    );
  }
  if (!hasMore) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>All records loaded</Text>
      </View>
    );
  }
  return null;
};

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  text: { fontSize: 12, color: colors.textMuted },
});
