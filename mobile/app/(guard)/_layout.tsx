import React from 'react';
import { Stack } from 'expo-router';
import { colors } from '../../src/theme/colors';

export default function GuardLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="home" />
      <Stack.Screen name="outside" />
      <Stack.Screen name="movements" />
    </Stack>
  );
}
