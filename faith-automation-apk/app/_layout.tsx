import React, { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { colors } from '../src/theme/colors';

function RootNavigation() {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => { setIsMounted(true); }, []);

  useEffect(() => {
    if (!isMounted || isLoading) return;

    const seg = segments[0] as string | undefined;
    const inProtected = seg === '(admin)' || seg === '(manager)' || seg === '(guard)' || seg === 'profile';

    if (!user) {
      if (inProtected) router.replace('/login');
    } else {
      if (seg === 'login') {
        const role = user.roleCode;
        if (role === 'ADMIN') router.replace('/(admin)/dashboard');
        else if (role === 'MANAGER') router.replace('/(manager)/dashboard');
        else if (role === 'SECURITY_GUARD') router.replace('/(guard)/home');
      } else if (seg === '(admin)' && user.roleCode !== 'ADMIN') {
        if (user.roleCode === 'MANAGER') router.replace('/(manager)/dashboard');
        else router.replace('/(guard)/home');
      } else if (seg === '(manager)' && user.roleCode !== 'MANAGER') {
        if (user.roleCode === 'ADMIN') router.replace('/(admin)/dashboard');
        else router.replace('/(guard)/home');
      } else if (seg === '(guard)' && user.roleCode !== 'SECURITY_GUARD') {
        if (user.roleCode === 'ADMIN') router.replace('/(admin)/dashboard');
        else router.replace('/(manager)/dashboard');
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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <RootNavigation />
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
