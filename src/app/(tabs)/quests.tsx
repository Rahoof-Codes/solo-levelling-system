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
import { StatColors, Fonts, Spacing } from '@/constants/theme';
import { XPClaimModal } from '@/components/xp-claim-modal';

export default function QuestsScreen() {
  const db = useSQLiteContext();
  const [quests, setQuests] = useState<Quest[]>([]);
  const [todaySteps, setTodaySteps] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

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
  const [category, setCategory] = useState<QuestCategory>(QuestCategory.FITNESS);
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00A8FF" />}
      >
        {/* HEADER */}
        <Animated.View entering={FadeInDown.duration(450)} style={styles.header}>
          <View>
            <Text style={styles.systemTag}>Daily</Text>
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
          </View>
        </Animated.View>

        {/* QUESTS LIST */}
        <View style={styles.questList}>
          {quests.map((quest, index) => {
            const statColor = StatColors[quest.stat_affected] || '#00F0FF';
            return (
              <Animated.View
                key={quest.id}
                entering={FadeInUp.duration(400).delay(140 + index * 60)}
                style={[
                  styles.questCard,
                  quest.is_completed === 1 && styles.questCardCompleted,
                ]}
              >
                <View style={styles.questHeader}>
                  <View style={[styles.statTag, { borderColor: statColor }]}>
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
                            backgroundColor: todaySteps >= 10000 ? '#00FF88' : '#00F0FF',
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
                  <TouchableOpacity
                    style={[styles.completeBtn, styles.stepIncompleteBtn]}
                    onPress={() => handleStartClaim(quest)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.stepIncompleteText}>
                      {(10000 - todaySteps).toLocaleString()} steps remaining
                    </Text>
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
              </Animated.View>
            );
          })}
        </View>
      </ScrollView>

      {/* CREATE CUSTOM QUEST MODAL */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>New Quest</Text>

            <View style={styles.modalForm}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Quest title</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Read 20 pages"
                  placeholderTextColor="#476285"
                  value={title}
                  onChangeText={setTitle}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Description (optional)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Details or requirements"
                  placeholderTextColor="#476285"
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
                        stat === s && { borderColor: StatColors[s], backgroundColor: 'rgba(0,168,255,0.1)' },
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
                  placeholderTextColor="#476285"
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
    backgroundColor: '#0B1120',
  },
  container: {
    padding: Spacing.threeHalf,
    gap: Spacing.threeHalf,
    paddingBottom: Spacing.six,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: Spacing.two,
  },
  systemTag: {
    fontSize: 12,
    fontFamily: Fonts.sans,
    color: '#00A8FF',
    fontWeight: '600',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: Fonts.sans,
    color: '#E8ECF4',
  },
  addBtn: {
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: 'rgba(0, 168, 255, 0.3)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  addBtnText: {
    fontSize: 13,
    fontFamily: Fonts.sans,
    fontWeight: '600',
    color: '#00A8FF',
  },
  progressCard: {
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 14,
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
    color: '#8896AB',
    fontWeight: '500',
  },
  progressValue: {
    fontSize: 13,
    fontFamily: Fonts.mono,
    fontWeight: '700',
    color: '#00A8FF',
  },
  barTrack: {
    height: 8,
    backgroundColor: '#0E1726',
    borderRadius: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  barFill: {
    height: '100%',
    backgroundColor: '#00FF88',
    borderRadius: 3,
  },
  questList: {
    gap: Spacing.three,
  },
  questCard: {
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 14,
    padding: Spacing.threeHalf,
    gap: 10,
  },
  questCardCompleted: {
    borderColor: '#1A2332',
    opacity: 0.7,
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
    paddingVertical: 3,
    backgroundColor: '#0E1726',
  },
  statTagText: {
    fontSize: 11,
    fontFamily: Fonts.mono,
    fontWeight: '800',
  },
  categoryTag: {
    fontSize: 11,
    fontFamily: Fonts.sans,
    color: '#6B7B8F',
    fontWeight: '500',
  },
  questTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: Fonts.sans,
    color: '#E8ECF4',
  },
  questTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#8896AB',
  },
  questDesc: {
    fontSize: 13,
    fontFamily: Fonts.sans,
    color: '#8896AB',
  },
  completedBadge: {
    backgroundColor: 'rgba(0, 255, 136, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 136, 0.25)',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  completedText: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    fontWeight: '600',
    color: '#00FF88',
  },
  completeBtn: {
    backgroundColor: '#0066BB',
    borderWidth: 1,
    borderColor: '#00A8FF',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  completeBtnText: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    padding: Spacing.threeHalf,
  },
  modalContent: {
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 18,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: Fonts.sans,
    color: '#E8ECF4',
    textAlign: 'center',
  },
  modalForm: {
    gap: Spacing.three,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontFamily: Fonts.sans,
    color: '#8896AB',
    fontWeight: '500',
  },
  textInput: {
    backgroundColor: '#0E1726',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#E8ECF4',
    fontFamily: Fonts.sans,
    fontSize: 15,
  },
  statSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  statOption: {
    flex: 1,
    backgroundColor: '#0E1726',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  statOptionText: {
    fontSize: 13,
    fontFamily: Fonts.mono,
    fontWeight: '800',
    color: '#6B7B8F',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: 4,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#0E1726',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    fontWeight: '600',
    color: '#8896AB',
  },
  createBtn: {
    flex: 2,
    backgroundColor: '#00A8FF',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  createBtnText: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    fontWeight: '700',
    color: '#0B1120',
  },
  stepProgressContainer: {
    backgroundColor: '#0E1726',
    borderWidth: 1,
    borderColor: '#1E293B',
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
    fontSize: 11,
    fontFamily: Fonts.sans,
    color: '#00A8FF',
    fontWeight: '600',
  },
  stepProgressValue: {
    fontSize: 12,
    fontFamily: Fonts.mono,
    fontWeight: '700',
    color: '#00A8FF',
  },
  stepTrack: {
    height: 6,
    backgroundColor: '#0B1120',
    borderRadius: 3,
    overflow: 'hidden',
  },
  stepFill: {
    height: '100%',
    borderRadius: 3,
  },
  stepIncompleteBtn: {
    backgroundColor: '#0E1726',
    borderColor: '#1E293B',
  },
  stepIncompleteText: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    fontWeight: '500',
    color: '#8896AB',
  },
});
