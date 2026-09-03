import React, { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { colors } from '../src/theme/colors';

function RootNavigation() {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted || isLoading) return;

    const currentSegment = segments[0] as string | undefined;
    const isAuthGroup =
      currentSegment === '(admin)' ||
      currentSegment === '(manager)' ||
      currentSegment === '(guard)' ||
      currentSegment === 'profile';
    const isLoginScreen = currentSegment === 'login';

    if (!user) {
      // If user is logged out and in any protected screen, reset to login immediately
      if (isAuthGroup) {
        router.replace('/login');
      }
    } else {
      // User is logged in
      const role = user.roleCode;

      if (isLoginScreen) {
        if (role === 'ADMIN') {
          router.replace('/(admin)/dashboard');
        } else if (role === 'MANAGER') {
          router.replace('/(manager)/dashboard');
        } else if (role === 'SECURITY_GUARD') {
          router.replace('/(guard)/home');
        } else {
          if (user.permissions?.includes('ASSET_VIEW')) {
            router.replace('/(admin)/dashboard');
          } else {
            router.replace('/(guard)/home');
          }
        }
      } else if (currentSegment === '(admin)' && role !== 'ADMIN') {
        if (role === 'MANAGER') router.replace('/(manager)/dashboard');
        else if (role === 'SECURITY_GUARD') router.replace('/(guard)/home');
      } else if (currentSegment === '(manager)' && role !== 'MANAGER') {
        if (role === 'ADMIN') router.replace('/(admin)/dashboard');
        else if (role === 'SECURITY_GUARD') router.replace('/(guard)/home');
      } else if (currentSegment === '(guard)' && role !== 'SECURITY_GUARD') {
        if (role === 'ADMIN') router.replace('/(admin)/dashboard');
        else if (role === 'MANAGER') router.replace('/(manager)/dashboard');
      }
    }
  }, [user, isLoading, segments, isMounted]);

  return (
    <>
      <StatusBar style="light" backgroundColor={colors.background} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="(admin)" />
        <Stack.Screen name="(manager)" />
        <Stack.Screen name="(guard)" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RootNavigation />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
