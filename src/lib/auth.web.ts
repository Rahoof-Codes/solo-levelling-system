// ============================================================
// Auth Module (Web) — Firebase Auth for Web with Popup / Direct Sign-In
// ============================================================

import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  type User,
} from 'firebase/auth';
import { auth } from './firebase';

/**
 * Configure Google Sign-In for web (no-op on web since web uses Firebase SDK directly).
 */
export function configureGoogleSignIn(): void {
  // Web does not require native GoogleSignin configuration
}

/**
 * Sign in with Google using Firebase Auth popup on web.
 */
export async function signInWithGoogle(): Promise<User | null> {
  if (!auth) {
    throw new Error('Firebase Auth is not configured. Check your .env file.');
  }

  try {
    const provider = new GoogleAuthProvider();
    provider.addScope('profile');
    provider.addScope('email');
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error: any) {
    if (error?.code === 'auth/popup-closed-by-user' || error?.code === 'auth/cancelled-popup-request') {
      return null;
    }
    console.error('[Auth Web] Sign-in error:', error);
    throw error;
  }
}

/**
 * Sign out from Firebase Auth on web.
 */
export async function signOutUser(): Promise<void> {
  if (auth) {
    await firebaseSignOut(auth);
  }
}

/**
 * Subscribe to Firebase Auth state changes.
 */
export function onAuthStateChanged(callback: (user: User | null) => void): () => void {
  if (!auth) {
    callback(null);
    return () => {};
  }
  return firebaseOnAuthStateChanged(auth, callback);
}

/**
 * Get the currently signed-in Firebase user synchronously.
 */
export function getCurrentUser(): User | null {
  return auth?.currentUser ?? null;
}
