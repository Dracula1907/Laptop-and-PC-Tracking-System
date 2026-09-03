import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

interface MetricCardProps {
  label: string;
  value: number | string;
  icon: string;
  color?: string;
  bg?: string;
  border?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  icon,
  color = colors.cyanLight,
  bg = colors.cyanGlow,
  border = colors.borderCyan,
}) => (
  <View style={styles.card}>
    <View style={[styles.iconBox, { backgroundColor: bg, borderColor: border }]}>
      <Ionicons name={icon as any} size={20} color={color} />
    </View>
    <Text style={[styles.value, { color }]}>{value}</Text>
    <Text style={styles.label}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  card: {
    flex: 1, minWidth: 90,
    backgroundColor: colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    alignItems: 'center',
    gap: 8,
  },
  iconBox: {
    width: 40, height: 40, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  value: { fontSize: 22, fontWeight: '800' },
  label: { fontSize: 10, color: colors.textMuted, fontWeight: '600', textAlign: 'center', letterSpacing: 0.3 },
});
