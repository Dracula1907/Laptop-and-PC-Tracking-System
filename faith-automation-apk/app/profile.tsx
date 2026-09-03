import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../src/context/AuthContext';
import { getApiBaseUrl } from '../src/api/client';
import { colors } from '../src/theme/colors';

export default function ProfileScreen() {
  const { user, logout, isLoggingOut } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = () => {
    if (loggingOut || isLoggingOut) return;
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out of your current account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            setLoggingOut(true);
            await logout();
            setLoggingOut(false);
          },
        },
      ],
      { cancelable: true }
    );
  };

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'ADMIN': return { color: colors.cyanLight, bg: colors.cyanGlow, border: colors.borderCyan, label: 'System Administrator' };
      case 'MANAGER': return { color: colors.emeraldLight, bg: colors.emeraldBg, border: colors.emeraldBorder, label: 'Department Manager' };
      case 'SECURITY_GUARD': return { color: colors.amberLight, bg: colors.amberBg, border: colors.amberBorder, label: 'Security Guard' };
      default: return { color: colors.textSecondary, bg: colors.card, border: colors.border, label: 'User' };
    }
  };

  if (!user) return null;
  const badge = getRoleBadge(user.roleCode);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Account Profile</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={[styles.avatarBox, { borderColor: badge.border, backgroundColor: badge.bg }]}>
            <Ionicons name="person" size={36} color={badge.color} />
          </View>
          <Text style={styles.username}>{user.username}</Text>
          <View style={[styles.rolePill, { backgroundColor: badge.bg, borderColor: badge.border }]}>
            <Text style={[styles.rolePillText, { color: badge.color }]}>{badge.label}</Text>
          </View>
          {user.employeeId && (
            <Text style={styles.empId}>Employee ID: {user.employeeId}</Text>
          )}
        </View>

        {/* Session Info */}
        <View style={styles.infoCard}>
          <Text style={styles.infoCardTitle}>SESSION DETAILS</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Username</Text>
            <Text style={styles.infoValue}>{user.username}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Role Code</Text>
            <Text style={styles.infoValue}>{user.roleCode}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>API Server</Text>
            <Text style={[styles.infoValue, { fontSize: 10, fontFamily: 'monospace' }]}>{getApiBaseUrl()}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Permissions</Text>
            <Text style={styles.infoValue}>{user.permissions.length} granted</Text>
          </View>
        </View>

        {/* Permissions */}
        {user.permissions.length > 0 && (
          <View style={styles.infoCard}>
            <Text style={styles.infoCardTitle}>AUTHORIZED PERMISSIONS</Text>
            <View style={styles.permGrid}>
              {user.permissions.map((perm) => (
                <View key={perm} style={styles.permChip}>
                  <Text style={styles.permChipText}>{perm.replace(/_/g, ' ')}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Sign Out */}
        <TouchableOpacity
          style={[styles.signOutBtn, (loggingOut || isLoggingOut) && styles.signOutBtnDisabled]}
          onPress={handleLogout}
          disabled={loggingOut || isLoggingOut}
        >
          {loggingOut || isLoggingOut ? (
            <>
              <ActivityIndicator size="small" color={colors.roseLight} />
              <Text style={styles.signOutText}>Signing out...</Text>
            </>
          ) : (
            <>
              <Ionicons name="log-out-outline" size={20} color={colors.roseLight} />
              <Text style={styles.signOutText}>Sign Out of Current Account</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.footer}>Faith Automation IT Inventory v1.0</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 8,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  content: { padding: 20, gap: 16 },
  profileCard: {
    backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border,
    padding: 24, alignItems: 'center', gap: 12,
  },
  avatarBox: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2,
  },
  username: { fontSize: 22, fontWeight: '800', color: colors.textPrimary },
  rolePill: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1,
  },
  rolePillText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.4 },
  empId: { fontSize: 12, color: colors.textMuted, fontFamily: 'monospace' },
  infoCard: {
    backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border,
    overflow: 'hidden',
  },
  infoCardTitle: {
    fontSize: 10, fontWeight: '700', color: colors.textMuted, letterSpacing: 1,
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: colors.cardElevated, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 0.5, borderBottomColor: colors.border,
  },
  infoLabel: { fontSize: 13, color: colors.textSecondary },
  infoValue: { fontSize: 13, color: colors.textPrimary, fontWeight: '600', flex: 1, textAlign: 'right' },
  permGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 8 },
  permChip: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6,
    backgroundColor: colors.cyanGlow, borderWidth: 1, borderColor: colors.borderCyan,
  },
  permChipText: { fontSize: 10, color: colors.cyanLight, fontWeight: '700', letterSpacing: 0.3 },
  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    paddingVertical: 16, borderRadius: 12,
    backgroundColor: colors.roseBg, borderWidth: 1, borderColor: colors.roseBorder,
  },
  signOutBtnDisabled: { opacity: 0.6 },
  signOutText: { fontSize: 15, fontWeight: '700', color: colors.roseLight },
  footer: { textAlign: 'center', fontSize: 11, color: colors.textMuted },
});
