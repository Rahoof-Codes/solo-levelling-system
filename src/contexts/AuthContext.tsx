// ============================================================
// Auth Context — Global authentication state provider
// Wraps the entire app to provide user + sign-in/out methods.
// ============================================================

import React, { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { type User } from 'firebase/auth';
import {
  configureGoogleSignIn,
  signInWithGoogle,
  signOutUser,
  onAuthStateChanged,
} from '@/lib/auth';

interface AuthContextType {
  /** The currently signed-in Firebase user, or null if guest/not signed in. */
  user: User | null;
  /** True while we're determining initial auth state. */
  isLoading: boolean;
  /** True while a sign-in or sign-out operation is in progress. */
  isAuthenticating: boolean;
  /** Whether the user chose to continue as guest. */
  isGuest: boolean;
  /** Trigger Google Sign-In flow. */
  signIn: () => Promise<void>;
  /** Sign out of Firebase + Google. */
  signOut: () => Promise<void>;
  /** Continue without signing in. */
  continueAsGuest: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    // Configure Google Sign-In once on mount
    configureGoogleSignIn();

    // Safety fallback timeout to ensure app never hangs on loading
    const safetyTimer = setTimeout(() => {
      console.warn('[AuthContext] Safety timeout fired — Firebase auth did not respond in time');
      setIsLoading(false);
    }, 3000);

    // Listen for Firebase auth state changes
    const unsubscribe = onAuthStateChanged((firebaseUser) => {
      clearTimeout(safetyTimer);
      setUser(firebaseUser);
      setIsLoading(false);
    });

    return () => {
      clearTimeout(safetyTimer);
      unsubscribe();
    };
  }, []);

  const signIn = useCallback(async () => {
    setIsAuthenticating(true);
    try {
      const firebaseUser = await signInWithGoogle();
      if (firebaseUser) {
        setIsGuest(false);
      }
    } catch (error) {
      console.error('[AuthContext] Sign-in error:', error);
      throw error;
    } finally {
      setIsAuthenticating(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    setIsAuthenticating(true);
    try {
      await signOutUser();
      setUser(null);
      setIsGuest(false);
    } catch (error) {
      console.error('[AuthContext] Sign-out error:', error);
    } finally {
      setIsAuthenticating(false);
    }
  }, []);

  const continueAsGuest = useCallback(() => {
    setIsGuest(true);
    setIsLoading(false);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticating,
        isGuest,
        signIn,
        signOut,
        continueAsGuest,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to access auth state and methods.
 * Must be used within an <AuthProvider>.
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an <AuthProvider>');
  }
  return context;
}
