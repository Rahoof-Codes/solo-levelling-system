import React, { useState, useEffect } from 'react';
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
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  FadeInDown,
  FadeInUp,
  ZoomIn,
} from 'react-native-reanimated';
import { useAuth } from '@/contexts/AuthContext';
import { Fonts, Spacing } from '@/constants/theme';

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
  const { signIn, continueAsGuest, isAuthenticating } = useAuth();
  const [error, setError] = useState<string | null>(null);

  // Floating background glow orb animations
  const orb1TranslateX = useSharedValue(0);
  const orb1TranslateY = useSharedValue(0);
  const orb2TranslateX = useSharedValue(0);
  const orb2TranslateY = useSharedValue(0);

  // Status dot pulse
  const dotScale = useSharedValue(1);

  // Button subtle pulse
  const btnPulse = useSharedValue(1);

  useEffect(() => {
    // Orb 1 subtle drift
    orb1TranslateX.value = withRepeat(
      withSequence(
        withTiming(25, { duration: 4000, easing: Easing.inOut(Easing.quad) }),
        withTiming(-20, { duration: 4000, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );
    orb1TranslateY.value = withRepeat(
      withSequence(
        withTiming(20, { duration: 3500, easing: Easing.inOut(Easing.quad) }),
        withTiming(-15, { duration: 4500, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );

    // Orb 2 subtle drift
    orb2TranslateX.value = withRepeat(
      withSequence(
        withTiming(-30, { duration: 5000, easing: Easing.inOut(Easing.quad) }),
        withTiming(15, { duration: 4500, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );
    orb2TranslateY.value = withRepeat(
      withSequence(
        withTiming(-20, { duration: 4200, easing: Easing.inOut(Easing.quad) }),
        withTiming(25, { duration: 3800, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );

    // Status dot pulse
    dotScale.value = withRepeat(
      withSequence(
        withTiming(1.4, { duration: 900, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // Button pulse
    btnPulse.value = withRepeat(
      withSequence(
        withTiming(1.02, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const orb1Style = useAnimatedStyle(() => ({
    transform: [
      { translateX: orb1TranslateX.value },
      { translateY: orb1TranslateY.value },
    ],
  }));

  const orb2Style = useAnimatedStyle(() => ({
    transform: [
      { translateX: orb2TranslateX.value },
      { translateY: orb2TranslateY.value },
    ],
  }));

  const dotAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: dotScale.value }],
  }));

  const btnAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: btnPulse.value }],
  }));

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
      {/* Background glow effects with animated floating drift */}
      <Animated.View style={[styles.glowTop, orb1Style]} />
      <Animated.View style={[styles.glowBottom, orb2Style]} />

      <View style={styles.content}>
        {/* Header with Logo */}
        <View style={styles.headerSection}>
          <Animated.View entering={ZoomIn.springify().damping(12)}>
            <Image
              source={require('@/../assets/images/shadow-logo.png')}
              style={styles.logoImage}
              resizeMode="cover"
            />
          </Animated.View>

          <Animated.Text entering={FadeInDown.duration(450).delay(100)} style={styles.systemLabel}>
            Shadow Fitness
          </Animated.Text>

          <Animated.View entering={FadeInDown.duration(450).delay(180)} style={styles.titleContainer}>
            <Text style={styles.title}>SHADOW</Text>
            <Text style={styles.titleAccent}>FITNESS</Text>
          </Animated.View>

          <Animated.Text entering={FadeInDown.duration(450).delay(260)} style={styles.subtitle}>
            Train • Level Up • Conquer
          </Animated.Text>

          <Animated.View entering={FadeInDown.duration(450).delay(320)} style={styles.divider} />

          <Animated.Text entering={FadeInDown.duration(450).delay(380)} style={styles.tagline}>
            "Only I level up."
          </Animated.Text>
        </View>

        {/* Status Box */}
        <Animated.View entering={FadeInDown.duration(450).delay(440)} style={styles.statusBox}>
          <View style={styles.statusRow}>
            <Animated.View style={[styles.statusDot, dotAnimStyle]} />
            <Text style={styles.statusText}>System Ready</Text>
          </View>
          <Text style={styles.statusDetail}>
            Sign in to start your journey
          </Text>
        </Animated.View>

        {/* Auth Buttons */}
        <View style={styles.buttonsSection}>
          {/* Google Sign-In Button */}
          <Animated.View entering={FadeInUp.duration(450).delay(500)} style={btnAnimStyle}>
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
          </Animated.View>

          {/* Guest Mode */}
          <Animated.View entering={FadeInUp.duration(450).delay(580)}>
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
          </Animated.View>

          {error && (
            <Text style={styles.errorText}>⚠️ {error}</Text>
          )}
        </View>

        {/* Footer */}
        <Animated.View entering={FadeInUp.duration(450).delay(640)} style={styles.footer}>
          <Text style={styles.footerText}>
            Offline-first · Your data is always saved locally
          </Text>
          <Text style={styles.versionText}>v1.2.1</Text>
        </Animated.View>
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
    backgroundColor: 'rgba(0, 168, 255, 0.08)',
  },
  glowBottom: {
    position: 'absolute',
    bottom: -height * 0.1,
    right: width * 0.1,
    width: width * 0.5,
    height: height * 0.25,
    borderRadius: 999,
    backgroundColor: 'rgba(138, 63, 252, 0.06)',
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
    shadowColor: '#00FF88',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 3,
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
