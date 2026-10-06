/**
 * login.web.tsx — Web-specific login screen
 * Matches the Figma "System access" (#2:12479) design pixel-for-pixel
 * with full Solo Leveling electric, glowing, and breathing animations.
 */

import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  ScrollView,
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
} from 'react-native-reanimated';
import { useAuth } from '@/contexts/AuthContext';
import { Colors } from '@/constants/theme';
import { ParticleField } from '@/components/ui/particles';

const C = Colors.dark;

export default function LoginScreen() {
  const { signIn, continueAsGuest, isAuthenticating } = useAuth();
  const [error, setError] = useState<string | null>(null);

  /* ─── Animated values ─── */
  // Eye glow breathing pulse
  const eyeGlowAnim = useSharedValue(0.4);
  // Electric lightning crackle
  const lightningFlicker = useSharedValue(0.7);
  // Sparks floating and twinkling
  const spark1 = useSharedValue(0.4);
  const spark2 = useSharedValue(0.6);
  const spark3 = useSharedValue(0.3);
  const sparkFloat = useSharedValue(0);
  // Brand mark glow
  const brandGlow = useSharedValue(0.3);
  // Primary button pulse
  const btnPulse = useSharedValue(1);
  // Horizon energy line pulse
  const horizonPulse = useSharedValue(0.5);
  // Top energy line pulse
  const topLinePulse = useSharedValue(0.6);
  // Tag neon pulse
  const tagPulse = useSharedValue(0.5);

  useEffect(() => {
    // 1. Eye glow breathing pulse
    eyeGlowAnim.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.35, { duration: 2600, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // 2. Electric lightning flicker / crackle
    lightningFlicker.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 120 }),
        withTiming(0.25, { duration: 80 }),
        withTiming(0.9, { duration: 180 }),
        withTiming(0.4, { duration: 300 }),
        withTiming(0.95, { duration: 100 }),
        withTiming(0.2, { duration: 70 }),
        withTiming(0.75, { duration: 220 })
      ),
      -1,
      true
    );

    // 3. Sparks twinkle & float
    spark1.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.25, { duration: 1200, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    spark2.value = withRepeat(
      withSequence(
        withTiming(0.2, { duration: 900, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    spark3.value = withRepeat(
      withSequence(
        withTiming(0.9, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.2, { duration: 1400, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    sparkFloat.value = withRepeat(
      withSequence(
        withTiming(-5, { duration: 2200, easing: Easing.inOut(Easing.ease) }),
        withTiming(5, { duration: 2200, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // 4. Brand mark glow
    brandGlow.value = withRepeat(
      withSequence(
        withTiming(0.8, { duration: 1600, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.2, { duration: 1600, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // 5. Primary button pulse
    btnPulse.value = withRepeat(
      withSequence(
        withTiming(1.018, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // 6. Horizon energy line pulse
    horizonPulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.35, { duration: 1800, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // 7. Top energy line
    topLinePulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.4, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // 8. System Awakening Tag pulse
    tagPulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.4, { duration: 1400, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  /* ─── Animated Styles ─── */
  const eyeGlowStyle = useAnimatedStyle(() => ({
    opacity: eyeGlowAnim.value,
    transform: [{ scale: 0.96 + eyeGlowAnim.value * 0.08 }],
  }));

  const lightningStyle = useAnimatedStyle(() => ({
    opacity: lightningFlicker.value,
  }));

  const spark1Style = useAnimatedStyle(() => ({
    opacity: spark1.value,
    transform: [{ translateY: sparkFloat.value }],
  }));

  const spark2Style = useAnimatedStyle(() => ({
    opacity: spark2.value,
    transform: [{ translateY: -sparkFloat.value }],
  }));

  const spark3Style = useAnimatedStyle(() => ({
    opacity: spark3.value,
    transform: [{ translateY: sparkFloat.value * 0.7 }],
  }));

  const brandGlowStyle = useAnimatedStyle(() => ({
    opacity: 0.5 + brandGlow.value * 0.5,
  }));

  const btnAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: btnPulse.value }],
  }));

  const horizonStyle = useAnimatedStyle(() => ({
    opacity: horizonPulse.value,
  }));

  const topLineStyle = useAnimatedStyle(() => ({
    opacity: topLinePulse.value,
  }));

  const tagStyle = useAnimatedStyle(() => ({
    opacity: 0.7 + tagPulse.value * 0.3,
  }));

  const handleGoogleSignIn = async () => {
    setError(null);
    try {
      await signIn();
    } catch (err: any) {
      const message = err?.message ?? 'Sign-in failed. Please try again.';
      setError(message);
    }
  };

  return (
    <View style={styles.outerWrapper}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        {/* ────────── HERO IMAGE SECTION ────────── */}
        <View style={styles.heroContainer}>
          <Image
            source={require('@/../assets/images/eye_reveal.png')}
            style={styles.heroImage}
            resizeMode="cover"
          />

          {/* Eye glow aura — animated breathing pulse */}
          <Animated.View style={[styles.eyeGlowAura, eyeGlowStyle]} />

          {/* Lightning arcs — animated electric crackle */}
          <Animated.View style={[styles.lightningArc, styles.lightningLeft, lightningStyle]} />
          <Animated.View style={[styles.lightningBranch, styles.lightningBranchLeft, lightningStyle]} />
          <Animated.View style={[styles.lightningArc, styles.lightningRight, lightningStyle]} />
          <Animated.View style={[styles.lightningBranch, styles.lightningBranchRight, lightningStyle]} />

          {/* Animated spark dots — floating and twinkling */}
          <Animated.View style={[styles.spark, styles.spark1, spark1Style]} />
          <Animated.View style={[styles.spark, styles.spark2, spark2Style]} />
          <Animated.View style={[styles.sparkPurple, styles.spark3, spark3Style]} />
          <Animated.View style={[styles.sparkPurple, styles.spark4, spark1Style]} />
          <Animated.View style={[styles.spark, styles.spark5, spark2Style]} />

          {/* Cinematic gradient scrim — web uses actual CSS gradient */}
          <View style={styles.cinematicScrim} />

          {/* Horizon energy line with CSS gradient & breathing glow */}
          <Animated.View style={[styles.horizonLine, horizonStyle]} />

          {/* Ambient particles */}
          <ParticleField count={8} color={C.systemCyan} />
        </View>

        {/* ────────── INTRODUCTION COMPONENT ────────── */}
        <View style={styles.introContainer}>
          {/* Brand */}
          <Animated.View entering={FadeInDown.duration(400)} style={styles.brandRow}>
            <Animated.View style={[styles.brandMark, brandGlowStyle]}>
              <Image
                source={require('@/../assets/images/triangle.svg')}
                style={{ width: 18, height: 18 }}
                resizeMode="contain"
              />
            </Animated.View>
            <View style={styles.brandNameGroup}>
              <Text style={styles.brandTitle}>SOLO SYSTEM</Text>
              <Text style={styles.brandSubtitle}>FITNESS PROTOCOL</Text>
            </View>
          </Animated.View>

          {/* Access Panel */}
          <Animated.View entering={FadeInDown.duration(450).delay(100)} style={styles.accessPanel}>
            {/* Top energy line — pulsing web gradient */}
            <Animated.View style={[styles.panelTopLine, topLineStyle]} />

            {/* Purple ambient aura behind panel */}
            <View pointerEvents="none" style={styles.panelPurpleGlow} />

            {/* System awakening tag */}
            <Animated.View style={[styles.tag, tagStyle]}>
              <Text style={styles.tagText}>SYSTEM AWAKENING</Text>
            </Animated.View>

            {/* Headline */}
            <View style={styles.headline}>
              <Text style={styles.headlineText}>ASCEND{'\n'}BEYOND{'\n'}LIMITS.</Text>
              <Text style={styles.headlineBody}>
                Your training becomes a progression system. Complete daily quests, earn XP, and evolve your real-world stats.
              </Text>
            </View>

            {/* Player preview row */}
            <View style={styles.playerPreview}>
              <View style={styles.playerIcon}>
                <Image
                  source={require('@/../assets/images/user-round.svg')}
                  style={{ width: 16, height: 16 }}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.playerDetails}>
                <Text style={styles.playerLabel}>RETURNING PLAYER</Text>
                <Text style={styles.playerName}>READY TO AWAKEN</Text>
              </View>
              <Image
                source={require('@/../assets/images/shield-check.svg')}
                style={{ width: 18, height: 18 }}
                resizeMode="contain"
              />
            </View>

            {/* Primary action — Enter the system */}
            <Animated.View style={btnAnimStyle}>
              <TouchableOpacity
                style={[styles.primaryBtn, isAuthenticating && styles.btnDisabled]}
                onPress={continueAsGuest}
                disabled={isAuthenticating}
                activeOpacity={0.8}
              >
                {isAuthenticating ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Text style={styles.primaryBtnText}>ENTER THE SYSTEM</Text>
                    <Image
                      source={require('@/../assets/images/log-in.svg')}
                      style={{ width: 18, height: 18 }}
                      resizeMode="contain"
                    />
                  </>
                )}
              </TouchableOpacity>
            </Animated.View>

            {/* Alternative access row */}
            <Animated.View entering={FadeInUp.duration(350).delay(200)} style={styles.altAccessRow}>
              <TouchableOpacity activeOpacity={0.7} onPress={continueAsGuest}>
                <Text style={styles.altAccessText}>NEW PLAYER? CREATE ID</Text>
              </TouchableOpacity>
              <Text style={styles.altAccessVersion}>SECURE LINK · V2.4</Text>
            </Animated.View>

            {/* Divider — "OR CONTINUE WITH" */}
            <Animated.View entering={FadeInUp.duration(350).delay(280)} style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR CONTINUE WITH</Text>
              <View style={styles.dividerLine} />
            </Animated.View>

            {/* Google sign-in button */}
            <Animated.View entering={FadeInUp.duration(400).delay(350)}>
              <TouchableOpacity
                style={[styles.googleBtn, isAuthenticating && styles.btnDisabled]}
                onPress={handleGoogleSignIn}
                disabled={isAuthenticating}
                activeOpacity={0.8}
              >
                {isAuthenticating ? (
                  <ActivityIndicator color={C.systemTextPrimary} size="small" />
                ) : (
                  <>
                    <Image
                      source={require('@/../assets/images/google-icon.svg')}
                      style={{ width: 18, height: 18 }}
                      resizeMode="contain"
                    />
                    <Text style={styles.googleBtnText}>SIGN IN WITH GOOGLE</Text>
                  </>
                )}
              </TouchableOpacity>
            </Animated.View>

            {error && (
              <Text style={styles.errorText}>⚠️ {error}</Text>
            )}
          </Animated.View>
        </View>
      </ScrollView>
    </View>
  );
}

/* ──────────────────────────────────────────
   STYLES — Web-optimized with valid CSS properties
   ────────────────────────────────────────── */

const styles = StyleSheet.create({
  outerWrapper: {
    flex: 1,
    backgroundColor: C.systemBg,
    alignItems: 'center',
    overflow: 'hidden' as any,
  },
  scrollContent: {
    flexGrow: 1,
    minHeight: '100vh' as any,
    width: '100%',
    maxWidth: 430, // Responsive container matching mobile frame
    alignSelf: 'center',
  },

  /* ── Hero ── */
  heroContainer: {
    width: '100%',
    height: '52vh' as any,
    minHeight: 380,
    maxHeight: 480,
    position: 'relative',
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
  },
  eyeGlowAura: {
    position: 'absolute',
    top: '10%',
    left: '-10%',
    width: '120%',
    height: '65%',
    borderRadius: 999,
    backgroundImage: 'radial-gradient(circle at 50% 40%, rgba(32, 200, 255, 0.22) 0%, rgba(108, 92, 255, 0.12) 50%, rgba(0, 0, 0, 0) 100%)',
  },

  lightningArc: {
    position: 'absolute',
    width: 107,
    height: 2,
    backgroundImage: 'linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(32,200,255,0.75) 50%, rgba(0,0,0,0) 100%)',
    boxShadow: '0px 0px 8px 1px rgba(32, 200, 255, 0.7)',
  },
  lightningLeft: {
    top: '14%',
    left: '5%',
    transform: [{ rotate: '-12deg' }],
  },
  lightningRight: {
    top: '28%',
    right: '5%',
    transform: [{ rotate: '10deg' }],
  },
  lightningBranch: {
    position: 'absolute',
    width: 41,
    height: 1.5,
    backgroundImage: 'linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(32,200,255,0.55) 50%, rgba(0,0,0,0) 100%)',
  },
  lightningBranchLeft: {
    top: '14%',
    left: '15%',
    transform: [{ rotate: '-35deg' }],
  },
  lightningBranchRight: {
    top: '25%',
    right: '12%',
    transform: [{ rotate: '30deg' }],
  },

  /* Spark dots */
  spark: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.systemCyan,
    boxShadow: '0px 0px 6px 2px rgba(32, 200, 255, 1)',
  },
  sparkPurple: {
    position: 'absolute',
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: C.systemPurple,
    boxShadow: '0px 0px 5px 1px rgba(108, 92, 255, 1)',
  },
  spark1: { top: '33%', left: '22%' },
  spark2: { top: '35%', right: '22%', width: 3, height: 3 },
  spark3: { top: '44%', left: '13%' },
  spark4: { top: '42%', right: '10%' },
  spark5: { top: '20%', left: '50%', width: 3, height: 3 },

  /* Cinematic scrim — CSS linear-gradient */
  cinematicScrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: -31,
    bottom: 0,
    backgroundImage: 'linear-gradient(180deg, rgba(5,6,17,0) 0%, rgba(5,6,17,0.13) 30%, rgba(5,6,17,0.73) 55%, rgba(5,6,17,1) 78%, rgba(5,6,17,1) 100%)',
  },

  /* Horizon energy line — CSS gradient */
  horizonLine: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundImage: 'linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(32,200,255,0.33) 30%, rgba(32,200,255,0.9) 50%, rgba(32,200,255,0.33) 70%, rgba(0,0,0,0) 100%)',
    boxShadow: '0px 0px 10px 2px rgba(32, 200, 255, 0.5)',
  },

  /* ── Introduction ── */
  introContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 24,
    justifyContent: 'flex-end',
    gap: 0,
  },

  /* Brand row */
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  brandMark: {
    width: 34,
    height: 34,
    borderRadius: 4,
    backgroundColor: 'rgba(108, 92, 255, 0.13)',
    borderWidth: 1,
    borderColor: C.systemCyan,
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '0px 0px 18px 1px rgba(108, 92, 255, 0.4)',
  },
  brandNameGroup: {
    gap: 1,
  },
  brandTitle: {
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    fontWeight: '800',
    fontSize: 16,
    color: C.systemTextPrimary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  brandSubtitle: {
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    fontWeight: '700',
    fontSize: 9,
    color: C.systemCyan,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },

  /* ── Access Panel ── */
  accessPanel: {
    backgroundColor: C.systemPanel,
    borderWidth: 1,
    borderColor: C.systemBorderAccent,
    borderRadius: 8,
    padding: 20,
    gap: 16,
    boxShadow: '0px 10px 24px 0px rgba(0,0,0,0.4), 0px 0px 18px 1px rgba(108, 92, 255, 0.4)',
    position: 'relative',
    overflow: 'hidden',
  },
  panelTopLine: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    height: 1,
    backgroundImage: 'linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(32,200,255,1) 50%, rgba(0,0,0,0) 100%)',
    boxShadow: '0px 0px 8px 1px rgba(32, 200, 255, 0.6)',
  },
  panelPurpleGlow: {
    position: 'absolute',
    top: -50,
    left: '20%',
    width: '60%',
    height: 100,
    borderRadius: 999,
    backgroundImage: 'radial-gradient(circle, rgba(108,92,255,0.15) 0%, transparent 70%)',
  },
  tag: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(32, 200, 255, 0.09)',
    borderWidth: 1,
    borderColor: 'rgba(32, 200, 255, 0.4)',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    boxShadow: '0px 0px 10px 1px rgba(32, 200, 255, 0.33)',
  },
  tagText: {
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    fontWeight: '800',
    fontSize: 9,
    color: C.systemCyan,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },

  /* Headline */
  headline: {
    gap: 8,
  },
  headlineText: {
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    fontWeight: '900',
    fontSize: 40,
    lineHeight: 40 * 0.94,
    color: C.systemTextPrimary,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(32, 200, 255, 0.2)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 24,
  },
  headlineBody: {
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    fontWeight: '400',
    fontSize: 14,
    lineHeight: 14 * 1.45,
    color: C.systemTextSecondary,
  },

  /* Player preview */
  playerPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: C.systemDarkPanel,
    borderWidth: 1,
    borderColor: C.systemBorder,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 52,
  },
  playerIcon: {
    width: 30,
    height: 30,
    borderRadius: 4,
    backgroundColor: 'rgba(32, 200, 255, 0.09)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playerDetails: {
    flex: 1,
    gap: 1,
  },
  playerLabel: {
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    fontWeight: '700',
    fontSize: 9,
    color: C.systemTextMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  playerName: {
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    fontWeight: '700',
    fontSize: 14,
    color: C.systemTextPrimary,
  },

  /* Primary button — gradient on web */
  primaryBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    height: 54,
    borderRadius: 8,
    backgroundImage: 'linear-gradient(90deg, rgba(108,92,255,1) 0%, rgba(56,95,234,1) 100%)',
    boxShadow: '0px 0px 18px 1px rgba(108, 92, 255, 0.4)',
    cursor: 'pointer',
  },
  primaryBtnText: {
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    fontWeight: '800',
    fontSize: 16,
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  btnDisabled: {
    opacity: 0.5,
  },

  /* Alternative access */
  altAccessRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  altAccessText: {
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    fontWeight: '700',
    fontSize: 11,
    color: C.systemTextSecondary,
    cursor: 'pointer',
  },
  altAccessVersion: {
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    fontWeight: '400',
    fontSize: 9,
    color: C.systemTextMuted,
  },

  /* Divider */
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: C.systemBorderAccent,
  },
  dividerText: {
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    fontWeight: '800',
    fontSize: 9,
    color: C.systemTextMuted,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },

  /* Google button */
  googleBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    height: 54,
    borderRadius: 8,
    backgroundColor: C.systemDarkPanel,
    borderWidth: 1,
    borderColor: C.systemBorder,
    cursor: 'pointer',
  },
  googleBtnText: {
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    fontWeight: '800',
    fontSize: 16,
    color: C.systemTextPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  /* Error */
  errorText: {
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    fontSize: 12,
    color: '#EF4444',
    textAlign: 'center',
  },
});
