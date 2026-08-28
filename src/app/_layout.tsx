import React, { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet } from 'react-native';
import { initializeDatabase, DATABASE_NAME } from '@/db/database';
import { useNetworkSync } from '@/services/networkMonitor';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';

// Prevent auto-hiding native splash until JS loads
SplashScreen.preventAutoHideAsync().catch(() => {});

/**
 * Handles redirecting users based on authentication state
 */
function AuthRoutingHandler() {
  const { user, isGuest, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const isAuthenticated = user !== null || isGuest;
    const currentRoute = (segments[0] as string) || '';
    const inAuthGroup = currentRoute === 'login';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/login' as any);
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)' as any);
    }
  }, [user, isGuest, isLoading, segments]);

  return null;
}

function MainNavigation() {
  const db = useSQLiteContext();
  const { user } = useAuth();

  const userId = user?.uid ?? null;
  useNetworkSync(db, userId);

  return (
    <>
      <StatusBar style="light" />
      <AuthRoutingHandler />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#070B14' },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding/index" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}

/**
 * Wraps SQLiteProvider with error handling so a DB init failure
 * doesn't silently hang the entire app on a blank screen.
 */
function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const [dbError, setDbError] = useState<string | null>(null);

  const handleInit = async (db: any) => {
    try {
      await initializeDatabase(db);
    } catch (err: any) {
      console.error('[DB] Initialization failed:', err);
      setDbError(err?.message || 'Database initialization failed');
      // Don't re-throw — let the app continue so user isn't stuck
    }
  };

  if (dbError) {
    return (
      <View style={errorStyles.container}>
        <Text style={errorStyles.icon}>⚠️</Text>
        <Text style={errorStyles.title}>SYSTEM ERROR</Text>
        <Text style={errorStyles.message}>{dbError}</Text>
        <Text style={errorStyles.hint}>Try restarting the app</Text>
      </View>
    );
  }

  return (
    <SQLiteProvider databaseName={DATABASE_NAME} onInit={handleInit}>
      {children}
    </SQLiteProvider>
  );
}

export default function RootLayout() {
  useEffect(() => {
    // Hide the native splash screen once the JS bundle is loaded and layout mounts
    const timer = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {});
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AuthProvider>
      <DatabaseProvider>
        <MainNavigation />
      </DatabaseProvider>
    </AuthProvider>
  );
}

const errorStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070B14',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  icon: {
    fontSize: 48,
  },
  title: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FF4444',
    letterSpacing: 2,
  },
  message: {
    fontSize: 12,
    color: '#6582A6',
    textAlign: 'center',
  },
  hint: {
    fontSize: 10,
    color: '#4B6282',
    marginTop: 8,
  },
});
