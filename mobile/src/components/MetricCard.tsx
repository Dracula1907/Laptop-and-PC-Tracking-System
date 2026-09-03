import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

interface MetricCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  subvalue?: string;
  icon: keyof typeof Ionicons.glyphMap;
  color?: string;
  bg?: string;
  borderColor?: string;
  onPress?: () => void;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  subtitle,
  subvalue,
  icon,
  color = colors.cyan,
  bg = colors.card,
  borderColor = colors.border,
  onPress,
}) => {
  const content = (
    <View style={[styles.card, { backgroundColor: bg, borderColor }]}>
      <View style={styles.topRow}>
        <Text style={styles.label}>{label}</Text>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <Text style={[styles.value, { color }]}>{value}</Text>
      {(subtitle || subvalue) && (
        <Text style={styles.subtitle}>{subvalue || subtitle}</Text>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.touchable}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  touchable: {
    flex: 1,
  },
  card: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    minWidth: 140,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
});
