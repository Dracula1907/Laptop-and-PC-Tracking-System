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
      case 'ADMIN':
        router.replace('/(admin)/dashboard');
        break;
      case 'MANAGER':
        router.replace('/(manager)/dashboard');
        break;
      case 'SECURITY_GUARD':
        router.replace('/(guard)/home');
        break;
      default:
        // Default to guard or admin depending on permissions
        if (user.permissions.includes('ASSET_VIEW')) {
          router.replace('/(admin)/dashboard');
        } else {
          router.replace('/(guard)/home');
        }
        break;
    }
  }, [user, isLoading]);

  return (
    <View style={styles.container}>
      <View style={styles.iconBox}>
        <Ionicons name="laptop-outline" size={48} color={colors.cyan} />
      </View>
      <Text style={styles.title}>FAITH AUTOMATION</Text>
      <Text style={styles.subtitle}>IT INVENTORY & ASSET TRACKING</Text>
      <ActivityIndicator size="small" color={colors.cyan} style={styles.loader} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  iconBox: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.borderCyan,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: colors.cyan,
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: 1.5,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 1,
    marginTop: 4,
  },
  loader: {
    marginTop: 32,
  },
});
