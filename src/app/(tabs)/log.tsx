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
  FadeIn,
} from 'react-native-reanimated';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from 'expo-router';
import { getTodayMeals, logMeal, getDailyCalorieSummary, getProfile } from '@/db/operations';
import { type Meal, type DailyCalorieSummary, type Profile } from '@/types';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { ManaReplenishModal } from '@/components/mana-replenish-modal';

export default function MealLogScreen() {
  const db = useSQLiteContext();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [summary, setSummary] = useState<DailyCalorieSummary>({
    consumed: 0,
    burned: 0,
    target: 2000,
    net: 0,
    protein_consumed: 0,
    carbs_consumed: 0,
    fat_consumed: 0,
  });
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  // Mana Replenish Animation Modal State
  const [manaModalVisible, setManaModalVisible] = useState(false);
  const [lastLoggedMeal, setLastLoggedMeal] = useState<{
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  } | null>(null);

  // Form State
  const [mealName, setMealName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');

  const loadData = useCallback(async () => {
    try {
      const p = await getProfile(db);
      setProfile(p);
      const m = await getTodayMeals(db);
      setMeals(m);
      const s = await getDailyCalorieSummary(db);
      setSummary(s);
    } catch (err) {
      console.error('Error loading meal data:', err);
    }
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleLogMeal = async () => {
    if (!mealName.trim() || !calories) {
      Alert.alert('Validation Error', 'Meal name and calories are required');
      return;
    }

    const calsNum = parseFloat(calories) || 0;
    const proteinNum = parseFloat(protein) || 0;
    const carbsNum = parseFloat(carbs) || 0;
    const fatNum = parseFloat(fat) || 0;
    const nameStr = mealName.trim();

    try {
      await logMeal(db, {
        name: nameStr,
        calories: calsNum,
        protein_g: proteinNum,
        carbs_g: carbsNum,
        fat_g: fatNum,
      });

      setMealName('');
      setCalories('');
      setProtein('');
      setCarbs('');
      setFat('');
      setModalVisible(false);

      await loadData();

      // Show Mana Replenishment animation modal!
      setLastLoggedMeal({
        name: nameStr,
        calories: calsNum,
        protein: proteinNum,
        carbs: carbsNum,
        fat: fatNum,
      });
      setManaModalVisible(true);
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Could not log meal');
    }
  };

  const targetCalories = profile?.daily_calories ?? 2000;
  const targetProtein = profile?.protein_g ?? 150;
  const targetCarbs = profile?.carbs_g ?? 200;
  const targetFat = profile?.fat_g ?? 65;

  const remainingCalories = targetCalories - summary.consumed;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.dark.accent} />}
      >
        {/* HEADER */}
        <Animated.View entering={FadeInDown.duration(450)} style={styles.header}>
          <View>
            <Text style={styles.systemTag}>NUTRITION</Text>
            <Text style={styles.title}>Mana Refinery</Text>
          </View>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setModalVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.addBtnText}>+ Log Meal</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* ENERGY / MANA SUMMARY CARD */}
        <Animated.View entering={FadeInDown.duration(450).delay(80)} style={styles.summaryCard}>
          <View style={styles.summaryTop}>
            <View>
              <Text style={styles.summaryLabel}>TOTAL INTAKE</Text>
              <Text style={styles.summaryBigNum}>{Math.round(summary.consumed)} kcal</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.summaryLabel}>REMAINING</Text>
              <Text style={[styles.summaryBigNum, { color: remainingCalories >= 0 ? Colors.dark.success : Colors.dark.danger }]}>
                {Math.round(remainingCalories)} kcal
              </Text>
            </View>
          </View>

          {/* MACROS TARGET BARS */}
          <View style={styles.macrosSection}>
            {/* Protein */}
            <View style={styles.macroRow}>
              <View style={styles.macroLabels}>
                <Text style={[styles.macroKey, { color: '#EF4444' }]}>PROTEIN</Text>
                <Text style={styles.macroVal}>
                  {Math.round(summary.protein_consumed)} / {Math.round(targetProtein)}g
                </Text>
              </View>
              <View style={styles.macroTrack}>
                <View
                  style={[
                    styles.macroFill,
                    {
                      width: `${Math.min(100, (summary.protein_consumed / Math.max(1, targetProtein)) * 100)}%`,
                      backgroundColor: '#EF4444',
                    },
                  ]}
                />
              </View>
            </View>

            {/* Carbs */}
            <View style={styles.macroRow}>
              <View style={styles.macroLabels}>
                <Text style={[styles.macroKey, { color: Colors.dark.gold }]}>CARBS</Text>
                <Text style={styles.macroVal}>
                  {Math.round(summary.carbs_consumed)} / {Math.round(targetCarbs)}g
                </Text>
              </View>
              <View style={styles.macroTrack}>
                <View
                  style={[
                    styles.macroFill,
                    {
                      width: `${Math.min(100, (summary.carbs_consumed / Math.max(1, targetCarbs)) * 100)}%`,
                      backgroundColor: Colors.dark.gold,
                    },
                  ]}
                />
              </View>
            </View>

            {/* Fat */}
            <View style={styles.macroRow}>
              <View style={styles.macroLabels}>
                <Text style={[styles.macroKey, { color: Colors.dark.success }]}>FAT</Text>
                <Text style={styles.macroVal}>
                  {Math.round(summary.fat_consumed)} / {Math.round(targetFat)}g
                </Text>
              </View>
              <View style={styles.macroTrack}>
                <View
                  style={[
                    styles.macroFill,
                    {
                      width: `${Math.min(100, (summary.fat_consumed / Math.max(1, targetFat)) * 100)}%`,
                      backgroundColor: Colors.dark.success,
                    },
                  ]}
                />
              </View>
            </View>
          </View>
        </Animated.View>

        {/* LOGGED MEALS LIST */}
        <View style={styles.mealSection}>
          <Text style={styles.sectionTitle}>Today's Meals ({meals.length})</Text>

          {meals.length === 0 ? (
            <Animated.View entering={FadeIn.duration(400).delay(150)} style={styles.emptyCard}>
              <Text style={styles.emptyEmoji}>🍽️</Text>
              <Text style={styles.emptyText}>No food entries logged today.</Text>
              <Text style={styles.emptySub}>Log meals to replenish mana & track macros.</Text>
            </Animated.View>
          ) : (
            meals.map((meal, index) => (
              <Animated.View
                key={meal.id}
                entering={FadeInUp.duration(400).delay(120 + index * 50)}
                style={styles.mealCard}
              >
                <View style={styles.mealMain}>
                  <Text style={styles.mealName}>{meal.name}</Text>
                  <Text style={styles.mealCalories}>+{Math.round(meal.calories)} kcal</Text>
                </View>
                <View style={styles.mealMacros}>
                  <Text style={styles.mealMacroText}>P: {Math.round(meal.protein_g)}g</Text>
                  <Text style={styles.mealMacroText}>C: {Math.round(meal.carbs_g)}g</Text>
                  <Text style={styles.mealMacroText}>F: {Math.round(meal.fat_g)}g</Text>
                  <Text style={styles.mealTime}>
                    {new Date(meal.logged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              </Animated.View>
            ))
          )}
        </View>
      </ScrollView>

      {/* LOG MEAL MODAL */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Corner ornaments */}
            <View style={[styles.modalCorner, styles.modalCornerTL]} />
            <View style={[styles.modalCorner, styles.modalCornerTR]} />
            <View style={[styles.modalCorner, styles.modalCornerBL]} />
            <View style={[styles.modalCorner, styles.modalCornerBR]} />

            <Text style={styles.modalTitle}>Log a Meal</Text>

            <View style={styles.modalForm}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Meal / food name</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Grilled Chicken & Rice"
                  placeholderTextColor={Colors.dark.textDim}
                  value={mealName}
                  onChangeText={setMealName}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Calories (kcal)</Text>
                <TextInput
                  style={styles.textInput}
                  keyboardType="numeric"
                  placeholder="650"
                  placeholderTextColor={Colors.dark.textDim}
                  value={calories}
                  onChangeText={setCalories}
                />
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Protein (g)</Text>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="numeric"
                    placeholder="45"
                    placeholderTextColor={Colors.dark.textDim}
                    value={protein}
                    onChangeText={setProtein}
                  />
                </View>

                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Carbs (g)</Text>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="numeric"
                    placeholder="60"
                    placeholderTextColor={Colors.dark.textDim}
                    value={carbs}
                    onChangeText={setCarbs}
                  />
                </View>

                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Fat (g)</Text>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="numeric"
                    placeholder="15"
                    placeholderTextColor={Colors.dark.textDim}
                    value={fat}
                    onChangeText={setFat}
                  />
                </View>
              </View>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.createBtn} onPress={handleLogMeal}>
                <Text style={styles.createBtnText}>Save Meal</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MANA REPLENISHMENT ANIMATION MODAL */}
      {lastLoggedMeal && (
        <ManaReplenishModal
          visible={manaModalVisible}
          mealName={lastLoggedMeal.name}
          calories={lastLoggedMeal.calories}
          protein={lastLoggedMeal.protein}
          carbs={lastLoggedMeal.carbs}
          fat={lastLoggedMeal.fat}
          targetCalories={targetCalories}
          totalCaloriesToday={summary.consumed}
          onDismiss={() => {
            setManaModalVisible(false);
            setLastLoggedMeal(null);
          }}
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
    color: Colors.dark.mana,
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
    borderColor: 'rgba(59, 130, 246, 0.3)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  addBtnText: {
    fontSize: 13,
    fontFamily: Fonts.display,
    fontWeight: '700',
    color: Colors.dark.mana,
    letterSpacing: 0.5,
  },
  summaryCard: {
    backgroundColor: Colors.dark.backgroundCard,
    borderWidth: 1,
    borderColor: Colors.dark.borderBright,
    borderRadius: 16,
    padding: Spacing.threeHalf,
    gap: Spacing.three,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  summaryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
    paddingBottom: 12,
  },
  summaryLabel: {
    fontSize: 10,
    fontFamily: Fonts.display,
    color: Colors.dark.textMuted,
    fontWeight: '600',
    letterSpacing: 1,
  },
  summaryBigNum: {
    fontSize: 24,
    fontWeight: '800',
    fontFamily: Fonts.mono,
    color: Colors.dark.textBright,
  },
  macrosSection: {
    gap: 12,
    marginTop: 4,
  },
  macroRow: {
    gap: 6,
  },
  macroLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  macroKey: {
    fontSize: 11,
    fontFamily: Fonts.display,
    fontWeight: '700',
    letterSpacing: 1,
  },
  macroVal: {
    fontSize: 11,
    fontFamily: Fonts.mono,
    color: Colors.dark.textSecondary,
  },
  macroTrack: {
    height: 8,
    backgroundColor: Colors.dark.backgroundDeep,
    borderRadius: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  macroFill: {
    height: '100%',
    borderRadius: 3,
  },
  mealSection: {
    gap: Spacing.three,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: Fonts.display,
    fontWeight: '700',
    color: Colors.dark.mana,
    letterSpacing: 1,
  },
  emptyCard: {
    backgroundColor: Colors.dark.backgroundCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.dark.borderBright,
    padding: Spacing.four,
    alignItems: 'center',
    gap: 10,
  },
  emptyEmoji: {
    fontSize: 32,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: Fonts.display,
    color: Colors.dark.text,
    letterSpacing: 0.3,
  },
  emptySub: {
    fontSize: 12,
    fontFamily: Fonts.sans,
    color: Colors.dark.textSecondary,
    textAlign: 'center',
  },
  mealCard: {
    backgroundColor: Colors.dark.backgroundCard,
    borderWidth: 1,
    borderColor: Colors.dark.borderBright,
    borderRadius: 14,
    padding: Spacing.threeHalf,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  mealMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mealName: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: Fonts.sans,
    color: Colors.dark.textBright,
  },
  mealCalories: {
    fontSize: 14,
    fontWeight: '800',
    fontFamily: Fonts.mono,
    color: Colors.dark.mana,
  },
  mealMacros: {
    flexDirection: 'row',
    gap: 12,
  },
  mealMacroText: {
    fontSize: 11,
    fontFamily: Fonts.mono,
    color: Colors.dark.textSecondary,
  },
  mealTime: {
    fontSize: 11,
    fontFamily: Fonts.sans,
    color: Colors.dark.textMuted,
    marginLeft: 'auto',
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
    borderColor: Colors.dark.mana,
    borderRadius: 20,
    padding: Spacing.four,
    gap: Spacing.three,
    shadowColor: Colors.dark.mana,
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
    borderColor: Colors.dark.mana,
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
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
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
    backgroundColor: Colors.dark.mana,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: Colors.dark.mana,
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
