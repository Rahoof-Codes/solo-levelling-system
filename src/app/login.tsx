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
      Alert.alert('SYSTEM ERROR', message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Background glow effects */}
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />

      <View style={styles.content}>
        {/* System Header with Logo */}
        <View style={styles.headerSection}>
          <Image
            source={require('@/../assets/images/shadow-logo.png')}
            style={styles.logoImage}
            resizeMode="cover"
          />
          <Text style={styles.systemLabel}>[ SYSTEM PORTAL ]</Text>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>SHADOW</Text>
            <Text style={styles.titleAccent}>FITNESS</Text>
          </View>
          <Text style={styles.subtitle}>
            TRAIN • LEVEL • CONQUER
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
            <Text style={styles.statusText}>SYSTEM READY</Text>
          </View>
          <Text style={styles.statusDetail}>
            Authenticate to access Hunter Registry
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
              <ActivityIndicator color="#070B14" size="small" />
            ) : (
              <>
                <Text style={styles.googleIcon}>G</Text>
                <Text style={styles.googleButtonText}>ENTER WITH GOOGLE</Text>
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
              CONTINUE AS GUEST (LOCAL ONLY)
            </Text>
          </TouchableOpacity>

          {error && (
            <Text style={styles.errorText}>⚠️ {error}</Text>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Offline-First Architecture{'\n'}
            Your data is always saved locally
          </Text>
          <Text style={styles.versionText}>v1.0.0 — THE SYSTEM</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070B14',
  },
  glowTop: {
    position: 'absolute',
    top: -height * 0.15,
    left: width * 0.2,
    width: width * 0.6,
    height: height * 0.35,
    borderRadius: 999,
    backgroundColor: 'rgba(0, 168, 255, 0.06)',
  },
  glowBottom: {
    position: 'absolute',
    bottom: -height * 0.1,
    right: width * 0.1,
    width: width * 0.5,
    height: height * 0.25,
    borderRadius: 999,
    backgroundColor: 'rgba(0, 240, 255, 0.04)',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.five,
  },
  headerSection: {
    alignItems: 'center',
    gap: 6,
  },
  logoImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: '#8A3FFC',
    marginBottom: 6,
  },
  systemLabel: {
    fontSize: 10,
    fontFamily: Fonts.mono,
    color: '#00A8FF',
    letterSpacing: 4,
    fontWeight: '700',
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
    color: '#E0E8FF',
    letterSpacing: 6,
  },
  titleAccent: {
    fontSize: 42,
    fontWeight: '900',
    color: '#00A8FF',
    letterSpacing: 3,
  },
  subtitle: {
    fontSize: 10,
    fontFamily: Fonts.mono,
    color: '#4B6282',
    letterSpacing: 2,
    marginTop: 8,
  },
  divider: {
    width: 60,
    height: 2,
    backgroundColor: '#00A8FF',
    marginTop: 12,
    borderRadius: 1,
  },
  tagline: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#6582A6',
    marginTop: 8,
  },
  statusBox: {
    backgroundColor: 'rgba(0, 168, 255, 0.06)',
    borderWidth: 1,
    borderColor: '#19315A',
    borderRadius: 10,
    padding: Spacing.three,
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
    fontSize: 11,
    fontFamily: Fonts.mono,
    fontWeight: '800',
    color: '#00FF88',
    letterSpacing: 1.5,
  },
  statusDetail: {
    fontSize: 11,
    fontFamily: Fonts.mono,
    color: '#4B6282',
    marginLeft: 16,
  },
  buttonsSection: {
    gap: Spacing.three,
  },
  googleButton: {
    backgroundColor: '#00A8FF',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#00A8FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  googleIcon: {
    fontSize: 18,
    fontWeight: '900',
    color: '#070B14',
  },
  googleButtonText: {
    fontSize: 14,
    fontFamily: Fonts.mono,
    fontWeight: '900',
    color: '#070B14',
    letterSpacing: 2,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  guestButton: {
    borderWidth: 1.5,
    borderColor: '#19315A',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  guestButtonText: {
    fontSize: 11,
    fontFamily: Fonts.mono,
    fontWeight: '700',
    color: '#4B6282',
    letterSpacing: 1.5,
  },
  errorText: {
    fontSize: 10,
    fontFamily: Fonts.mono,
    color: '#FF4444',
    textAlign: 'center',
  },
  footer: {
    alignItems: 'center',
    gap: 8,
  },
  footerText: {
    fontSize: 9,
    fontFamily: Fonts.mono,
    color: '#2A3F5F',
    textAlign: 'center',
    lineHeight: 14,
  },
  versionText: {
    fontSize: 8,
    fontFamily: Fonts.mono,
    color: '#1A2A45',
    letterSpacing: 2,
  },
});
