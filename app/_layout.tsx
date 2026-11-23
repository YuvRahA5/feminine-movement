import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts, Rubik_400Regular, Rubik_500Medium, Rubik_600SemiBold, Rubik_700Bold,
} from '@expo-google-fonts/rubik';
import { AuthProvider } from '../src/auth';
import { Loading } from '../src/ui';
import { C } from '../src/theme';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Rubik_400Regular, Rubik_500Medium, Rubik_600SemiBold, Rubik_700Bold });
  if (!fontsLoaded) return <Loading />;
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg }, animation: 'fade' }} />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
