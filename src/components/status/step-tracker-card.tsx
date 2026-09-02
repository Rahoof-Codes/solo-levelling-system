// ============================================================
// Step Tracker Card — 10k Steps Daily Directive & Motion HUD
// ============================================================

import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useStepTracker } from '@/hooks/useStepTracker';
import { Fonts, Spacing } from '@/constants/theme';
import { XPClaimModal } from '@/components/xp-claim-modal';
import { Stat } from '@/types';

interface StepTrackerCardProps {
  onQuestClaimed?: () => void;
}

export function StepTrackerCard({ onQuestClaimed }: StepTrackerCardProps) {
  const {
    steps,
    targetSteps,
    progress,
    distanceKm,
    caloriesBurned,
    isGoalReached,
    motion,
    associatedQuest,
    simulateSteps,
    claim10kStepsQuest,
  } = useStepTracker();

  const [claimModalVisible, setClaimModalVisible] = useState(false);
  const [claimResult, setClaimResult] = useState<{
    leveledUp: boolean;
    newLevel?: number;
    rankChanged: boolean;
    newRank?: string;
  } | null>(null);
  const [showSimControls, setShowSimControls] = useState(false);

  const percentDisplay = Math.min(100, Math.round(progress * 100));
  const isQuestCompleted = associatedQuest?.is_completed === 1;

  const handleClaim = async () => {
    const res = await claim10kStepsQuest();
    if (res.success && res.xpResult) {
      setClaimResult({
        leveledUp: res.xpResult.leveledUp,
        newLevel: res.xpResult.newProfile.level,
        rankChanged: res.xpResult.rankChanged,
        newRank: res.xpResult.newProfile.rank,
      });
      if (onQuestClaimed) onQuestClaimed();
    } else {
      Alert.alert('System Notice', res.message || 'Could not complete 10k steps quest');
      setClaimModalVisible(false);
    }
  };

  const handleDismissModal = () => {
    setClaimModalVisible(false);
    setClaimResult(null);
    if (onQuestClaimed) onQuestClaimed();
  };

  return (
    <View style={styles.cardContainer}>
      {/* CARD HEADER */}
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <Text style={styles.systemTag}>[ PHYSICAL DIRECTIVE ]</Text>
          <Text style={styles.mainTitle}>10,000 STEPS DAILY MARCH</Text>
        </View>

        {/* MOTION SENSOR STATUS BADGE */}
        <View
          style={[
            styles.motionBadge,
            motion.isMoving ? styles.motionBadgeActive : styles.motionBadgeIdle,
          ]}
        >
          <View
            style={[
              styles.motionPulseDot,
              motion.isMoving ? styles.motionDotActive : styles.motionDotIdle,
            ]}
          />
          <Text
            style={[
              styles.motionText,
              motion.isMoving ? styles.motionTextActive : styles.motionTextIdle,
            ]}
          >
            {motion.isMoving ? `MOTION: ${motion.cadenceSPM} SPM` : 'MOTION: READY'}
          </Text>
        </View>
      </View>

      {/* STEP COUNTER HERO DISPLAY */}
      <View style={styles.heroRow}>
        <View style={styles.stepsCountBlock}>
          <Text style={styles.bigStepNumber}>{steps.toLocaleString()}</Text>
          <Text style={styles.targetStepLabel}>/ {targetSteps.toLocaleString()} STEPS</Text>
        </View>

        <View style={styles.percentageBadge}>
          <Text style={styles.percentageText}>{percentDisplay}%</Text>
        </View>
      </View>

      {/* GLOWING PROGRESS BAR */}
      <View style={styles.progressBarTrack}>
        <View
          style={[
            styles.progressBarFill,
            {
              width: `${Math.max(3, percentDisplay)}%`,
              backgroundColor: isGoalReached ? '#00FF88' : '#00F0FF',
              shadowColor: isGoalReached ? '#00FF88' : '#00A8FF',
            },
          ]}
        />
      </View>

      {/* METRICS ROW */}
      <View style={styles.metricsRow}>
        <View style={styles.metricItem}>
          <Text style={styles.metricIcon}>📍</Text>
          <View>
            <Text style={styles.metricLabel}>DISTANCE</Text>
            <Text style={styles.metricValue}>{distanceKm} km</Text>
          </View>
        </View>

        <View style={styles.metricDivider} />

        <View style={styles.metricItem}>
          <Text style={styles.metricIcon}>🔥</Text>
          <View>
            <Text style={styles.metricLabel}>ENERGY</Text>
            <Text style={styles.metricValue}>{caloriesBurned} kcal</Text>
          </View>
        </View>

        <View style={styles.metricDivider} />

        <View style={styles.metricItem}>
          <Text style={styles.metricIcon}>⚡</Text>
          <View>
            <Text style={styles.metricLabel}>INTENSITY</Text>
            <Text style={styles.metricValue}>
              {Math.round(motion.intensity * 100)}%
            </Text>
          </View>
        </View>
      </View>

      {/* QUEST ACTION BUTTON / COMPLETION BADGE */}
      {isQuestCompleted ? (
        <View style={styles.completedBanner}>
          <Text style={styles.completedText}>✓ 10,000 STEPS QUEST COMPLETE (+50 AGI EXP)</Text>
        </View>
      ) : isGoalReached ? (
        <TouchableOpacity
          style={styles.claimButton}
          onPress={() => setClaimModalVisible(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.claimButtonText}>⚡ 10K GOAL REACHED! CLAIM +50 EXP →</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.remainingBanner}>
          <Text style={styles.remainingText}>
            [ {(targetSteps - steps).toLocaleString()} STEPS REMAINING FOR QUEST REWARD ]
          </Text>
        </View>
      )}

      {/* DEVELOPER / SENSOR SIMULATION TOGGLE */}
      <View style={styles.simContainer}>
        <TouchableOpacity
          onPress={() => setShowSimControls((p) => !p)}
          style={styles.simToggle}
        >
          <Text style={styles.simToggleText}>
            {showSimControls ? '▼ HIDE MOTION TEST' : '⚙ TEST MOTION SENSOR'}
          </Text>
        </TouchableOpacity>

        {showSimControls && (
          <View style={styles.simButtonsRow}>
            <TouchableOpacity
              style={styles.simBtn}
              onPress={() => simulateSteps(50)}
            >
              <Text style={styles.simBtnText}>+50 STEPS</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.simBtn}
              onPress={() => simulateSteps(500)}
            >
              <Text style={styles.simBtnText}>+500 STEPS</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.simBtn, styles.simBtnPrimary]}
              onPress={() => simulateSteps(2000)}
            >
              <Text style={styles.simBtnPrimaryText}>+2,000 STEPS</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* XP CLAIM MODAL */}
      <XPClaimModal
        visible={claimModalVisible}
        xpAmount={50}
        stat={Stat.AGI}
        activityName="10,000 STEPS DAILY DIRECTIVE"
        onClaim={handleClaim}
        onDismiss={handleDismissModal}
        claimResult={claimResult}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#0D1424',
    borderWidth: 1.5,
    borderColor: '#193560',
    borderRadius: 12,
    padding: Spacing.three,
    gap: 12,
    shadowColor: '#00A8FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleGroup: {
    gap: 2,
  },
  systemTag: {
    fontSize: 9,
    fontFamily: Fonts.mono,
    color: '#00A8FF',
    letterSpacing: 1.5,
    fontWeight: '800',
  },
  mainTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#E0E8FF',
    letterSpacing: 0.8,
  },
  motionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  motionBadgeActive: {
    backgroundColor: 'rgba(0, 240, 255, 0.12)',
    borderColor: '#00F0FF',
  },
  motionBadgeIdle: {
    backgroundColor: 'rgba(25, 49, 90, 0.5)',
    borderColor: '#1C355E',
  },
  motionPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  motionDotActive: {
    backgroundColor: '#00FF88',
    shadowColor: '#00FF88',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 5,
  },
  motionDotIdle: {
    backgroundColor: '#556F91',
  },
  motionText: {
    fontSize: 9,
    fontFamily: Fonts.mono,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  motionTextActive: {
    color: '#00F0FF',
  },
  motionTextIdle: {
    color: '#6582A6',
  },
  heroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 2,
  },
  stepsCountBlock: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  bigStepNumber: {
    fontSize: 32,
    fontWeight: '900',
    fontFamily: Fonts.mono,
    color: '#00F0FF',
    letterSpacing: 1,
    textShadowColor: 'rgba(0, 240, 255, 0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  targetStepLabel: {
    fontSize: 13,
    fontFamily: Fonts.mono,
    color: '#6582A6',
    fontWeight: '700',
  },
  percentageBadge: {
    backgroundColor: '#090E1A',
    borderWidth: 1,
    borderColor: '#193560',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  percentageText: {
    fontSize: 12,
    fontFamily: Fonts.mono,
    fontWeight: '900',
    color: '#00FF88',
  },
  progressBarTrack: {
    height: 10,
    backgroundColor: '#090E1A',
    borderRadius: 5,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#15294A',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 3,
  },
  metricsRow: {
    flexDirection: 'row',
    backgroundColor: '#090E1A',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#15294A',
    paddingVertical: 8,
    paddingHorizontal: 12,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metricIcon: {
    fontSize: 15,
  },
  metricLabel: {
    fontSize: 8,
    fontFamily: Fonts.mono,
    color: '#556F91',
    letterSpacing: 0.5,
  },
  metricValue: {
    fontSize: 12,
    fontFamily: Fonts.mono,
    fontWeight: '800',
    color: '#DCE8FF',
  },
  metricDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#15294A',
    marginHorizontal: 4,
  },
  claimButton: {
    backgroundColor: '#0077CC',
    borderWidth: 1.5,
    borderColor: '#00F0FF',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    shadowColor: '#00F0FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 5,
  },
  claimButtonText: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  completedBanner: {
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
    borderWidth: 1,
    borderColor: '#00FF88',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  completedText: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    fontWeight: '800',
    color: '#00FF88',
    letterSpacing: 0.8,
  },
  remainingBanner: {
    backgroundColor: 'rgba(9, 14, 26, 0.6)',
    borderWidth: 1,
    borderColor: '#172B4C',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  remainingText: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    color: '#708EAE',
    letterSpacing: 0.5,
  },
  simContainer: {
    gap: 6,
    paddingTop: 2,
  },
  simToggle: {
    alignSelf: 'center',
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  simToggleText: {
    fontSize: 9,
    fontFamily: Fonts.mono,
    color: '#4B678C',
    letterSpacing: 1,
  },
  simButtonsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  simBtn: {
    flex: 1,
    backgroundColor: '#090E1A',
    borderWidth: 1,
    borderColor: '#1C355E',
    borderRadius: 6,
    paddingVertical: 6,
    alignItems: 'center',
  },
  simBtnText: {
    fontSize: 9,
    fontFamily: Fonts.mono,
    color: '#7A9BBE',
    fontWeight: '700',
  },
  simBtnPrimary: {
    borderColor: '#00A8FF',
    backgroundColor: 'rgba(0, 168, 255, 0.1)',
  },
  simBtnPrimaryText: {
    fontSize: 9,
    fontFamily: Fonts.mono,
    color: '#00F0FF',
    fontWeight: '800',
  },
});
