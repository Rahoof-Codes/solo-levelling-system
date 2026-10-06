import React, { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { Text, StyleSheet, Platform, View } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Colors, Fonts } from '@/constants/theme';
import { useAudio } from '@/contexts/AudioContext';

function AnimatedTabBarItem({
  iconSource,
  fallbackEmoji,
  label,
  focused,
}: {
  iconSource?: any;
  fallbackEmoji?: string;
  label: string;
  focused: boolean;
}) {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (focused) {
      scale.value = withSpring(1.12, { damping: 12, stiffness: 200 }, () => {
        scale.value = withSpring(1, { damping: 14 });
      });
    } else {
      scale.value = withSpring(1, { damping: 14 });
    }
  }, [focused]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.navItemContainer,
        focused && styles.navItemActive,
        animStyle,
      ]}
    >
      <View style={styles.iconWrapper}>
        {iconSource ? (
          <Image
            source={iconSource}
            style={[styles.iconImage, { tintColor: focused ? '#20C8FF' : '#697292' }]}
            contentFit="contain"
          />
        ) : (
          <Text style={styles.icon}>{fallbackEmoji}</Text>
        )}
      </View>
      <Text style={[styles.navLabel, focused ? styles.navLabelActive : styles.navLabelInactive]}>
        {label}
      </Text>
      {focused ? <View style={styles.activeMarkerDot} /> : <View style={styles.activeMarkerPlaceholder} />}
    </Animated.View>
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
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: 'rgba(9, 11, 24, 0.95)',
          borderTopColor: '#2A3154',
          borderTopWidth: 1,
          height: Platform.OS === 'android' ? 76 : 80,
          paddingBottom: Platform.OS === 'android' ? 6 : 10,
          paddingTop: 8,
          paddingHorizontal: 12,
          elevation: 24,
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.3,
          shadowRadius: 16,
        },
        tabBarItemStyle: {
          justifyContent: 'center',
          alignItems: 'center',
          padding: 0,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        listeners={{
          tabPress: () => playTouchSound(),
        }}
        options={{
          title: 'System',
          tabBarIcon: ({ focused }) => (
            <AnimatedTabBarItem
              iconSource={require('@/../public/layout-dashboard.svg')}
              fallbackEmoji="⚔️"
              label="System"
              focused={focused}
            />
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
            <AnimatedTabBarItem
              iconSource={require('@/../public/scroll-text.svg')}
              fallbackEmoji="📜"
              label="Quests"
              focused={focused}
            />
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
            <AnimatedTabBarItem
              iconSource={require('@/../public/zap.svg')}
              fallbackEmoji="🏃"
              label="Train"
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="meals"
        listeners={{
          tabPress: () => playTouchSound(),
        }}
        options={{
          title: 'Meals',
          tabBarIcon: ({ focused }) => (
            <AnimatedTabBarItem
              iconSource={require('@/../public/utensils.svg')}
              fallbackEmoji="🍽️"
              label="Meals"
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="log"
        listeners={{
          tabPress: () => playTouchSound(),
        }}
        options={{
          title: 'Stats',
          tabBarIcon: ({ focused }) => (
            <AnimatedTabBarItem
              iconSource={require('@/../public/bar-chart-3.svg')}
              fallbackEmoji="📊"
              label="Stats"
              focused={focused}
            />
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
            <AnimatedTabBarItem
              iconSource={require('@/../public/user-round.svg')}
              fallbackEmoji="👤"
              label="Profile"
              focused={focused}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  navItemContainer: {
    flex: 1,
    maxWidth: 60,
    height: 58,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 3,
  },
  navItemActive: {
    backgroundColor: 'rgba(108, 92, 255, 0.12)',
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 18,
    height: 18,
  },
  iconImage: {
    width: 18,
    height: 18,
  },
  icon: {
    fontSize: 16,
  },
  navLabel: {
    fontFamily: Fonts.sans,
    fontSize: 9,
    textAlign: 'center',
  },
  navLabelActive: {
    fontWeight: '800',
    color: '#F5F7FF',
  },
  navLabelInactive: {
    fontWeight: '600',
    color: '#697292',
  },
  activeMarkerDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#20C8FF',
    boxShadow: '0px 0px 8px 1px rgba(32, 200, 255, 0.8)',
    elevation: 4,
  },
  activeMarkerPlaceholder: {
    width: 4,
    height: 4,
  },
});
