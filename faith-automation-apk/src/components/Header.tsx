import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  showLogout?: boolean;
  showProfile?: boolean;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({
  title = 'Faith IT Inventory',
  subtitle,
  showLogout = true,
  showProfile = true,
  showBack = false,
  onBack,
  rightAction,
}) => {
  const { user, logout, isLoggingOut } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const handleBack = () => {
    if (onBack) onBack();
    else router.back();
  };

  const handleLogoutPress = () => {
    if (isLoggingOut) return;
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out of your current account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => { await logout(); },
        },
      ],
      { cancelable: true }
    );
  };

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'ADMIN': return { bg: colors.cyanGlow, text: colors.cyanLight, border: colors.borderCyan };
      case 'MANAGER': return { bg: colors.emeraldBg, text: colors.emeraldLight, border: colors.emeraldBorder };
      case 'SECURITY_GUARD': return { bg: colors.amberBg, text: colors.amberLight, border: colors.amberBorder };
      default: return { bg: 'rgba(90,100,117,0.15)', text: colors.textSecondary, border: colors.border };
    }
  };

  const badge = getRoleBadge(user?.roleCode);

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top + 8, 14) }]}>
      <View style={styles.row}>
        <View style={styles.left}>
          {showBack ? (
            <TouchableOpacity style={styles.iconBtn} onPress={handleBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => user && router.push('/profile' as any)}
              activeOpacity={user ? 0.7 : 1}
            >
              <Ionicons name="laptop-outline" size={18} color={colors.cyanLight} />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.textArea}
            onPress={() => user && router.push('/profile' as any)}
            activeOpacity={user ? 0.75 : 1}
          >
            <Text style={styles.titleText} numberOfLines={1}>{title}</Text>
            {subtitle ? (
              <Text style={styles.subtitleText} numberOfLines={1}>{subtitle}</Text>
            ) : user ? (
              <View style={styles.badgeRow}>
                <Text style={styles.usernameText}>{user.username}</Text>
                <View style={[styles.roleBadge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
                  <Text style={[styles.roleBadgeText, { color: badge.text }]}>
                    {user.roleCode.replace('_', ' ')}
                  </Text>
                </View>
              </View>
            ) : null}
          </TouchableOpacity>
        </View>

        <View style={styles.actions}>
          {rightAction}
          {showProfile && user && (
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => router.push('/profile' as any)}
              hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
            >
              <Ionicons name="person-circle-outline" size={20} color={colors.cyanLight} />
            </TouchableOpacity>
          )}
          {showLogout && user && (
            <TouchableOpacity
              style={[styles.iconBtn, styles.logoutBtn]}
              onPress={handleLogoutPress}
              disabled={isLoggingOut}
              hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
            >
              {isLoggingOut ? (
                <ActivityIndicator size="small" color={colors.roseLight} />
              ) : (
                <Ionicons name="log-out-outline" size={18} color={colors.roseLight} />
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 40,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutBtn: { borderColor: colors.roseBorder, backgroundColor: colors.roseBg },
  textArea: { flex: 1 },
  titleText: { fontSize: 15, fontWeight: '800', color: colors.textPrimary, letterSpacing: 0.3 },
  subtitleText: { fontSize: 11, color: colors.textSecondary, marginTop: 1 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  usernameText: { fontSize: 11, color: colors.textSecondary, fontWeight: '600' },
  roleBadge: { paddingHorizontal: 6, paddingVertical: 1.5, borderRadius: 4, borderWidth: 1 },
  roleBadgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
