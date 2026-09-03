// ============================================================
// Step Tracker Card — 10k Steps Daily Goal & Motion Tracker
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
      Alert.alert('Notice', res.message || 'Could not complete 10k steps quest');
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
          <Text style={styles.systemTag}>Daily Goal</Text>
          <Text style={styles.mainTitle}>10,000 Steps</Text>
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
            {motion.isMoving ? `${motion.cadenceSPM} SPM` : 'Ready'}
          </Text>
        </View>
      </View>

      {/* STEP COUNTER HERO DISPLAY */}
      <View style={styles.heroRow}>
        <View style={styles.stepsCountBlock}>
          <Text style={styles.bigStepNumber}>{steps.toLocaleString()}</Text>
          <Text style={styles.targetStepLabel}>/ {targetSteps.toLocaleString()} steps</Text>
        </View>

        <View style={styles.percentageBadge}>
          <Text style={styles.percentageText}>{percentDisplay}%</Text>
        </View>
      </View>

      {/* PROGRESS BAR */}
      <View style={styles.progressBarTrack}>
        <View
          style={[
            styles.progressBarFill,
            {
              width: `${Math.max(3, percentDisplay)}%`,
              backgroundColor: isGoalReached ? '#00FF88' : '#00A8FF',
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
            <Text style={styles.metricLabel}>Distance</Text>
            <Text style={styles.metricValue}>{distanceKm} km</Text>
          </View>
        </View>

        <View style={styles.metricDivider} />

        <View style={styles.metricItem}>
          <Text style={styles.metricIcon}>🔥</Text>
          <View>
            <Text style={styles.metricLabel}>Burned</Text>
            <Text style={styles.metricValue}>{caloriesBurned} kcal</Text>
          </View>
        </View>

        <View style={styles.metricDivider} />

        <View style={styles.metricItem}>
          <Text style={styles.metricIcon}>⚡</Text>
          <View>
            <Text style={styles.metricLabel}>Intensity</Text>
            <Text style={styles.metricValue}>
              {Math.round(motion.intensity * 100)}%
            </Text>
          </View>
        </View>
      </View>

      {/* QUEST ACTION BUTTON / COMPLETION BADGE */}
      {isQuestCompleted ? (
        <View style={styles.completedBanner}>
          <Text style={styles.completedText}>✓ 10K steps complete (+50 AGI EXP)</Text>
        </View>
      ) : isGoalReached ? (
        <TouchableOpacity
          style={styles.claimButton}
          onPress={() => setClaimModalVisible(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.claimButtonText}>⚡ Goal reached! Claim +50 EXP</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.remainingBanner}>
          <Text style={styles.remainingText}>
            {(targetSteps - steps).toLocaleString()} steps remaining
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
            {showSimControls ? '▼ Hide test controls' : '⚙ Test motion sensor'}
          </Text>
        </TouchableOpacity>

        {showSimControls && (
          <View style={styles.simButtonsRow}>
            <TouchableOpacity
              style={styles.simBtn}
              onPress={() => simulateSteps(50)}
            >
              <Text style={styles.simBtnText}>+50</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.simBtn}
              onPress={() => simulateSteps(500)}
            >
              <Text style={styles.simBtnText}>+500</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.simBtn, styles.simBtnPrimary]}
              onPress={() => simulateSteps(2000)}
            >
              <Text style={styles.simBtnPrimaryText}>+2,000</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* XP CLAIM MODAL */}
      <XPClaimModal
        visible={claimModalVisible}
        xpAmount={50}
        stat={Stat.AGI}
        activityName="10,000 Steps Goal"
        onClaim={handleClaim}
        onDismiss={handleDismissModal}
        claimResult={claimResult}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 16,
    padding: Spacing.threeHalf,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
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
    fontSize: 11,
    fontFamily: Fonts.sans,
    color: '#00A8FF',
    fontWeight: '600',
  },
  mainTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: Fonts.sans,
    color: '#E8ECF4',
  },
  motionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  motionBadgeActive: {
    backgroundColor: 'rgba(0, 168, 255, 0.08)',
    borderColor: 'rgba(0, 168, 255, 0.3)',
  },
  motionBadgeIdle: {
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    borderColor: '#1E293B',
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
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  motionDotIdle: {
    backgroundColor: '#6B7B8F',
  },
  motionText: {
    fontSize: 10,
    fontFamily: Fonts.mono,
    fontWeight: '700',
  },
  motionTextActive: {
    color: '#00A8FF',
  },
  motionTextIdle: {
    color: '#8896AB',
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
    color: '#00A8FF',
    letterSpacing: 1,
    textShadowColor: 'rgba(0, 168, 255, 0.25)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  targetStepLabel: {
    fontSize: 13,
    fontFamily: Fonts.sans,
    color: '#8896AB',
    fontWeight: '500',
  },
  percentageBadge: {
    backgroundColor: '#0E1726',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  percentageText: {
    fontSize: 13,
    fontFamily: Fonts.mono,
    fontWeight: '800',
    color: '#00FF88',
  },
  progressBarTrack: {
    height: 10,
    backgroundColor: '#0E1726',
    borderRadius: 5,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 3,
  },
  metricsRow: {
    flexDirection: 'row',
    backgroundColor: '#0E1726',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
    paddingVertical: 10,
    paddingHorizontal: 14,
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
    fontSize: 10,
    fontFamily: Fonts.sans,
    color: '#6B7B8F',
    fontWeight: '500',
  },
  metricValue: {
    fontSize: 12,
    fontFamily: Fonts.mono,
    fontWeight: '700',
    color: '#D2E0F5',
  },
  metricDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#1E293B',
    marginHorizontal: 4,
  },
  claimButton: {
    backgroundColor: '#0066BB',
    borderWidth: 1,
    borderColor: '#00A8FF',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#00A8FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  claimButtonText: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  completedBanner: {
    backgroundColor: 'rgba(0, 255, 136, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 136, 0.3)',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  completedText: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    fontWeight: '600',
    color: '#00FF88',
  },
  remainingBanner: {
    backgroundColor: 'rgba(14, 23, 38, 0.6)',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  remainingText: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    color: '#8896AB',
  },
  simContainer: {
    gap: 6,
    paddingTop: 2,
  },
  simToggle: {
    alignSelf: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  simToggleText: {
    fontSize: 10,
    fontFamily: Fonts.sans,
    color: '#6B7B8F',
  },
  simButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  simBtn: {
    flex: 1,
    backgroundColor: '#0E1726',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  simBtnText: {
    fontSize: 11,
    fontFamily: Fonts.mono,
    color: '#8896AB',
    fontWeight: '700',
  },
  simBtnPrimary: {
    borderColor: '#00A8FF',
    backgroundColor: 'rgba(0, 168, 255, 0.08)',
  },
  simBtnPrimaryText: {
    fontSize: 11,
    fontFamily: Fonts.mono,
    color: '#00A8FF',
    fontWeight: '700',
  },
});
