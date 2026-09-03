// ============================================================
// Sync Queue Service — Bidirectional Push/Pull with Firebase Firestore
// Implements Last-Write-Wins & Highest-XP conflict resolution.
// Data is scoped per-user: /users/{userId}/{table}/{docId}
// ============================================================

import { type SQLiteDatabase } from 'expo-sqlite';
import { db as firestoreDb, isFirebaseConfigured } from '@/lib/firebase';
import {
  getUnsyncedRows,
  markRowsSynced,
  getLastSyncedAt,
  setLastSyncedAt,
  upsertRemoteRows,
  deduplicateQuests,
  deduplicateProfiles,
  getProfile,
} from '@/db/operations';
import { SYNCABLE_TABLES } from '@/db/schema';
import {
  collection,
  doc,
  writeBatch,
  getDocs,
  query,
  where,
  deleteDoc,
} from 'firebase/firestore';

export interface SyncResult {
  success: boolean;
  pushedCount: number;
  pulledCount: number;
  error?: string;
}

/**
 * Main synchronization routine (per-user scoped):
 * 1. PULL remote docs from Firestore to get cloud state (merges profile & deduplicates quests)
 * 2. Deduplicate local SQLite records (profiles & quests)
 * 3. PUSH remaining local unsynced rows where synced = 0
 * 4. Update last_synced_at timestamp
 *
 * @param userId — The Firebase Auth UID. If null, runs in local-only mode.
 */
export async function syncPendingRecords(db: SQLiteDatabase, userId: string | null): Promise<SyncResult> {
  if (!isFirebaseConfigured() || !firestoreDb || !userId) {
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
    // STEP 1: PULL REMOTE ROWS FROM FIRESTORE FIRST
    // ============================================================
    for (const table of SYNCABLE_TABLES) {
      try {
        const colRef = collection(firestoreDb, 'users', userId, table);

        if (table === 'profiles') {
          // Always inspect all remote profile docs for the user to find the best/highest XP profile
          const snapshot = await getDocs(colRef);
          if (!snapshot.empty) {
            const remoteProfiles = snapshot.docs.map((d) => ({
              id: d.id,
              ...d.data(),
            })) as any[];

            // Sort by total_xp DESC, level DESC, updated_at DESC
            remoteProfiles.sort((a, b) => {
              const xpDiff = (Number(b.total_xp) || 0) - (Number(a.total_xp) || 0);
              if (xpDiff !== 0) return xpDiff;
              const lvlDiff = (Number(b.level) || 0) - (Number(a.level) || 0);
              if (lvlDiff !== 0) return lvlDiff;
              return new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime();
            });

            const bestProfile = remoteProfiles[0];

            // If there are duplicate/empty profile documents in Firestore, clean them up
            if (remoteProfiles.length > 1) {
              for (let i = 1; i < remoteProfiles.length; i++) {
                try {
                  await deleteDoc(doc(firestoreDb, 'users', userId, 'profiles', remoteProfiles[i].id));
                } catch (delErr) {
                  console.warn('[Sync] Could not delete duplicate remote profile:', delErr);
                }
              }
            }

            await upsertRemoteRows(db, 'profiles', [bestProfile]);
            totalPulled += 1;
          }
        } else if (table === 'quests') {
          // Pull remote quests: if lastSyncedAt exists, query updated, otherwise all
          const q = lastSyncedAt
            ? query(colRef, where('updated_at', '>', lastSyncedAt))
            : query(colRef);

          const snapshot = await getDocs(q);
          if (!snapshot.empty) {
            const rawQuests = snapshot.docs.map((d) => ({
              id: d.id,
              ...d.data(),
            })) as any[];

            // Group by (LOWER(TRIM(title)), due_date) to prevent duplicate quest documents from remote
            const questMap = new Map<string, any[]>();
            for (const r of rawQuests) {
              const key = `${String(r.title || '').toLowerCase().trim()}:::${String(r.due_date || '').trim()}`;
              const list = questMap.get(key) || [];
              list.push(r);
              questMap.set(key, list);
            }

            const uniqueQuests: any[] = [];
            for (const [, group] of questMap) {
              // Prefer completed quests, then newest updated_at
              group.sort((a, b) => {
                const compDiff = (b.is_completed ? 1 : 0) - (a.is_completed ? 1 : 0);
                if (compDiff !== 0) return compDiff;
                return new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime();
              });

              const keep = group[0];
              uniqueQuests.push(keep);

              // Delete any duplicate remote quest docs from Firestore
              if (group.length > 1) {
                for (let i = 1; i < group.length; i++) {
                  try {
                    await deleteDoc(doc(firestoreDb, 'users', userId, 'quests', group[i].id));
                  } catch (delErr) {
                    console.warn('[Sync] Could not delete duplicate remote quest:', delErr);
                  }
                }
              }
            }

            await upsertRemoteRows(db, 'quests', uniqueQuests);
            totalPulled += uniqueQuests.length;
          }
        } else {
          // Standard pull for other tables (meals, activities, workout_logs, etc.)
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
        }
      } catch (tableErr) {
        console.warn(`[Sync] Issue pulling table ${table}:`, tableErr);
      }
    }

    // Run defensive local deduplication
    await deduplicateProfiles(db);
    await deduplicateQuests(db);

    // ============================================================
    // STEP 2: PUSH LOCAL UNSYNCED ROWS TO FIRESTORE
    // ============================================================
    for (const table of SYNCABLE_TABLES) {
      try {
        if (table === 'profiles') {
          // Push only the single active profile
          const currentProfile = await getProfile(db);
          if (currentProfile && (currentProfile as any).synced === 0) {
            const { synced, ...rest } = currentProfile as any;
            const sanitized: Record<string, any> = {};
            for (const key of Object.keys(rest)) {
              const val = rest[key];
              sanitized[key] = val === undefined ? null : val;
            }

            const docRef = doc(firestoreDb, 'users', userId, 'profiles', String(currentProfile.id));
            const batch = writeBatch(firestoreDb);
            batch.set(docRef, sanitized, { merge: true });
            await batch.commit();

            await markRowsSynced(db, 'profiles', [currentProfile.id]);
            totalPushed += 1;
          }
          continue;
        }

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
