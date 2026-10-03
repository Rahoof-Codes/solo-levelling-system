import React, { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { Text, StyleSheet, Platform, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Colors, Fonts } from '@/constants/theme';
import { useAudio } from '@/contexts/AudioContext';

function AnimatedTabBarIcon({ icon, focused, color }: { icon: string; focused: boolean; color: string }) {
  const scale = useSharedValue(1);
  const glowOpacity = useSharedValue(0);

  useEffect(() => {
    if (focused) {
      scale.value = withSpring(1.3, { damping: 10, stiffness: 220 }, () => {
        scale.value = withSpring(1.12, { damping: 12 });
      });
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(0.6, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.2, { duration: 1200, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    } else {
      scale.value = withSpring(1, { damping: 14 });
      glowOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [focused]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  return (
    <View style={styles.iconOuter}>
      {/* Glow ring behind icon when active */}
      <Animated.View style={[styles.iconGlowRing, { backgroundColor: color }, glowStyle]} />
      <Animated.View style={[styles.iconWrapper, animStyle]}>
        <Text style={styles.icon}>{icon}</Text>
      </Animated.View>
      {/* Active underline beam */}
      {focused && (
        <View style={[styles.activeBeam, { backgroundColor: color, shadowColor: color }]} />
      )}
    </View>
  );
}

export default function TabLayout() {
  const { setDashboardActive, playTouchSound } = useAudio();

  useEffect(() => {
    setDashboardActive(true);
    return () => {
      setDashboardActive(false);
    };
  }, [setDashboardActive]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.dark.backgroundDeep,
          borderTopColor: Colors.dark.border,
          borderTopWidth: 1,
          height: Platform.OS === 'android' ? 72 : 92,
          paddingBottom: Platform.OS === 'android' ? 10 : 28,
          paddingTop: 10,
          elevation: 24,
          shadowColor: Colors.dark.accent,
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.15,
          shadowRadius: 16,
        },
        tabBarActiveTintColor: Colors.dark.accent,
        tabBarInactiveTintColor: Colors.dark.textDim,
        tabBarLabelStyle: {
          fontFamily: Fonts.display,
          fontSize: 10,
          fontWeight: '700',
          letterSpacing: 1,
          textTransform: 'uppercase',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        listeners={{
          tabPress: () => playTouchSound(),
        }}
        options={{
          title: 'Status',
          tabBarIcon: ({ focused }) => (
            <AnimatedTabBarIcon icon="⚔️" focused={focused} color={Colors.dark.accent} />
          ),
        }}
      />
      <Tabs.Screen
        name="quests"
        listeners={{
          tabPress: () => playTouchSound(),
        }}
        options={{
          title: 'Quests',
          tabBarIcon: ({ focused }) => (
            <AnimatedTabBarIcon icon="📜" focused={focused} color={Colors.dark.gold} />
          ),
        }}
      />
      <Tabs.Screen
        name="log"
        listeners={{
          tabPress: () => playTouchSound(),
        }}
        options={{
          title: 'Mana',
          tabBarIcon: ({ focused }) => (
            <AnimatedTabBarIcon icon="🍽️" focused={focused} color={Colors.dark.mana} />
          ),
        }}
      />
      <Tabs.Screen
        name="activity"
        listeners={{
          tabPress: () => playTouchSound(),
        }}
        options={{
          title: 'Train',
          tabBarIcon: ({ focused }) => (
            <AnimatedTabBarIcon icon="🏃" focused={focused} color={Colors.dark.cyan} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        listeners={{
          tabPress: () => playTouchSound(),
        }}
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => (
            <AnimatedTabBarIcon icon="👤" focused={focused} color={Colors.dark.danger} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconOuter: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 36,
    position: 'relative',
  },
  iconGlowRing: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    opacity: 0,
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
  },
  icon: {
    fontSize: 20,
  },
  activeBeam: {
    position: 'absolute',
    bottom: -6,
    width: 20,
    height: 3,
    borderRadius: 1.5,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
  },
});
