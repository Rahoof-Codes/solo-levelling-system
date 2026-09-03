import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { Fonts, Spacing } from '@/constants/theme';

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
  const { signIn, continueAsGuest, isAuthenticating } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setError(null);
    try {
      await signIn();
    } catch (err: any) {
      const message = err?.message ?? 'Sign-in failed. Please try again.';
      setError(message);
      Alert.alert('Error', message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Background glow effects */}
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />

      <View style={styles.content}>
        {/* Header with Logo */}
        <View style={styles.headerSection}>
          <Image
            source={require('@/../assets/images/shadow-logo.png')}
            style={styles.logoImage}
            resizeMode="cover"
          />
          <Text style={styles.systemLabel}>Shadow Fitness</Text>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>SHADOW</Text>
            <Text style={styles.titleAccent}>FITNESS</Text>
          </View>
          <Text style={styles.subtitle}>
            Train • Level Up • Conquer
          </Text>
          <View style={styles.divider} />
          <Text style={styles.tagline}>
            "Only I level up."
          </Text>
        </View>

        {/* Status Box */}
        <View style={styles.statusBox}>
          <View style={styles.statusRow}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Ready</Text>
          </View>
          <Text style={styles.statusDetail}>
            Sign in to start your journey
          </Text>
        </View>

        {/* Auth Buttons */}
        <View style={styles.buttonsSection}>
          {/* Google Sign-In Button */}
          <TouchableOpacity
            style={[styles.googleButton, isAuthenticating && styles.buttonDisabled]}
            onPress={handleGoogleSignIn}
            disabled={isAuthenticating}
            activeOpacity={0.8}
          >
            {isAuthenticating ? (
              <ActivityIndicator color="#0B1120" size="small" />
            ) : (
              <>
                <Text style={styles.googleIcon}>G</Text>
                <Text style={styles.googleButtonText}>Continue with Google</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Guest Mode */}
          <TouchableOpacity
            style={styles.guestButton}
            onPress={continueAsGuest}
            disabled={isAuthenticating}
            activeOpacity={0.7}
          >
            <Text style={styles.guestButtonText}>
              Play as Guest (local only)
            </Text>
          </TouchableOpacity>

          {error && (
            <Text style={styles.errorText}>⚠️ {error}</Text>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Offline-first · Your data is always saved locally
          </Text>
          <Text style={styles.versionText}>v1.2.1</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B1120',
  },
  glowTop: {
    position: 'absolute',
    top: -height * 0.15,
    left: width * 0.2,
    width: width * 0.6,
    height: height * 0.35,
    borderRadius: 999,
    backgroundColor: 'rgba(0, 168, 255, 0.05)',
  },
  glowBottom: {
    position: 'absolute',
    bottom: -height * 0.1,
    right: width * 0.1,
    width: width * 0.5,
    height: height * 0.25,
    borderRadius: 999,
    backgroundColor: 'rgba(0, 168, 255, 0.03)',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.five,
  },
  headerSection: {
    alignItems: 'center',
    gap: 8,
  },
  logoImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: '#8A3FFC',
    marginBottom: 8,
  },
  systemLabel: {
    fontSize: 12,
    fontFamily: Fonts.sans,
    color: '#00A8FF',
    fontWeight: '600',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
    marginTop: 4,
  },
  title: {
    fontSize: 42,
    fontWeight: '900',
    color: '#E8ECF4',
    letterSpacing: 6,
  },
  titleAccent: {
    fontSize: 42,
    fontWeight: '900',
    color: '#00A8FF',
    letterSpacing: 3,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: Fonts.sans,
    color: '#6B7B8F',
    marginTop: 8,
    fontWeight: '500',
  },
  divider: {
    width: 60,
    height: 2,
    backgroundColor: '#00A8FF',
    marginTop: 14,
    borderRadius: 1,
  },
  tagline: {
    fontSize: 15,
    fontStyle: 'italic',
    fontFamily: Fonts.sans,
    color: '#8896AB',
    marginTop: 10,
  },
  statusBox: {
    backgroundColor: 'rgba(0, 168, 255, 0.04)',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 14,
    padding: Spacing.threeHalf,
    gap: 6,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00FF88',
  },
  statusText: {
    fontSize: 13,
    fontFamily: Fonts.sans,
    fontWeight: '600',
    color: '#00FF88',
  },
  statusDetail: {
    fontSize: 13,
    fontFamily: Fonts.sans,
    color: '#8896AB',
    marginLeft: 16,
  },
  buttonsSection: {
    gap: Spacing.three,
  },
  googleButton: {
    backgroundColor: '#00A8FF',
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#00A8FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  googleIcon: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0B1120',
  },
  googleButtonText: {
    fontSize: 16,
    fontFamily: Fonts.sans,
    fontWeight: '700',
    color: '#0B1120',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  guestButton: {
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  guestButtonText: {
    fontSize: 14,
    fontFamily: Fonts.sans,
    fontWeight: '600',
    color: '#8896AB',
  },
  errorText: {
    fontSize: 12,
    fontFamily: Fonts.sans,
    color: '#FF4444',
    textAlign: 'center',
  },
  footer: {
    alignItems: 'center',
    gap: 8,
  },
  footerText: {
    fontSize: 11,
    fontFamily: Fonts.sans,
    color: '#3A4A5F',
    textAlign: 'center',
    lineHeight: 16,
  },
  versionText: {
    fontSize: 10,
    fontFamily: Fonts.sans,
    color: '#2A3A50',
  },
});
