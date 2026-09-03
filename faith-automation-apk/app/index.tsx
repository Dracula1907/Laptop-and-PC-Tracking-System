import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/context/AuthContext';
import { colors } from '../src/theme/colors';

export default function IndexScreen() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    switch (user.roleCode) {
      case 'ADMIN': router.replace('/(admin)/dashboard'); break;
      case 'MANAGER': router.replace('/(manager)/dashboard'); break;
      case 'SECURITY_GUARD': router.replace('/(guard)/home'); break;
      default:
        if (user.permissions.includes('ASSET_VIEW')) router.replace('/(admin)/dashboard');
        else router.replace('/(guard)/home');
    }
  }, [user, isLoading]);

  return (
    <View style={styles.container}>
      <View style={styles.iconBox}>
        <Ionicons name="laptop-outline" size={48} color={colors.cyanLight} />
      </View>
      <Text style={styles.title}>FAITH AUTOMATION</Text>
      <Text style={styles.subtitle}>IT INVENTORY</Text>
      <ActivityIndicator size="small" color={colors.cyanLight} style={{ marginTop: 32 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: colors.background,
    alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  iconBox: {
    width: 88, height: 88, borderRadius: 22,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderCyan,
    alignItems: 'center', justifyContent: 'center', marginBottom: 24,
    shadowColor: colors.cyanLight, shadowOpacity: 0.25, shadowRadius: 16, elevation: 10,
  },
  title: {
    fontSize: 22, fontWeight: '900', color: colors.textPrimary,
    letterSpacing: 2.5, textAlign: 'center',
  },
  subtitle: {
    fontSize: 13, fontWeight: '600', color: colors.cyanLight,
    letterSpacing: 3, marginTop: 6, textAlign: 'center',
  },
});
