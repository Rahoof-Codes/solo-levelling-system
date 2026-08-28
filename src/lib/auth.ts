// ============================================================
// Auth Module — Google Sign-In with Firebase Auth
// Uses the free "Original" GoogleSignin module.
// ============================================================

import {
  GoogleSignin,
  isErrorWithCode,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import {
  GoogleAuthProvider,
  signInWithCredential,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  type User,
} from 'firebase/auth';
import { auth } from './firebase';

/**
 * Configure Google Sign-In.
 * Must be called once before any sign-in attempt (typically in root layout).
 *
 * The webClientId comes from Firebase Console →
 *   Authentication → Sign-in method → Google → Web SDK configuration → Web client ID.
 */
export function configureGoogleSignIn(): void {
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '';

  GoogleSignin.configure({
    webClientId,
    offlineAccess: true,
  });
}

/**
 * Sign in with Google, then exchange the idToken for a Firebase Auth credential.
 * Returns the Firebase User object on success.
 */
export async function signInWithGoogle(): Promise<User | null> {
  if (!auth) {
    throw new Error('Firebase Auth is not configured. Check your .env file.');
  }

  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();

    if (!response.data?.idToken) {
      throw new Error('Google Sign-In succeeded but no idToken was returned.');
    }

    // Exchange Google idToken for Firebase credential
    const credential = GoogleAuthProvider.credential(response.data.idToken);
    const userCredential = await signInWithCredential(auth, credential);

    return userCredential.user;
  } catch (error: any) {
    if (isErrorWithCode(error)) {
      switch (error.code) {
        case statusCodes.SIGN_IN_CANCELLED:
          // User cancelled — not an error
          return null;
        case statusCodes.IN_PROGRESS:
          console.warn('[Auth] Sign-in already in progress');
          return null;
        case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
          throw new Error('Google Play Services is not available on this device.');
        default:
          throw error;
      }
    }
    throw error;
  }
}

/**
 * Sign out from both Firebase Auth and Google.
 */
export async function signOutUser(): Promise<void> {
  try {
    await GoogleSignin.signOut();
  } catch {
    // Google signout can fail if user wasn't signed in via Google — that's fine
  }

  if (auth) {
    await firebaseSignOut(auth);
  }
}

/**
 * Subscribe to Firebase Auth state changes.
 * Returns an unsubscribe function.
 */
export function onAuthStateChanged(callback: (user: User | null) => void): () => void {
  if (!auth) {
    // Firebase not configured — call with null immediately
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
