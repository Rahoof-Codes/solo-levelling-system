// ============================================================
// Network & AppState Monitor for Auto-Sync
// ============================================================

import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import { type SQLiteDatabase } from 'expo-sqlite';
import { syncPendingRecords } from './syncService';

/**
 * Hook to automatically trigger syncPendingRecords when:
 * 1. App transitions to 'active' (foreground)
 * 2. Device reconnects to network (offline -> online)
 *
 * @param userId — Firebase Auth UID. If null, sync runs in local-only/guest mode.
 */
export function useNetworkSync(db: SQLiteDatabase | null, userId: string | null): void {
  const isSyncingRef = useRef(false);
  const wasConnectedRef = useRef<boolean | null>(null);

  const runSync = async () => {
    if (!db || isSyncingRef.current) return;
    try {
      isSyncingRef.current = true;
      await syncPendingRecords(db, userId);
    } catch (err) {
      console.warn('[AutoSync] Error running background sync:', err);
    } finally {
      isSyncingRef.current = false;
    }
  };

  useEffect(() => {
    if (!db) return;

    // Initial sync attempt on mount
    runSync();

    // 1. AppState listener (foreground trigger)
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        runSync();
      }
    };
    const appStateSub = AppState.addEventListener('change', handleAppStateChange);

    // 2. NetInfo listener (reconnect trigger)
    const unsubscribeNetInfo = NetInfo.addEventListener((state: NetInfoState) => {
      const isConnected = Boolean(state.isConnected && state.isInternetReachable !== false);

      // Trigger if we were previously offline and now online
      if (wasConnectedRef.current === false && isConnected) {
        runSync();
      }
      wasConnectedRef.current = isConnected;
    });

    return () => {
      appStateSub.remove();
      unsubscribeNetInfo();
    };
  }, [db, userId]);
}
