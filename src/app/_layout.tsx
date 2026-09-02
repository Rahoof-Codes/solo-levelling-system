import React, { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { setVisibilityAsync } from 'expo-navigation-bar';
import { initializeDatabase, DATABASE_NAME } from '@/db/database';
import { useNetworkSync } from '@/services/networkMonitor';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { Fonts } from '@/constants/theme';

// Prevent auto-hiding native splash until JS loads
SplashScreen.preventAutoHideAsync().catch(() => {});

// Enable full-screen immersive mode on Android
if (Platform.OS === 'android') {
  try {
    setVisibilityAsync('hidden').catch(() => {});
  } catch {
    // ignore on non-supported environments
  }
}

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

  useEffect(() => {
    if (Platform.OS === 'android') {
      try {
        setVisibilityAsync('hidden').catch(() => {});
      } catch {
        // ignore on non-supported environments
      }
    }
  }, []);

  return (
    <>
      <StatusBar hidden={true} style="light" />
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

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class SQLiteErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[SQLiteErrorBoundary] Caught database error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const isLockError =
        this.state.error?.message?.includes('createSyncAccessHandle') ||
        this.state.error?.name === 'NoModificationAllowedError';

      return (
        <View style={errorStyles.container}>
          <Text style={errorStyles.icon}>{isLockError ? '🔒' : '⚠️'}</Text>
          <Text style={errorStyles.title}>
            {isLockError ? 'DATABASE LOCKED // MULTIPLE TABS' : 'SYSTEM DATABASE ERROR'}
          </Text>
          <Text style={errorStyles.message}>
            {isLockError
              ? 'Another browser tab or window has the database open. Web SQLite requires an exclusive lock on the database file.'
              : this.state.error?.message || 'Database initialization failed'}
          </Text>
          <Text style={errorStyles.hint}>
            {isLockError
              ? 'Please close other localhost:8081 tabs and tap Reload below.'
              : 'Try restarting the app or clearing cache.'}
          </Text>
          {Platform.OS === 'web' && (
            <TouchableOpacity
              style={errorStyles.reloadBtn}
              onPress={() => {
                if (typeof window !== 'undefined') {
                  window.location.reload();
                }
              }}
              activeOpacity={0.7}
            >
              <Text style={errorStyles.reloadBtnText}>🔄 RELOAD PAGE</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    return this.props.children;
  }
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
    <SQLiteErrorBoundary>
      <SQLiteProvider databaseName={DATABASE_NAME} onInit={handleInit}>
        {children}
      </SQLiteProvider>
    </SQLiteErrorBoundary>
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
    textAlign: 'center',
  },
  reloadBtn: {
    backgroundColor: '#0055AA',
    borderWidth: 1,
    borderColor: '#00A8FF',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 12,
  },
  reloadBtnText: {
    fontFamily: Fonts.mono,
    fontSize: 13,
    fontWeight: '900',
    color: '#00F0FF',
    letterSpacing: 1,
  },
});
