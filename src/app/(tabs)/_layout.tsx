import React from 'react';
import { Tabs } from 'expo-router';
import { Text, StyleSheet, Platform } from 'react-native';
import { Colors, Fonts } from '@/constants/theme';

export default function TabLayout() {
  const theme = Colors.dark;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0B1120',
          borderTopColor: 'transparent',
          borderTopWidth: 0,
          height: Platform.OS === 'android' ? 68 : 88,
          paddingBottom: Platform.OS === 'android' ? 10 : 26,
          paddingTop: 10,
          elevation: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.3,
          shadowRadius: 12,
        },
        tabBarActiveTintColor: '#00A8FF',
        tabBarInactiveTintColor: '#4B6282',
        tabBarLabelStyle: {
          fontFamily: Fonts.sans,
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 0.2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Status',
          tabBarIcon: ({ color }) => <Text style={[styles.icon, { color }]}>⚔️</Text>,
        }}
      />
      <Tabs.Screen
        name="quests"
        options={{
          title: 'Quests',
          tabBarIcon: ({ color }) => <Text style={[styles.icon, { color }]}>📜</Text>,
        }}
      />
      <Tabs.Screen
        name="log"
        options={{
          title: 'Meals',
          tabBarIcon: ({ color }) => <Text style={[styles.icon, { color }]}>🍽️</Text>,
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: 'Training',
          tabBarIcon: ({ color }) => <Text style={[styles.icon, { color }]}>🏃</Text>,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <Text style={[styles.icon, { color }]}>👤</Text>,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  icon: {
    fontSize: 20,
  },
});
