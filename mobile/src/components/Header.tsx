import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  showLogout?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title = 'Faith IT Inventory',
  subtitle,
  showLogout = true,
}) => {
  const { user, logout } = useAuth();

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
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <View style={styles.brandGroup}>
          <View style={styles.brandIconContainer}>
            <Ionicons name="laptop-outline" size={20} color={colors.cyan} />
          </View>
          <View>
            <Text style={styles.brandTitle}>{title}</Text>
            {subtitle ? (
              <Text style={styles.brandSubtitle}>{subtitle}</Text>
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

        {showLogout && user && (
          <TouchableOpacity style={styles.logoutButton} onPress={logout} accessibilityLabel="Logout">
            <Ionicons name="log-out-outline" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
  brandTitle: {
    fontSize: 16,
    fontWeight: '700',
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
    fontWeight: '500',
  },
  roleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
    borderWidth: 1,
  },
  roleBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  logoutButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
