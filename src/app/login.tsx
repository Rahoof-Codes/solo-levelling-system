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
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { ParticleField } from '@/components/ui/particles';

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

  // Logo glow ring
  const logoGlow = useSharedValue(0.3);

  useEffect(() => {
    // Orb 1 subtle drift
    orb1TranslateX.value = withRepeat(
      withSequence(
        withTiming(35, { duration: 5000, easing: Easing.inOut(Easing.quad) }),
        withTiming(-25, { duration: 5000, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );
    orb1TranslateY.value = withRepeat(
      withSequence(
        withTiming(30, { duration: 4500, easing: Easing.inOut(Easing.quad) }),
        withTiming(-20, { duration: 5500, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );

    // Orb 2 subtle drift
    orb2TranslateX.value = withRepeat(
      withSequence(
        withTiming(-40, { duration: 6000, easing: Easing.inOut(Easing.quad) }),
        withTiming(20, { duration: 5500, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );
    orb2TranslateY.value = withRepeat(
      withSequence(
        withTiming(-25, { duration: 5200, easing: Easing.inOut(Easing.quad) }),
        withTiming(30, { duration: 4800, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );

    // Status dot pulse
    dotScale.value = withRepeat(
      withSequence(
        withTiming(1.5, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // Button pulse
    btnPulse.value = withRepeat(
      withSequence(
        withTiming(1.02, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // Logo glow ring pulse
    logoGlow.value = withRepeat(
      withSequence(
        withTiming(0.6, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.2, { duration: 1500, easing: Easing.inOut(Easing.ease) })
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

  const logoGlowStyle = useAnimatedStyle(() => ({
    shadowOpacity: logoGlow.value,
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

      {/* Ambient particles */}
      <ParticleField count={8} color={Colors.dark.accent} />

      <View style={styles.content}>
        {/* Header with Logo */}
        <View style={styles.headerSection}>
          <Animated.View
            entering={ZoomIn.springify().damping(12)}
            style={[styles.logoGlowOuter]}
          >
            <Animated.View style={[styles.logoGlowRing, logoGlowStyle]} />
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

          {/* Ornate divider with diamond center */}
          <Animated.View entering={FadeInDown.duration(450).delay(320)} style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <View style={styles.dividerDiamond} />
            <View style={styles.dividerLine} />
          </Animated.View>

          <Animated.Text entering={FadeInDown.duration(450).delay(380)} style={styles.tagline}>
            "Only I level up."
          </Animated.Text>
        </View>

        {/* Status Box */}
        <Animated.View entering={FadeInDown.duration(450).delay(440)} style={styles.statusBox}>
          {/* Corner ornaments */}
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />

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
                <ActivityIndicator color={Colors.dark.backgroundDeep} size="small" />
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
          <Text style={styles.versionText}>v1.3.1</Text>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  glowTop: {
    position: 'absolute',
    top: -height * 0.15,
    left: width * 0.15,
    width: width * 0.7,
    height: height * 0.4,
    borderRadius: 999,
    backgroundColor: 'rgba(139, 92, 246, 0.06)',
  },
  glowBottom: {
    position: 'absolute',
    bottom: -height * 0.1,
    right: width * 0.05,
    width: width * 0.55,
    height: height * 0.3,
    borderRadius: 999,
    backgroundColor: 'rgba(245, 158, 11, 0.04)',
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
  logoGlowOuter: {
    marginBottom: 8,
    position: 'relative',
  },
  logoGlowRing: {
    position: 'absolute',
    top: -6,
    left: -6,
    right: -6,
    bottom: -6,
    borderRadius: 66,
    borderWidth: 2,
    borderColor: Colors.dark.accent,
    shadowColor: Colors.dark.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 20,
    elevation: 8,
  },
  logoImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2.5,
    borderColor: Colors.dark.accent,
  },
  systemLabel: {
    fontSize: 12,
    fontFamily: Fonts.display,
    color: Colors.dark.accent,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
    marginTop: 4,
  },
  title: {
    fontSize: 42,
    fontWeight: '700',
    fontFamily: Fonts.display,
    color: Colors.dark.textBright,
    letterSpacing: 6,
  },
  titleAccent: {
    fontSize: 42,
    fontWeight: '700',
    fontFamily: Fonts.display,
    color: Colors.dark.accent,
    letterSpacing: 3,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: Fonts.sans,
    color: Colors.dark.textMuted,
    marginTop: 8,
    fontWeight: '500',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 14,
    width: 120,
  },
  dividerLine: {
    flex: 1,
    height: 1.5,
    backgroundColor: Colors.dark.accent,
    opacity: 0.5,
  },
  dividerDiamond: {
    width: 8,
    height: 8,
    backgroundColor: Colors.dark.accent,
    transform: [{ rotate: '45deg' }],
    shadowColor: Colors.dark.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 2,
  },
  tagline: {
    fontSize: 15,
    fontStyle: 'italic',
    fontFamily: Fonts.sans,
    color: Colors.dark.textSecondary,
    marginTop: 10,
  },
  statusBox: {
    backgroundColor: 'rgba(139, 92, 246, 0.04)',
    borderWidth: 1,
    borderColor: Colors.dark.borderBright,
    borderRadius: 16,
    padding: Spacing.threeHalf,
    gap: 6,
    position: 'relative',
    overflow: 'hidden',
  },
  // Corner ornaments
  corner: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderColor: Colors.dark.accent,
  },
  cornerTL: { top: -1, left: -1, borderTopWidth: 2, borderLeftWidth: 2 },
  cornerTR: { top: -1, right: -1, borderTopWidth: 2, borderRightWidth: 2 },
  cornerBL: { bottom: -1, left: -1, borderBottomWidth: 2, borderLeftWidth: 2 },
  cornerBR: { bottom: -1, right: -1, borderBottomWidth: 2, borderRightWidth: 2 },

  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.dark.success,
    shadowColor: Colors.dark.success,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
  },
  statusText: {
    fontSize: 13,
    fontFamily: Fonts.display,
    fontWeight: '700',
    color: Colors.dark.success,
    letterSpacing: 0.5,
  },
  statusDetail: {
    fontSize: 13,
    fontFamily: Fonts.sans,
    color: Colors.dark.textSecondary,
    marginLeft: 16,
  },
  buttonsSection: {
    gap: Spacing.three,
  },
  googleButton: {
    backgroundColor: Colors.dark.accent,
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: Colors.dark.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 10,
  },
  googleIcon: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.dark.backgroundDeep,
  },
  googleButtonText: {
    fontSize: 16,
    fontFamily: Fonts.display,
    fontWeight: '700',
    color: Colors.dark.backgroundDeep,
    letterSpacing: 0.5,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  guestButton: {
    borderWidth: 1,
    borderColor: Colors.dark.borderBright,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  guestButtonText: {
    fontSize: 14,
    fontFamily: Fonts.sans,
    fontWeight: '600',
    color: Colors.dark.textSecondary,
  },
  errorText: {
    fontSize: 12,
    fontFamily: Fonts.sans,
    color: Colors.dark.danger,
    textAlign: 'center',
  },
  footer: {
    alignItems: 'center',
    gap: 8,
  },
  footerText: {
    fontSize: 11,
    fontFamily: Fonts.sans,
    color: Colors.dark.textDim,
    textAlign: 'center',
    lineHeight: 16,
  },
  versionText: {
    fontSize: 10,
    fontFamily: Fonts.sans,
    color: Colors.dark.textDim,
    opacity: 0.6,
  },
});
