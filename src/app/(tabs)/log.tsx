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
import { getTodayMeals, logMeal, getDailyCalorieSummary, getProfile } from '@/db/operations';
import { type Meal, type DailyCalorieSummary, type Profile } from '@/types';
import { Fonts, Spacing } from '@/constants/theme';
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00A8FF" />}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <View>
            <Text style={styles.systemTag}>ENERGY INTAKE</Text>
            <Text style={styles.title}>MEAL LOG</Text>
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
            <Text style={styles.addBtnText}>+ LOG RATION</Text>
          </TouchableOpacity>
        </View>

        {/* ENERGY / MANA SUMMARY CARD */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryTop}>
            <View>
              <Text style={styles.summaryLabel}>TOTAL INTAKE</Text>
              <Text style={styles.summaryBigNum}>{Math.round(summary.consumed)} kcal</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.summaryLabel}>REMAINING</Text>
              <Text style={[styles.summaryBigNum, { color: remainingCalories >= 0 ? '#00FF88' : '#FF3366' }]}>
                {Math.round(remainingCalories)} kcal
              </Text>
            </View>
          </View>

          {/* MACROS TARGET BARS */}
          <View style={styles.macrosSection}>
            {/* Protein */}
            <View style={styles.macroRow}>
              <View style={styles.macroLabels}>
                <Text style={[styles.macroKey, { color: '#FF4444' }]}>PROTEIN</Text>
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
                      backgroundColor: '#FF4444',
                    },
                  ]}
                />
              </View>
            </View>

            {/* Carbs */}
            <View style={styles.macroRow}>
              <View style={styles.macroLabels}>
                <Text style={[styles.macroKey, { color: '#FFAA00' }]}>CARBS</Text>
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
                      backgroundColor: '#FFAA00',
                    },
                  ]}
                />
              </View>
            </View>

            {/* Fat */}
            <View style={styles.macroRow}>
              <View style={styles.macroLabels}>
                <Text style={[styles.macroKey, { color: '#00FF88' }]}>FAT</Text>
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
                      backgroundColor: '#00FF88',
                    },
                  ]}
                />
              </View>
            </View>
          </View>
        </View>

        {/* LOGGED MEALS LIST */}
        <View style={styles.mealSection}>
          <Text style={styles.sectionTitle}>TODAY'S RATIONS ({meals.length})</Text>

          {meals.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyEmoji}>🍽️</Text>
              <Text style={styles.emptyText}>No food entries logged today.</Text>
              <Text style={styles.emptySub}>Log meals to replenish energy & track macros.</Text>
            </View>
          ) : (
            meals.map((meal) => (
              <View key={meal.id} style={styles.mealCard}>
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
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* LOG MEAL MODAL */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>[ LOG ENERGY RATION ]</Text>

            <View style={styles.modalForm}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>MEAL / FOOD NAME</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Grilled Chicken & Rice"
                  placeholderTextColor="#476285"
                  value={mealName}
                  onChangeText={setMealName}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>CALORIES (KCAL)</Text>
                <TextInput
                  style={styles.textInput}
                  keyboardType="numeric"
                  placeholder="650"
                  placeholderTextColor="#476285"
                  value={calories}
                  onChangeText={setCalories}
                />
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>PROTEIN (G)</Text>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="numeric"
                    placeholder="45"
                    placeholderTextColor="#476285"
                    value={protein}
                    onChangeText={setProtein}
                  />
                </View>

                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>CARBS (G)</Text>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="numeric"
                    placeholder="60"
                    placeholderTextColor="#476285"
                    value={carbs}
                    onChangeText={setCarbs}
                  />
                </View>

                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>FAT (G)</Text>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="numeric"
                    placeholder="15"
                    placeholderTextColor="#476285"
                    value={fat}
                    onChangeText={setFat}
                  />
                </View>
              </View>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelBtnText}>CANCEL</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.createBtn} onPress={handleLogMeal}>
                <Text style={styles.createBtnText}>LOG MEAL</Text>
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
  summaryCard: {
    backgroundColor: '#0D1424',
    borderWidth: 1.5,
    borderColor: '#19315A',
    borderRadius: 12,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  summaryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#172744',
    paddingBottom: 8,
  },
  summaryLabel: {
    fontSize: 10,
    fontFamily: Fonts.mono,
    color: '#6582A6',
    letterSpacing: 1,
  },
  summaryBigNum: {
    fontSize: 20,
    fontWeight: '900',
    fontFamily: Fonts.mono,
    color: '#E0E8FF',
  },
  macrosSection: {
    gap: 8,
    marginTop: 4,
  },
  macroRow: {
    gap: 4,
  },
  macroLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  macroKey: {
    fontSize: 10,
    fontFamily: Fonts.mono,
    fontWeight: '800',
  },
  macroVal: {
    fontSize: 10,
    fontFamily: Fonts.mono,
    color: '#7A96BA',
  },
  macroTrack: {
    height: 6,
    backgroundColor: '#090E1A',
    borderRadius: 3,
    overflow: 'hidden',
  },
  macroFill: {
    height: '100%',
    borderRadius: 3,
  },
  mealSection: {
    gap: Spacing.two,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: Fonts.mono,
    fontWeight: '800',
    color: '#00A8FF',
    letterSpacing: 1,
  },
  emptyCard: {
    backgroundColor: '#0D1424',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#162846',
    padding: Spacing.four,
    alignItems: 'center',
    gap: 6,
  },
  emptyEmoji: {
    fontSize: 28,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#B0C8E8',
  },
  emptySub: {
    fontSize: 11,
    color: '#556F91',
    textAlign: 'center',
  },
  mealCard: {
    backgroundColor: '#0D1424',
    borderWidth: 1,
    borderColor: '#1A2E50',
    borderRadius: 8,
    padding: Spacing.three,
    gap: 6,
  },
  mealMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mealName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#E0E8FF',
  },
  mealCalories: {
    fontSize: 14,
    fontWeight: '900',
    fontFamily: Fonts.mono,
    color: '#00F0FF',
  },
  mealMacros: {
    flexDirection: 'row',
    gap: 12,
  },
  mealMacroText: {
    fontSize: 10,
    fontFamily: Fonts.mono,
    color: '#6582A6',
  },
  mealTime: {
    fontSize: 10,
    fontFamily: Fonts.mono,
    color: '#4B6282',
    marginLeft: 'auto',
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
