import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  showLogout?: boolean;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({
  title = 'Faith IT Inventory',
  subtitle,
  showLogout = true,
  showBack = false,
  onBack,
  rightAction,
}) => {
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  const getRoleBadgeStyle = (role?: string) => {
    switch (role) {
      case 'ADMIN':
        return { bg: 'rgba(6, 182, 212, 0.15)', text: colors.cyan, border: colors.borderCyan };
      case 'MANAGER':
        return { bg: 'rgba(16, 185, 129, 0.15)', text: colors.emerald, border: colors.emeraldBorder };
      case 'SECURITY_GUARD':
        return { bg: 'rgba(245, 158, 11, 0.15)', text: colors.amber, border: colors.amberBorder };
      default:
        return { bg: 'rgba(148, 163, 184, 0.15)', text: colors.textSecondary, border: colors.border };
    }
  };

  const badge = getRoleBadgeStyle(user?.roleCode);

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top + 8, 14) }]}>
      <View style={styles.titleRow}>
        <View style={styles.brandGroup}>
          {showBack ? (
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBack}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="Go back"
            >
              <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          ) : (
            <View style={styles.brandIconContainer}>
              <Ionicons name="laptop-outline" size={18} color={colors.cyan} />
            </View>
          )}

          <View style={styles.textContainer}>
            <Text style={styles.brandTitle} numberOfLines={1}>
              {title}
            </Text>
            {subtitle ? (
              <Text style={styles.brandSubtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : user ? (
              <View style={styles.userBadgeRow}>
                <Text style={styles.usernameText}>{user.username}</Text>
                <View style={[styles.roleBadge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
                  <Text style={[styles.roleBadgeText, { color: badge.text }]}>
                    {user.roleCode.replace('_', ' ')}
                  </Text>
                </View>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.rightActions}>
          {rightAction}

          {showLogout && user && (
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={logout}
              accessibilityLabel="Logout"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="log-out-outline" size={18} color={colors.textSecondary} />
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 40,
  },
  brandGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
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
  brandIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
  },
  brandTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: 0.3,
  },
  brandSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  userBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  usernameText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  roleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
    borderWidth: 1,
  },
  roleBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoutButton: {
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
