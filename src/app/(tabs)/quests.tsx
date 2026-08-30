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
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from 'expo-router';
import { getQuestsForDate, completeQuest, createQuest } from '@/db/operations';
import { type Quest, Stat, QuestCategory } from '@/types';
import { StatColors, Fonts, Spacing } from '@/constants/theme';
import { XPClaimModal } from '@/components/xp-claim-modal';

export default function QuestsScreen() {
  const db = useSQLiteContext();
  const [quests, setQuests] = useState<Quest[]>([]);
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
        <View style={styles.header}>
          <View>
            <Text style={styles.systemTag}>DAILY DIRECTIVES</Text>
            <Text style={styles.title}>SYSTEM QUESTS</Text>
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
            <Text style={styles.addBtnText}>+ CUSTOM QUEST</Text>
          </TouchableOpacity>
        </View>

        {/* PROGRESS OVERVIEW */}
        <View style={styles.progressCard}>
          <View style={styles.progressRow}>
            <Text style={styles.progressLabel}>TODAY'S OBJECTIVES</Text>
            <Text style={styles.progressValue}>
              {completedCount} / {quests.length} COMPLETED
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
        </View>

        {/* QUESTS LIST */}
        <View style={styles.questList}>
          {quests.map((quest) => {
            const statColor = StatColors[quest.stat_affected] || '#00F0FF';
            return (
              <View
                key={quest.id}
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

                {quest.is_completed === 1 ? (
                  <View style={styles.completedBadge}>
                    <Text style={styles.completedText}>✓ OBJECTIVE ACCOMPLISHED</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.completeBtn}
                    onPress={() => handleStartClaim(quest)}
                  >
                    <Text style={styles.completeBtnText}>CLAIM EXP & COMPLETE →</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* CREATE CUSTOM QUEST MODAL */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>[ CREATE CUSTOM QUEST ]</Text>

            <View style={styles.modalForm}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>QUEST TITLE</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Read 20 pages"
                  placeholderTextColor="#476285"
                  value={title}
                  onChangeText={setTitle}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>DESCRIPTION (OPTIONAL)</Text>
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
                <Text style={styles.inputLabel}>REWARD STAT</Text>
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
                <Text style={styles.inputLabel}>EXP REWARD (10-100)</Text>
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
                <Text style={styles.cancelBtnText}>CANCEL</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.createBtn} onPress={handleCreateQuest}>
                <Text style={styles.createBtnText}>INITIALIZE QUEST</Text>
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
    backgroundColor: '#070B14',
  },
  container: {
    padding: Spacing.three,
    gap: Spacing.three,
    paddingBottom: Spacing.six,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: Spacing.two,
  },
  systemTag: {
    fontSize: 10,
    fontFamily: Fonts.mono,
    color: '#00A8FF',
    letterSpacing: 1.5,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#E0E8FF',
    letterSpacing: 1,
  },
  addBtn: {
    backgroundColor: '#0D1424',
    borderWidth: 1,
    borderColor: '#00A8FF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  addBtnText: {
    fontSize: 11,
    fontFamily: Fonts.mono,
    fontWeight: '800',
    color: '#00F0FF',
    letterSpacing: 0.5,
  },
  progressCard: {
    backgroundColor: '#0D1424',
    borderWidth: 1,
    borderColor: '#19315A',
    borderRadius: 10,
    padding: Spacing.three,
    gap: 8,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabel: {
    fontSize: 10,
    fontFamily: Fonts.mono,
    color: '#6582A6',
    letterSpacing: 1,
  },
  progressValue: {
    fontSize: 12,
    fontFamily: Fonts.mono,
    fontWeight: '800',
    color: '#00F0FF',
  },
  barTrack: {
    height: 8,
    backgroundColor: '#090E1A',
    borderRadius: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#14223A',
  },
  barFill: {
    height: '100%',
    backgroundColor: '#00FF88',
    borderRadius: 3,
  },
  questList: {
    gap: Spacing.two,
  },
  questCard: {
    backgroundColor: '#0D1424',
    borderWidth: 1.5,
    borderColor: '#1A2E50',
    borderRadius: 10,
    padding: Spacing.three,
    gap: 8,
  },
  questCardCompleted: {
    borderColor: '#122438',
    opacity: 0.7,
  },
  questHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statTag: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#090E1A',
  },
  statTagText: {
    fontSize: 11,
    fontFamily: Fonts.mono,
    fontWeight: '900',
  },
  categoryTag: {
    fontSize: 10,
    fontFamily: Fonts.mono,
    color: '#556F91',
    letterSpacing: 1,
  },
  questTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#E0E8FF',
  },
  questTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#6582A6',
  },
  questDesc: {
    fontSize: 12,
    color: '#7A96BA',
  },
  completedBadge: {
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
    borderWidth: 1,
    borderColor: '#00FF88',
    borderRadius: 6,
    paddingVertical: 8,
    alignItems: 'center',
  },
  completedText: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    fontWeight: '800',
    color: '#00FF88',
    letterSpacing: 1,
  },
  completeBtn: {
    backgroundColor: '#0055AA',
    borderWidth: 1,
    borderColor: '#00A8FF',
    borderRadius: 6,
    paddingVertical: 10,
    alignItems: 'center',
  },
  completeBtnText: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    padding: Spacing.three,
  },
  modalContent: {
    backgroundColor: '#0D1424',
    borderWidth: 1.5,
    borderColor: '#00A8FF',
    borderRadius: 14,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '900',
    fontFamily: Fonts.mono,
    color: '#00F0FF',
    textAlign: 'center',
    letterSpacing: 1.5,
  },
  modalForm: {
    gap: Spacing.two,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 10,
    fontFamily: Fonts.mono,
    color: '#7A96BA',
    letterSpacing: 1,
  },
  textInput: {
    backgroundColor: '#090E1A',
    borderWidth: 1,
    borderColor: '#1C335C',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#E0E8FF',
    fontFamily: Fonts.mono,
    fontSize: 14,
  },
  statSelector: {
    flexDirection: 'row',
    gap: 6,
  },
  statOption: {
    flex: 1,
    backgroundColor: '#090E1A',
    borderWidth: 1,
    borderColor: '#1C335C',
    borderRadius: 6,
    paddingVertical: 8,
    alignItems: 'center',
  },
  statOptionText: {
    fontSize: 12,
    fontFamily: Fonts.mono,
    fontWeight: '900',
    color: '#556F91',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: 4,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#090E1A',
    borderWidth: 1,
    borderColor: '#1C335C',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    fontWeight: '700',
    color: '#7A96BA',
  },
  createBtn: {
    flex: 2,
    backgroundColor: '#00A8FF',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  createBtnText: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    fontWeight: '900',
    color: '#070B14',
    letterSpacing: 1,
  },
});
