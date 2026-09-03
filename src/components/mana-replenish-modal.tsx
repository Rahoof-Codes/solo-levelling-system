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
import { Fonts, Spacing } from '@/constants/theme';

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
  }, [visible, totalCaloriesToday, calories]);

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
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.systemTag}>Nutrition</Text>
            <Text style={styles.title}>Energy Replenished!</Text>
            <Text style={styles.mealNameText}>"{mealName}"</Text>
          </View>

          {/* Glowing Ring & Mana Orb */}
          <View style={styles.orbArea}>
            <Animated.View style={[styles.shockwaveRing, animatedRingStyle]} />
            <Animated.View style={[styles.manaOrb, animatedPulseStyle]}>
              <Text style={styles.orbEmoji}>⚡</Text>
              <Text style={styles.orbText}>+{Math.round(calories)}</Text>
              <Text style={styles.orbUnit}>kcal</Text>
            </Animated.View>
          </View>

          {/* GAUGE PROGRESS BAR */}
          <View style={styles.gaugeContainer}>
            <View style={styles.gaugeHeader}>
              <Text style={styles.gaugeLabel}>Daily Energy</Text>
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
              <Text style={[styles.macroTileKey, { color: '#FF4444' }]}>Protein</Text>
              <Text style={styles.macroTileVal}>+{Math.round(protein)}g</Text>
              <Text style={styles.macroTileSub}>Recovery</Text>
            </Animated.View>

            {/* Carbs */}
            <Animated.View entering={ZoomIn.delay(300)} style={styles.macroTile}>
              <Text style={[styles.macroTileKey, { color: '#FFAA00' }]}>Carbs</Text>
              <Text style={styles.macroTileVal}>+{Math.round(carbs)}g</Text>
              <Text style={styles.macroTileSub}>Fuel</Text>
            </Animated.View>

            {/* Fat */}
            <Animated.View entering={ZoomIn.delay(400)} style={styles.macroTile}>
              <Text style={[styles.macroTileKey, { color: '#00FF88' }]}>Fat</Text>
              <Text style={styles.macroTileVal}>+{Math.round(fat)}g</Text>
              <Text style={styles.macroTileSub}>Vitals</Text>
            </Animated.View>
          </View>

          {/* STATUS NOTIFICATION FOOTER */}
          <View style={styles.systemStatusBox}>
            <Text style={styles.systemStatusText}>
              ✓ Meal logged. Daily nutrition updated.
            </Text>
          </View>

          {/* ACTION BUTTON */}
          <TouchableOpacity
            style={styles.confirmButton}
            onPress={onDismiss}
            activeOpacity={0.8}
          >
            <Text style={styles.confirmButtonText}>Continue</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(4, 7, 15, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.threeHalf,
  },
  bgGlow: {
    position: 'absolute',
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: (width * 0.8) / 2,
    backgroundColor: 'rgba(0, 168, 255, 0.08)',
  },
  container: {
    width: '100%',
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 20,
    padding: Spacing.four,
    gap: Spacing.three,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 12,
  },
  header: {
    alignItems: 'center',
    gap: 4,
  },
  systemTag: {
    fontSize: 12,
    fontFamily: Fonts.sans,
    color: '#00A8FF',
    fontWeight: '600',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: Fonts.sans,
    color: '#E8ECF4',
  },
  mealNameText: {
    fontSize: 13,
    fontFamily: Fonts.sans,
    color: '#8896AB',
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
    borderColor: '#00A8FF',
  },
  manaOrb: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: '#0E1726',
    borderWidth: 2,
    borderColor: '#00A8FF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#00A8FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    gap: 1,
  },
  orbEmoji: {
    fontSize: 22,
  },
  orbText: {
    fontSize: 20,
    fontWeight: '900',
    fontFamily: Fonts.mono,
    color: '#00A8FF',
  },
  orbUnit: {
    fontSize: 10,
    fontFamily: Fonts.sans,
    fontWeight: '600',
    color: '#8896AB',
  },
  gaugeContainer: {
    width: '100%',
    gap: 6,
    backgroundColor: '#0E1726',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 12,
    padding: 12,
  },
  gaugeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gaugeLabel: {
    fontSize: 12,
    fontFamily: Fonts.sans,
    fontWeight: '600',
    color: '#00A8FF',
  },
  gaugeNumbers: {
    fontSize: 11,
    fontFamily: Fonts.mono,
    color: '#8896AB',
    fontWeight: '600',
  },
  gaugeTrack: {
    height: 8,
    backgroundColor: '#0B1120',
    borderRadius: 4,
    overflow: 'hidden',
  },
  gaugeFill: {
    height: '100%',
    backgroundColor: '#00A8FF',
    borderRadius: 4,
    shadowColor: '#00A8FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  macrosRow: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
  },
  macroTile: {
    flex: 1,
    backgroundColor: '#0E1726',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    gap: 3,
  },
  macroTileKey: {
    fontSize: 11,
    fontFamily: Fonts.sans,
    fontWeight: '700',
  },
  macroTileVal: {
    fontSize: 15,
    fontWeight: '900',
    fontFamily: Fonts.mono,
    color: '#E8ECF4',
  },
  macroTileSub: {
    fontSize: 9,
    fontFamily: Fonts.sans,
    color: '#6B7B8F',
  },
  systemStatusBox: {
    backgroundColor: 'rgba(0, 255, 136, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 136, 0.2)',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    width: '100%',
  },
  systemStatusText: {
    fontSize: 12,
    fontFamily: Fonts.sans,
    color: '#00FF88',
    textAlign: 'center',
    fontWeight: '600',
  },
  confirmButton: {
    width: '100%',
    backgroundColor: '#00A8FF',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#00A8FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  confirmButtonText: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: Fonts.sans,
    color: '#0B1120',
  },
});
