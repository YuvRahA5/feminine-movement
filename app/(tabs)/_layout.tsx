import React from 'react';
import { Redirect, Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/auth';
import { Loading } from '../../src/ui';
import { C, F } from '../../src/theme';

// Tabs are declared left-to-right, so for Hebrew "בית" comes last (rightmost).
export default function TabsLayout() {
  const { ready, session, profile } = useAuth();
  if (!ready) return <Loading />;
  if (!session || !profile?.onboarded_at || profile.notifications_ok === null) return <Redirect href="/" />;

  const icon = (name: any) => ({ color, size }: { color: string; size: number }) => <Ionicons name={name} size={size} color={color} />;
  return (
    <Tabs
      initialRouteName="home"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.gold,
        tabBarInactiveTintColor: C.dim,
        tabBarStyle: { backgroundColor: '#140E10', borderTopColor: C.borderSoft },
        tabBarLabelStyle: { fontFamily: F.semibold, fontSize: 12 },
      }}
    >
      <Tabs.Screen name="profile" options={{ title: 'פרופיל', tabBarIcon: icon('person-outline') }} />
      <Tabs.Screen name="journey" options={{ title: 'המסע', tabBarIcon: icon('star-outline') }} />
      <Tabs.Screen name="schedule" options={{ title: 'מערכת', tabBarIcon: icon('calendar-outline') }} />
      <Tabs.Screen name="home" options={{ title: 'בית', tabBarIcon: icon('home-outline') }} />
    </Tabs>
  );
}
