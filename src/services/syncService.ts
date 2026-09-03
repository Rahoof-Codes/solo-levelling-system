// ============================================================
// Sync Queue Service — Bidirectional Push/Pull with Firebase Firestore
// Implements Last-Write-Wins conflict resolution via updated_at.
// Data is now scoped per-user: /users/{userId}/{table}/{docId}
// ============================================================

import { type SQLiteDatabase } from 'expo-sqlite';
import { db as firestoreDb, isFirebaseConfigured } from '@/lib/firebase';
import {
  getUnsyncedRows,
  markRowsSynced,
  getLastSyncedAt,
  setLastSyncedAt,
  upsertRemoteRows,
} from '@/db/operations';
import { SYNCABLE_TABLES } from '@/db/schema';
import {
  collection,
  doc,
  writeBatch,
  getDocs,
  query,
  where,
} from 'firebase/firestore';

export interface SyncResult {
  success: boolean;
  pushedCount: number;
  pulledCount: number;
  error?: string;
}

/**
 * Main synchronization routine (per-user scoped):
 * 1. Push all rows where synced = 0 to Firestore at /users/{userId}/{table}/{docId}
 * 2. Mark pushed rows synced = 1
 * 3. Pull remote docs where updated_at > last_synced_at, upsert locally
 * 4. Update last_synced_at in local sync_metadata table
 *
 * @param userId — The Firebase Auth UID. If null, runs in local-only mode.
 */
export async function syncPendingRecords(db: SQLiteDatabase, userId: string | null): Promise<SyncResult> {
  if (!isFirebaseConfigured() || !firestoreDb || !userId) {
    // Graceful offline/guest mode: Firebase is not configured or user not signed in
    return {
      success: true,
      pushedCount: 0,
      pulledCount: 0,
      error: !userId
        ? 'Not signed in (running in local-only/guest mode)'
        : 'Firebase credentials not configured (running in local-only mode)',
    };
  }

  let totalPushed = 0;
  let totalPulled = 0;
  const syncStartTime = new Date().toISOString();

  try {
    const lastSyncedAt = await getLastSyncedAt(db);

    // ============================================================
    // STEP 1: PUSH LOCAL UNSYNCED ROWS TO FIRESTORE
    // Path: /users/{userId}/{table}/{docId}
    // ============================================================
    for (const table of SYNCABLE_TABLES) {
      try {
        const unsyncedRows = await getUnsyncedRows<any>(db, table);
        if (unsyncedRows.length === 0) continue;

        // Clean rows (remove local-only synced flag & sanitize undefined values)
        const cleanRows = unsyncedRows.map(({ synced, ...rest }) => {
          const sanitized: Record<string, any> = {};
          for (const key of Object.keys(rest)) {
            const val = rest[key];
            sanitized[key] = val === undefined ? null : val;
          }
          return sanitized;
        });

        // Firestore batches support up to 500 operations
        const BATCH_SIZE = 400;
        for (let i = 0; i < cleanRows.length; i += BATCH_SIZE) {
          const chunk = cleanRows.slice(i, i + BATCH_SIZE);
          const batch = writeBatch(firestoreDb);

          for (const row of chunk) {
            if (!row || !row.id) continue;
            // Per-user path: /users/{userId}/{table}/{docId}
            const docRef = doc(firestoreDb, 'users', userId, table, String(row.id));
            batch.set(docRef, row, { merge: true });
          }

          await batch.commit();
        }

        // Mark pushed rows as synced = 1 locally
        const pushedIds = unsyncedRows.map((r) => r.id).filter(Boolean);
        await markRowsSynced(db, table, pushedIds);
        totalPushed += pushedIds.length;
      } catch (tableErr) {
        console.warn(`[Sync] Issue pushing table ${table}:`, tableErr);
      }
    }

    // ============================================================
    // STEP 2: PULL REMOTE ROWS UPDATED AFTER LAST_SYNCED_AT
    // Path: /users/{userId}/{table}
    // ============================================================
    for (const table of SYNCABLE_TABLES) {
      try {
        const colRef = collection(firestoreDb, 'users', userId, table);
        const q = lastSyncedAt
          ? query(colRef, where('updated_at', '>', lastSyncedAt))
          : query(colRef);

        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
          const remoteRows = snapshot.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          }));
          await upsertRemoteRows(db, table, remoteRows);
          totalPulled += remoteRows.length;
        }
      } catch (tableErr) {
        console.warn(`[Sync] Issue pulling table ${table}:`, tableErr);
      }
    }

    // ============================================================
    // STEP 3: UPDATE LAST_SYNCED_AT
    // ============================================================
    await setLastSyncedAt(db, syncStartTime);

    return {
      success: true,
      pushedCount: totalPushed,
      pulledCount: totalPulled,
    };
  } catch (err: any) {
    console.warn('[Sync] Background sync encountered an issue:', err?.message ?? err);
    return {
      success: false,
      pushedCount: totalPushed,
      pulledCount: totalPulled,
      error: err?.message ?? 'Unknown sync error',
    };
  }
}
