import React, { useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withSpring,
  withDelay,
  Easing,
  SlideInUp,
  ZoomIn,
} from 'react-native-reanimated';
import { Fonts, Spacing, Colors } from '@/constants/theme';

const { width } = Dimensions.get('window');

interface ManaReplenishModalProps {
  visible: boolean;
  mealName: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  targetCalories?: number;
  totalCaloriesToday?: number;
  onDismiss: () => void;
}

export function ManaReplenishModal({
  visible,
  mealName,
  calories,
  protein,
  carbs,
  fat,
  targetCalories = 2000,
  totalCaloriesToday = 0,
  onDismiss,
}: ManaReplenishModalProps) {
  const pulseScale = useSharedValue(0.8);
  const ringScale = useSharedValue(0.5);
  const ringOpacity = useSharedValue(0.8);
  const gaugeFill = useSharedValue(0);

  const prevPercent = Math.min(100, Math.max(0, ((totalCaloriesToday - calories) / targetCalories) * 100));
  const newPercent = Math.min(100, Math.max(0, (totalCaloriesToday / targetCalories) * 100));

  useEffect(() => {
    if (visible) {
      pulseScale.value = withSequence(
        withTiming(1.25, { duration: 300, easing: Easing.out(Easing.ease) }),
        withSpring(1, { damping: 10, stiffness: 200 })
      );

      ringScale.value = 0.5;
      ringOpacity.value = 0.9;
      ringScale.value = withTiming(2.2, { duration: 900, easing: Easing.out(Easing.cubic) });
      ringOpacity.value = withTiming(0, { duration: 900 });

      gaugeFill.value = prevPercent;
      gaugeFill.value = withDelay(400, withTiming(newPercent, { duration: 800, easing: Easing.out(Easing.cubic) }));
    }
  }, [visible, totalCaloriesToday, calories, prevPercent, newPercent]);

  const animatedPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const animatedRingStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }));

  const animatedGaugeStyle = useAnimatedStyle(() => ({
    width: `${gaugeFill.value}%`,
  }));

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        {/* Glowing Background Radial */}
        <View style={styles.bgGlow} />

        <Animated.View
          entering={SlideInUp.springify().damping(16).stiffness(180)}
          style={styles.container}
        >
          {/* Ornate corners */}
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.systemTag}>⟨ SYSTEM // RECOVERY ⟩</Text>
            <Text style={styles.title}>MANA REPLENISHED</Text>
            <Text style={styles.mealNameText}>"{mealName}"</Text>
          </View>

          {/* Glowing Ring & Mana Orb */}
          <View style={styles.orbArea}>
            <Animated.View style={[styles.shockwaveRing, animatedRingStyle]} />
            <Animated.View style={[styles.manaOrb, animatedPulseStyle]}>
              <Text style={styles.orbEmoji}>⚡</Text>
              <Text style={styles.orbText}>+{Math.round(calories)}</Text>
              <Text style={styles.orbUnit}>KCAL / MP</Text>
            </Animated.View>
          </View>

          {/* GAUGE PROGRESS BAR */}
          <View style={styles.gaugeContainer}>
            <View style={styles.gaugeHeader}>
              <Text style={styles.gaugeLabel}>DAILY MANA CAPACITY</Text>
              <Text style={styles.gaugeNumbers}>
                {Math.round(totalCaloriesToday)} / {Math.round(targetCalories)} kcal
              </Text>
            </View>
            <View style={styles.gaugeTrack}>
              <Animated.View style={[styles.gaugeFill, animatedGaugeStyle]} />
            </View>
          </View>

          {/* MACRONUTRIENT BREAKDOWN TILES */}
          <View style={styles.macrosRow}>
            {/* Protein */}
            <Animated.View entering={ZoomIn.delay(200)} style={styles.macroTile}>
              <Text style={[styles.macroTileKey, { color: '#EF4444' }]}>PROTEIN</Text>
              <Text style={styles.macroTileVal}>+{Math.round(protein)}g</Text>
              <Text style={styles.macroTileSub}>Muscle Restore</Text>
            </Animated.View>

            {/* Carbs */}
            <Animated.View entering={ZoomIn.delay(300)} style={styles.macroTile}>
              <Text style={[styles.macroTileKey, { color: '#F59E0B' }]}>CARBS</Text>
              <Text style={styles.macroTileVal}>+{Math.round(carbs)}g</Text>
              <Text style={styles.macroTileSub}>Active Mana</Text>
            </Animated.View>

            {/* Fat */}
            <Animated.View entering={ZoomIn.delay(400)} style={styles.macroTile}>
              <Text style={[styles.macroTileKey, { color: '#10B981' }]}>FAT</Text>
              <Text style={styles.macroTileVal}>+{Math.round(fat)}g</Text>
              <Text style={styles.macroTileSub}>Vital Shield</Text>
            </Animated.View>
          </View>

          {/* STATUS NOTIFICATION FOOTER */}
          <View style={styles.systemStatusBox}>
            <Text style={styles.systemStatusText}>
              ✓ Nutrition intake recorded. System energy updated.
            </Text>
          </View>

          {/* ACTION BUTTON */}
          <TouchableOpacity
            style={styles.confirmButton}
            onPress={onDismiss}
            activeOpacity={0.8}
          >
            <Text style={styles.confirmButtonText}>CONFIRM & CLOSE</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(3, 7, 16, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.threeHalf,
  },
  bgGlow: {
    position: 'absolute',
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: (width * 0.8) / 2,
    backgroundColor: 'rgba(34, 211, 238, 0.1)',
  },
  container: {
    width: '100%',
    backgroundColor: Colors.dark.backgroundCard,
    borderWidth: 1.5,
    borderColor: Colors.dark.cyan,
    borderRadius: 20,
    padding: Spacing.four,
    gap: Spacing.three,
    alignItems: 'center',
    shadowColor: Colors.dark.cyan,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  corner: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderColor: Colors.dark.cyan,
  },
  cornerTL: {
    top: -1,
    left: -1,
    borderTopWidth: 2.5,
    borderLeftWidth: 2.5,
  },
  cornerTR: {
    top: -1,
    right: -1,
    borderTopWidth: 2.5,
    borderRightWidth: 2.5,
  },
  cornerBL: {
    bottom: -1,
    left: -1,
    borderBottomWidth: 2.5,
    borderLeftWidth: 2.5,
  },
  cornerBR: {
    bottom: -1,
    right: -1,
    borderBottomWidth: 2.5,
    borderRightWidth: 2.5,
  },
  header: {
    alignItems: 'center',
    gap: 4,
  },
  systemTag: {
    fontSize: 11,
    fontFamily: Fonts.display,
    color: Colors.dark.cyan,
    fontWeight: '700',
    letterSpacing: 2,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    fontFamily: Fonts.display,
    color: Colors.dark.textBright,
    letterSpacing: 1,
  },
  mealNameText: {
    fontSize: 13,
    fontFamily: Fonts.sans,
    color: Colors.dark.textSecondary,
    fontWeight: '500',
    marginTop: 2,
  },
  orbArea: {
    width: 140,
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginVertical: 4,
  },
  shockwaveRing: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    borderColor: Colors.dark.cyan,
  },
  manaOrb: {
    width: 106,
    height: 106,
    borderRadius: 53,
    backgroundColor: Colors.dark.backgroundElement,
    borderWidth: 2,
    borderColor: Colors.dark.cyan,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.dark.cyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
    gap: 1,
  },
  orbEmoji: {
    fontSize: 22,
  },
  orbText: {
    fontSize: 22,
    fontWeight: '900',
    fontFamily: Fonts.mono,
    color: Colors.dark.cyan,
  },
  orbUnit: {
    fontSize: 9,
    fontFamily: Fonts.display,
    fontWeight: '700',
    color: Colors.dark.textMuted,
    letterSpacing: 1,
  },
  gaugeContainer: {
    width: '100%',
    gap: 6,
    backgroundColor: Colors.dark.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: 14,
    padding: 12,
  },
  gaugeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gaugeLabel: {
    fontSize: 11,
    fontFamily: Fonts.display,
    fontWeight: '700',
    color: Colors.dark.cyan,
    letterSpacing: 0.5,
  },
  gaugeNumbers: {
    fontSize: 11,
    fontFamily: Fonts.mono,
    color: Colors.dark.textSecondary,
    fontWeight: '600',
  },
  gaugeTrack: {
    height: 8,
    backgroundColor: Colors.dark.backgroundDeep,
    borderRadius: 4,
    overflow: 'hidden',
  },
  gaugeFill: {
    height: '100%',
    backgroundColor: Colors.dark.cyan,
    borderRadius: 4,
    shadowColor: Colors.dark.cyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
  },
  macrosRow: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
  },
  macroTile: {
    flex: 1,
    backgroundColor: Colors.dark.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    gap: 3,
  },
  macroTileKey: {
    fontSize: 10,
    fontFamily: Fonts.display,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  macroTileVal: {
    fontSize: 15,
    fontWeight: '900',
    fontFamily: Fonts.mono,
    color: Colors.dark.textBright,
  },
  macroTileSub: {
    fontSize: 9,
    fontFamily: Fonts.sans,
    color: Colors.dark.textMuted,
  },
  systemStatusBox: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    width: '100%',
  },
  systemStatusText: {
    fontSize: 12,
    fontFamily: Fonts.display,
    color: Colors.dark.success,
    textAlign: 'center',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  confirmButton: {
    width: '100%',
    backgroundColor: Colors.dark.cyan,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    shadowColor: Colors.dark.cyan,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  confirmButtonText: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: Fonts.display,
    color: Colors.dark.backgroundDeep,
    letterSpacing: 1,
  },
});
