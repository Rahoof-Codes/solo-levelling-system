// ============================================================
// Workout Session Modal — Replaced with Figma Guided Workout View
// ============================================================

import React from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import type { Workout } from '@/types';
import { GuidedWorkoutView } from '@/components/guided-workout-view';

interface WorkoutSessionModalProps {
  visible: boolean;
  workout: Workout;
  onComplete: (durationActual: number) => void;
  onCancel: () => void;
}

export function WorkoutSessionModal({
  visible,
  workout,
  onComplete,
  onCancel,
}: WorkoutSessionModalProps) {
  if (!workout) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      transparent={false}
    >
      <View style={styles.container}>
        <GuidedWorkoutView
          workout={workout}
          onComplete={onComplete}
          onCancel={onCancel}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050611',
  },
});
