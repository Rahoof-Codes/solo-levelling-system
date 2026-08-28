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
          backgroundColor: '#070B14',
          borderTopColor: '#172744',
          borderTopWidth: 1,
          height: Platform.OS === 'android' ? 64 : 84,
          paddingBottom: Platform.OS === 'android' ? 8 : 24,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#00F0FF',
        tabBarInactiveTintColor: '#4B6282',
        tabBarLabelStyle: {
          fontFamily: Fonts.mono,
          fontSize: 10,
          fontWeight: '700',
          letterSpacing: 0.5,
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
          title: 'Hunter',
          tabBarIcon: ({ color }) => <Text style={[styles.icon, { color }]}>👤</Text>,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  icon: {
    fontSize: 18,
  },
});
