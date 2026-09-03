import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '../src/components/Header';
import { useAuth } from '../src/context/AuthContext';
import { colors } from '../src/theme/colors';
import { API_BASE_URL } from '../src/api/client';

export default function ProfileScreen() {
  const { user, logout, isLoggingOut } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  if (!user) {
    return null;
  }

  const handleSignOut = () => {
    if (isLoggingOut) return;

    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await logout();
          },
        },
      ],
      { cancelable: true }
    );
  };

  const getRoleTheme = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return {
          badgeBg: 'rgba(6, 182, 212, 0.15)',
          badgeText: colors.cyan,
          badgeBorder: colors.borderCyan,
          label: 'SYSTEM ADMINISTRATOR',
        };
      case 'MANAGER':
        return {
          badgeBg: 'rgba(16, 185, 129, 0.15)',
          badgeText: colors.emerald,
          badgeBorder: colors.emeraldBorder,
          label: 'DEPARTMENT MANAGER',
        };
      case 'SECURITY_GUARD':
        return {
          badgeBg: 'rgba(245, 158, 11, 0.15)',
          badgeText: colors.amber,
          badgeBorder: colors.amberBorder,
          label: 'SECURITY GATE OFFICER',
        };
      default:
        return {
          badgeBg: 'rgba(148, 163, 184, 0.15)',
          badgeText: colors.textSecondary,
          badgeBorder: colors.border,
          label: role,
        };
    }
  };

  const roleTheme = getRoleTheme(user.roleCode);

  return (
    <View style={styles.container}>
      <Header
        title="Account Profile"
        subtitle="Identity & Session Authorization"
        showBack={true}
        showLogout={false}
        onBack={() => router.back()}
      />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom + 24, 32) },
        ]}
      >
        {/* User Identity Card */}
        <View style={styles.card}>
          <View style={styles.avatarRow}>
            <View style={[styles.avatarCircle, { borderColor: roleTheme.badgeBorder }]}>
              <Ionicons name="person" size={36} color={roleTheme.badgeText} />
            </View>
            <View style={styles.identityInfo}>
              <Text style={styles.userName}>{user.username}</Text>
              <Text style={styles.roleName}>{user.roleName || user.roleCode}</Text>
              <View style={[styles.roleBadge, { backgroundColor: roleTheme.badgeBg, borderColor: roleTheme.badgeBorder }]}>
                <Text style={[styles.roleBadgeText, { color: roleTheme.badgeText }]}>
                  {roleTheme.label}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Credentials & Identification */}
        <Text style={styles.sectionHeader}>CREDENTIALS & IDENTIFIERS</Text>
        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>User ID</Text>
            <Text style={styles.detailValueMono} numberOfLines={1}>{user.userId}</Text>
          </View>
          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Username</Text>
            <Text style={styles.detailValue}>{user.username}</Text>
          </View>
          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Employee ID</Text>
            <Text style={styles.detailValue}>{user.employeeId || 'FAITH-EMP-001'}</Text>
          </View>
          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Role Classification</Text>
            <Text style={[styles.detailValue, { color: roleTheme.badgeText, fontWeight: '700' }]}>
              {user.roleCode}
            </Text>
          </View>
        </View>

        {/* Permissions Matrix */}
        <Text style={styles.sectionHeader}>AUTHORIZED ROLE PERMISSIONS</Text>
        <View style={styles.detailsCard}>
          {user.permissions && user.permissions.length > 0 ? (
            <View style={styles.permWrap}>
              {user.permissions.map((perm, idx) => (
                <View key={idx} style={styles.permChip}>
                  <Ionicons name="checkmark-circle" size={13} color={colors.cyan} />
                  <Text style={styles.permText}>{perm}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyPerms}>Standard role privileges active.</Text>
          )}
        </View>

        {/* Active Session & Network Status */}
        <Text style={styles.sectionHeader}>SESSION & NETWORK</Text>
        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Authentication</Text>
            <View style={styles.activePill}>
              <View style={styles.activeDot} />
              <Text style={styles.activeText}>AUTHENTICATED</Text>
            </View>
          </View>
          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Server URL</Text>
            <Text style={styles.detailValueMono} numberOfLines={1}>{API_BASE_URL}</Text>
          </View>
        </View>

        {/* Primary Universal Logout Button */}
        <TouchableOpacity
          style={[styles.signOutButton, isLoggingOut && styles.signOutButtonDisabled]}
          onPress={handleSignOut}
          disabled={isLoggingOut}
          activeOpacity={0.8}
        >
          {isLoggingOut ? (
            <View style={styles.btnRow}>
              <ActivityIndicator size="small" color={colors.textPrimary} />
              <Text style={styles.signOutText}>Signing out...</Text>
            </View>
          ) : (
            <View style={styles.btnRow}>
              <Ionicons name="log-out-outline" size={20} color={colors.textPrimary} />
              <Text style={styles.signOutText}>Sign Out of Current Account</Text>
            </View>
          )}
        </TouchableOpacity>

        <Text style={styles.logoutNote}>
          Signing out will invalidate the active token and return you to the Enterprise Sign In terminal.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.surface,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identityInfo: {
    flex: 1,
    gap: 4,
  },
  userName: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },
  roleName: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    marginTop: 2,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  sectionHeader: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.8,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  detailsCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  detailLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  detailValueMono: {
    fontSize: 11,
    color: colors.cyanLight,
    fontFamily: 'monospace',
    maxWidth: '65%',
    textAlign: 'right',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  permWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingVertical: 6,
  },
  permChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  permText: {
    fontSize: 11,
    color: colors.textPrimary,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  emptyPerms: {
    fontSize: 12,
    color: colors.textMuted,
    fontStyle: 'italic',
    paddingVertical: 6,
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.emeraldBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.emeraldBorder,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.emerald,
  },
  activeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.emeraldLight,
    letterSpacing: 0.5,
  },
  signOutButton: {
    backgroundColor: colors.rose,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    shadowColor: colors.rose,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  signOutButtonDisabled: {
    opacity: 0.6,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  signOutText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  logoutNote: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 16,
    marginTop: 4,
  },
});
