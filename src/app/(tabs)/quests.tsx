import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  RefreshControl,
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeInUp,
  ZoomIn,
} from 'react-native-reanimated';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from 'expo-router';
import { getQuestsForDate, completeQuest, createQuest, getTodaySteps } from '@/db/operations';
import { type Quest, Stat, QuestCategory } from '@/types';
import { StatColors, StatGlows, Colors, Fonts, Spacing } from '@/constants/theme';
import { XPClaimModal } from '@/components/xp-claim-modal';
import { QuestSessionModal } from '@/components/quest-session-modal';
import { isTimedQuest } from '@/lib/calculations/workout-duration';

export default function QuestsScreen() {
  const db = useSQLiteContext();
  const [quests, setQuests] = useState<Quest[]>([]);
  const [todaySteps, setTodaySteps] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  // Quest Session Modal State (Timer System)
  const [sessionQuest, setSessionQuest] = useState<Quest | null>(null);
  const [sessionModalVisible, setSessionModalVisible] = useState(false);

  // XP Claim Modal State
  const [claimModalVisible, setClaimModalVisible] = useState(false);
  const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null);
  const [claimResult, setClaimResult] = useState<{
    leveledUp: boolean;
    newLevel?: number;
    rankChanged: boolean;
    newRank?: string;
  } | null>(null);

  // New Quest Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const category = QuestCategory.FITNESS;
  const [stat, setStat] = useState<Stat>(Stat.STR);
  const [xpReward, setXpReward] = useState('30');

  const loadQuests = useCallback(async () => {
    try {
      const q = await getQuestsForDate(db);
      setQuests(q);

      const stepRec = await getTodaySteps(db);
      setTodaySteps(stepRec.steps);
    } catch (err) {
      console.error('Error loading quests:', err);
    }
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      loadQuests();
    }, [loadQuests])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadQuests();
    setRefreshing(false);
  };

  const handleStartClaim = (quest: Quest) => {
    setSelectedQuest(quest);
    setClaimResult(null);
    setClaimModalVisible(true);
  };

  const handleStartQuest = (quest: Quest) => {
    if (quest.is_completed === 1) return;
    setSessionQuest(quest);
    setSessionModalVisible(true);
  };

  const handleQuestSessionComplete = async (_durationActual: number) => {
    if (!sessionQuest) return;
    const questToClaim = sessionQuest;
    setSessionModalVisible(false);

    // Open XP Claim modal for this verified quest
    setSelectedQuest(questToClaim);
    setClaimResult(null);
    setClaimModalVisible(true);
  };

  const handleQuestSessionCancel = () => {
    setSessionModalVisible(false);
    setSessionQuest(null);
  };

  const handleClaimQuestXP = async () => {
    if (!selectedQuest) return;

    try {
      const { xpResult } = await completeQuest(db, selectedQuest.id);
      await loadQuests();

      setClaimResult({
        leveledUp: xpResult.leveledUp,
        newLevel: xpResult.newProfile.level,
        rankChanged: xpResult.rankChanged,
        newRank: xpResult.newProfile.rank,
      });
    } catch (err: any) {
      Alert.alert('System Error', err?.message ?? 'Could not claim quest reward');
      setClaimModalVisible(false);
    }
  };

  const handleDismissClaim = () => {
    setClaimModalVisible(false);
    setSelectedQuest(null);
    setClaimResult(null);
    loadQuests();
  };

  const handleCreateQuest = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Quest title is required');
      return;
    }
    const xp = parseInt(xpReward, 10) || 20;

    try {
      await createQuest(db, {
        title: title.trim(),
        description: description.trim() || undefined,
        category,
        xp_reward: xp,
        stat_affected: stat,
      });

      setTitle('');
      setDescription('');
      setModalVisible(false);
      await loadQuests();
      Alert.alert('Quest Created', 'New daily objective added to the System!');
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Could not create quest');
    }
  };

  const completedCount = quests.filter((q) => q.is_completed).length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.dark.accent} />}
      >
        {/* HEADER */}
        <Animated.View entering={FadeInDown.duration(450)} style={styles.header}>
          <View>
            <Text style={styles.systemTag}>DAILY</Text>
            <Text style={styles.title}>Quests</Text>
          </View>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setModalVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.addBtnText}>+ New Quest</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* PROGRESS OVERVIEW */}
        <Animated.View entering={FadeInDown.duration(450).delay(90)} style={styles.progressCard}>
          <View style={styles.progressRow}>
            <Text style={styles.progressLabel}>Today's progress</Text>
            <Text style={styles.progressValue}>
              {completedCount} / {quests.length} done
            </Text>
          </View>
          <View style={styles.barTrack}>
            <View
              style={[
                styles.barFill,
                {
                  width: `${quests.length > 0 ? (completedCount / quests.length) * 100 : 0}%`,
                },
              ]}
            />
            <View style={styles.barShine} />
          </View>
        </Animated.View>

        {/* QUESTS LIST */}
        <View style={styles.questList}>
          {quests.map((quest, index) => {
            const statColor = StatColors[quest.stat_affected] || Colors.dark.cyan;
            const statGlow = StatGlows[quest.stat_affected] || Colors.dark.cyanDim;
            return (
              <Animated.View
                key={quest.id}
                entering={FadeInUp.duration(400).delay(140 + index * 60)}
                style={[
                  styles.questCard,
                  quest.is_completed === 1 && styles.questCardCompleted,
                ]}
              >
                {/* Left accent stripe */}
                <View style={[styles.questStripe, { backgroundColor: statColor }]} />

                <View style={styles.questInner}>
                  <View style={styles.questHeader}>
                    <View style={[styles.statTag, { borderColor: statColor, backgroundColor: statGlow }]}>
                      <Text style={[styles.statTagText, { color: statColor }]}>
                        +{quest.xp_reward} {quest.stat_affected}
                      </Text>
                    </View>
                    <Text style={styles.categoryTag}>{quest.category.toUpperCase()}</Text>
                  </View>

                  <Text
                    style={[
                      styles.questTitle,
                      quest.is_completed === 1 && styles.questTitleCompleted,
                    ]}
                  >
                    {quest.title}
                  </Text>

                  {quest.description && (
                    <Text style={styles.questDesc}>{quest.description}</Text>
                  )}

                  {/* 10,000 STEPS LIVE PROGRESS HUD */}
                  {quest.title.toLowerCase().includes('step') && (
                    <View style={styles.stepProgressContainer}>
                      <View style={styles.stepProgressHeader}>
                        <Text style={styles.stepProgressLabel}>MOTION STEP TRACKER</Text>
                        <Text style={styles.stepProgressValue}>
                          {todaySteps.toLocaleString()} / 10,000 ({Math.min(100, Math.round((todaySteps / 10000) * 100))}%)
                        </Text>
                      </View>
                      <View style={styles.stepTrack}>
                        <View
                          style={[
                            styles.stepFill,
                            {
                              width: `${Math.min(100, Math.max(3, (todaySteps / 10000) * 100))}%`,
                              backgroundColor: todaySteps >= 10000 ? Colors.dark.success : Colors.dark.cyan,
                            },
                          ]}
                        />
                      </View>
                    </View>
                  )}

                  {quest.is_completed === 1 ? (
                    <Animated.View entering={ZoomIn.springify()} style={styles.completedBadge}>
                      <Text style={styles.completedText}>✓ Done</Text>
                    </Animated.View>
                  ) : quest.title.toLowerCase().includes('step') && todaySteps < 10000 ? (
                    <View style={[styles.completeBtn, styles.stepIncompleteBtn]}>
                      <Text style={styles.stepIncompleteText}>
                        {(10000 - todaySteps).toLocaleString()} steps remaining
                      </Text>
                    </View>
                  ) : quest.title.toLowerCase().includes('step') && todaySteps >= 10000 ? (
                    <TouchableOpacity
                      style={styles.completeBtn}
                      onPress={() => handleStartClaim(quest)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.completeBtnText}>Complete Quest</Text>
                    </TouchableOpacity>
                  ) : isTimedQuest(quest) ? (
                    <TouchableOpacity
                      style={styles.startBtn}
                      onPress={() => handleStartQuest(quest)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.startBtnText}>⚡ Start Quest</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={styles.completeBtn}
                      onPress={() => handleStartClaim(quest)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.completeBtnText}>Complete Quest</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </Animated.View>
            );
          })}
        </View>
      </ScrollView>

      {/* CREATE CUSTOM QUEST MODAL */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Corner ornaments */}
            <View style={[styles.modalCorner, styles.modalCornerTL]} />
            <View style={[styles.modalCorner, styles.modalCornerTR]} />
            <View style={[styles.modalCorner, styles.modalCornerBL]} />
            <View style={[styles.modalCorner, styles.modalCornerBR]} />

            <Text style={styles.modalTitle}>New Quest</Text>

            <View style={styles.modalForm}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Quest title</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Read 20 pages"
                  placeholderTextColor={Colors.dark.textDim}
                  value={title}
                  onChangeText={setTitle}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Description (optional)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Details or requirements"
                  placeholderTextColor={Colors.dark.textDim}
                  value={description}
                  onChangeText={setDescription}
                />
              </View>

              {/* STAT TARGET */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Reward stat</Text>
                <View style={styles.statSelector}>
                  {[Stat.STR, Stat.VIT, Stat.AGI, Stat.INT, Stat.PER].map((s) => (
                    <TouchableOpacity
                      key={s}
                      style={[
                        styles.statOption,
                        stat === s && { borderColor: StatColors[s], backgroundColor: StatGlows[s] },
                      ]}
                      onPress={() => setStat(s)}
                    >
                      <Text style={[styles.statOptionText, stat === s && { color: StatColors[s] }]}>
                        {s}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* XP REWARD */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>EXP reward (10–100)</Text>
                <TextInput
                  style={styles.textInput}
                  keyboardType="numeric"
                  placeholder="30"
                  placeholderTextColor={Colors.dark.textDim}
                  value={xpReward}
                  onChangeText={setXpReward}
                />
              </View>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.createBtn} onPress={handleCreateQuest}>
                <Text style={styles.createBtnText}>Create Quest</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* QUEST SESSION MODAL — Timer System */}
      {sessionQuest && (
        <QuestSessionModal
          visible={sessionModalVisible}
          quest={sessionQuest}
          onComplete={handleQuestSessionComplete}
          onCancel={handleQuestSessionCancel}
        />
      )}

      {/* LOCKED XP CLAIM MODAL FOR QUESTS */}
      {selectedQuest && (
        <XPClaimModal
          visible={claimModalVisible}
          xpAmount={selectedQuest.xp_reward}
          stat={selectedQuest.stat_affected}
          activityName={`QUEST: ${selectedQuest.title}`}
          onClaim={handleClaimQuestXP}
          onDismiss={handleDismissClaim}
          claimResult={claimResult}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  container: {
    padding: Spacing.threeHalf,
    gap: Spacing.threeHalf,
    paddingBottom: Spacing.six + 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: Spacing.two,
  },
  systemTag: {
    fontSize: 11,
    fontFamily: Fonts.display,
    color: Colors.dark.gold,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    fontFamily: Fonts.display,
    color: Colors.dark.textBright,
    letterSpacing: 1,
  },
  addBtn: {
    backgroundColor: Colors.dark.backgroundCard,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  addBtnText: {
    fontSize: 13,
    fontFamily: Fonts.display,
    fontWeight: '700',
    color: Colors.dark.accent,
    letterSpacing: 0.5,
  },
  progressCard: {
    backgroundColor: Colors.dark.backgroundCard,
    borderWidth: 1,
    borderColor: Colors.dark.borderBright,
    borderRadius: 16,
    padding: Spacing.threeHalf,
    gap: 10,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabel: {
    fontSize: 12,
    fontFamily: Fonts.sans,
    color: Colors.dark.textSecondary,
    fontWeight: '500',
  },
  progressValue: {
    fontSize: 13,
    fontFamily: Fonts.mono,
    fontWeight: '700',
    color: Colors.dark.success,
  },
  barTrack: {
    height: 10,
    backgroundColor: Colors.dark.backgroundDeep,
    borderRadius: 5,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.dark.border,
    position: 'relative',
  },
  barFill: {
    height: '100%',
    backgroundColor: Colors.dark.success,
    borderRadius: 4,
  },
  barShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '40%',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
  },
  questList: {
    gap: Spacing.three,
  },
  questCard: {
    backgroundColor: Colors.dark.backgroundCard,
    borderWidth: 1,
    borderColor: Colors.dark.borderBright,
    borderRadius: 16,
    overflow: 'hidden',
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  questCardCompleted: {
    borderColor: Colors.dark.border,
    opacity: 0.65,
  },
  questStripe: {
    width: 4,
  },
  questInner: {
    flex: 1,
    padding: Spacing.threeHalf,
    gap: 10,
  },
  questHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statTag: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statTagText: {
    fontSize: 11,
    fontFamily: Fonts.mono,
    fontWeight: '800',
  },
  categoryTag: {
    fontSize: 10,
    fontFamily: Fonts.display,
    color: Colors.dark.textMuted,
    fontWeight: '600',
    letterSpacing: 1,
  },
  questTitle: {
    fontSize: 17,
    fontWeight: '700',
    fontFamily: Fonts.display,
    color: Colors.dark.textBright,
    letterSpacing: 0.3,
  },
  questTitleCompleted: {
    textDecorationLine: 'line-through',
    color: Colors.dark.textSecondary,
  },
  questDesc: {
    fontSize: 13,
    fontFamily: Fonts.sans,
    color: Colors.dark.textSecondary,
  },
  completedBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  completedText: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.dark.success,
  },
  completeBtn: {
    backgroundColor: Colors.dark.accentDim,
    borderWidth: 1,
    borderColor: Colors.dark.accent,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  completeBtnText: {
    fontFamily: Fonts.display,
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  startBtn: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    borderWidth: 1,
    borderColor: Colors.dark.accent,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    shadowColor: Colors.dark.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  startBtnText: {
    fontFamily: Fonts.display,
    fontSize: 14,
    fontWeight: '700',
    color: Colors.dark.accentBright,
    letterSpacing: 0.5,
  },
  stepProgressContainer: {
    backgroundColor: Colors.dark.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: 10,
    padding: 12,
    gap: 6,
    marginTop: 4,
  },
  stepProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepProgressLabel: {
    fontSize: 10,
    fontFamily: Fonts.display,
    color: Colors.dark.cyan,
    fontWeight: '700',
    letterSpacing: 1,
  },
  stepProgressValue: {
    fontSize: 11,
    fontFamily: Fonts.mono,
    fontWeight: '700',
    color: Colors.dark.cyan,
  },
  stepTrack: {
    height: 8,
    backgroundColor: Colors.dark.backgroundDeep,
    borderRadius: 4,
    overflow: 'hidden',
  },
  stepFill: {
    height: '100%',
    borderRadius: 4,
  },
  stepIncompleteBtn: {
    backgroundColor: Colors.dark.backgroundElement,
    borderColor: Colors.dark.border,
  },
  stepIncompleteText: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    fontWeight: '500',
    color: Colors.dark.textSecondary,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(3, 7, 16, 0.92)',
    justifyContent: 'center',
    padding: Spacing.threeHalf,
  },
  modalContent: {
    backgroundColor: Colors.dark.backgroundCard,
    borderWidth: 1.5,
    borderColor: Colors.dark.accent,
    borderRadius: 20,
    padding: Spacing.four,
    gap: Spacing.three,
    shadowColor: Colors.dark.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  modalCorner: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderColor: Colors.dark.accent,
  },
  modalCornerTL: { top: -1, left: -1, borderTopWidth: 2, borderLeftWidth: 2 },
  modalCornerTR: { top: -1, right: -1, borderTopWidth: 2, borderRightWidth: 2 },
  modalCornerBL: { bottom: -1, left: -1, borderBottomWidth: 2, borderLeftWidth: 2 },
  modalCornerBR: { bottom: -1, right: -1, borderBottomWidth: 2, borderRightWidth: 2 },

  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: Fonts.display,
    color: Colors.dark.textBright,
    textAlign: 'center',
    letterSpacing: 1,
  },
  modalForm: {
    gap: Spacing.three,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 11,
    fontFamily: Fonts.display,
    color: Colors.dark.textSecondary,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  textInput: {
    backgroundColor: Colors.dark.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: Colors.dark.textBright,
    fontFamily: Fonts.sans,
    fontSize: 15,
  },
  statSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  statOption: {
    flex: 1,
    backgroundColor: Colors.dark.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  statOptionText: {
    fontSize: 13,
    fontFamily: Fonts.mono,
    fontWeight: '800',
    color: Colors.dark.textMuted,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: 4,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: Colors.dark.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark.textSecondary,
  },
  createBtn: {
    flex: 2,
    backgroundColor: Colors.dark.accent,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: Colors.dark.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  createBtnText: {
    fontFamily: Fonts.display,
    fontSize: 15,
    fontWeight: '700',
    color: Colors.dark.backgroundDeep,
    letterSpacing: 0.5,
  },
});
