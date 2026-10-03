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
import { Colors, Fonts, Spacing } from '@/constants/theme';
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
    claim10kStepsQuest,
  } = useStepTracker();

  const [claimModalVisible, setClaimModalVisible] = useState(false);
  const [claimResult, setClaimResult] = useState<{
    leveledUp: boolean;
    newLevel?: number;
    rankChanged: boolean;
    newRank?: string;
  } | null>(null);

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
      {/* Corner ornaments */}
      <View style={[styles.corner, styles.cornerTL]} />
      <View style={[styles.corner, styles.cornerTR]} />
      <View style={[styles.corner, styles.cornerBL]} />
      <View style={[styles.corner, styles.cornerBR]} />

      {/* CARD HEADER */}
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <Text style={styles.systemTag}>DAILY GOAL</Text>
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

        <View style={[styles.percentageBadge, isGoalReached && styles.percentageBadgeComplete]}>
          <Text style={[styles.percentageText, isGoalReached && styles.percentageTextComplete]}>
            {percentDisplay}%
          </Text>
        </View>
      </View>

      {/* PROGRESS BAR */}
      <View style={styles.progressBarTrack}>
        <View
          style={[
            styles.progressBarFill,
            {
              width: `${Math.max(3, percentDisplay)}%`,
              backgroundColor: isGoalReached ? Colors.dark.success : Colors.dark.cyan,
              shadowColor: isGoalReached ? Colors.dark.success : Colors.dark.cyan,
            },
          ]}
        />
        <View style={styles.barShine} />
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
    backgroundColor: Colors.dark.backgroundCard,
    borderWidth: 1,
    borderColor: Colors.dark.borderBright,
    borderRadius: 18,
    padding: Spacing.threeHalf,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
    position: 'relative',
    overflow: 'hidden',
  },
  // Corner ornaments
  corner: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderColor: Colors.dark.cyan,
  },
  cornerTL: { top: -1, left: -1, borderTopWidth: 2, borderLeftWidth: 2 },
  cornerTR: { top: -1, right: -1, borderTopWidth: 2, borderRightWidth: 2 },
  cornerBL: { bottom: -1, left: -1, borderBottomWidth: 2, borderLeftWidth: 2 },
  cornerBR: { bottom: -1, right: -1, borderBottomWidth: 2, borderRightWidth: 2 },

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
    fontFamily: Fonts.display,
    color: Colors.dark.cyan,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  mainTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: Fonts.display,
    color: Colors.dark.textBright,
    letterSpacing: 0.5,
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
    backgroundColor: 'rgba(34, 211, 238, 0.08)',
    borderColor: 'rgba(34, 211, 238, 0.3)',
  },
  motionBadgeIdle: {
    backgroundColor: Colors.dark.backgroundElement,
    borderColor: Colors.dark.border,
  },
  motionPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  motionDotActive: {
    backgroundColor: Colors.dark.success,
    shadowColor: Colors.dark.success,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 2,
  },
  motionDotIdle: {
    backgroundColor: Colors.dark.textMuted,
  },
  motionText: {
    fontSize: 10,
    fontFamily: Fonts.mono,
    fontWeight: '700',
  },
  motionTextActive: {
    color: Colors.dark.cyan,
  },
  motionTextIdle: {
    color: Colors.dark.textSecondary,
  },
  heroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 4,
  },
  stepsCountBlock: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  bigStepNumber: {
    fontSize: 36,
    fontWeight: '900',
    fontFamily: Fonts.mono,
    color: Colors.dark.cyan,
    letterSpacing: 1,
    textShadowColor: 'rgba(34, 211, 238, 0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  targetStepLabel: {
    fontSize: 13,
    fontFamily: Fonts.sans,
    color: Colors.dark.textSecondary,
    fontWeight: '500',
  },
  percentageBadge: {
    backgroundColor: Colors.dark.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  percentageBadgeComplete: {
    borderColor: Colors.dark.success,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
  },
  percentageText: {
    fontSize: 14,
    fontFamily: Fonts.mono,
    fontWeight: '800',
    color: Colors.dark.cyan,
  },
  percentageTextComplete: {
    color: Colors.dark.success,
  },
  progressBarTrack: {
    height: 12,
    backgroundColor: Colors.dark.backgroundDeep,
    borderRadius: 6,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.dark.border,
    position: 'relative',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 5,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 6,
    elevation: 4,
  },
  barShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '40%',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  metricsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.dark.backgroundElement,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    paddingVertical: 12,
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
    fontSize: 16,
  },
  metricLabel: {
    fontSize: 10,
    fontFamily: Fonts.sans,
    color: Colors.dark.textMuted,
    fontWeight: '500',
  },
  metricValue: {
    fontSize: 13,
    fontFamily: Fonts.mono,
    fontWeight: '700',
    color: Colors.dark.text,
  },
  metricDivider: {
    width: 1,
    height: 22,
    backgroundColor: Colors.dark.border,
    marginHorizontal: 4,
  },
  claimButton: {
    backgroundColor: Colors.dark.accentDim,
    borderWidth: 1,
    borderColor: Colors.dark.accent,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: Colors.dark.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  claimButtonText: {
    fontFamily: Fonts.display,
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  completedBanner: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  completedText: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.dark.success,
  },
  remainingBanner: {
    backgroundColor: Colors.dark.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  remainingText: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    color: Colors.dark.textSecondary,
  },
});
