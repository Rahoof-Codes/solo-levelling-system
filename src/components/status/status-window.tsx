import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Fonts, Spacing } from '@/constants/theme';

interface StatusWindowProps {
  title?: string;
  children: React.ReactNode;
}

export function StatusWindow({
  title = 'Your Status',
  children,
}: StatusWindowProps) {
  return (
    <View style={styles.windowFrame}>
      {/* Title Bar */}
      <View style={styles.titleBar}>
        <View style={styles.titleLeft}>
          <View style={styles.statusDot} />
          <Text style={styles.titleText}>{title}</Text>
        </View>
        <Text style={styles.systemTag}>Active</Text>
      </View>

      {/* Main Content Area */}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  windowFrame: {
    backgroundColor: '#111827',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  titleBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 168, 255, 0.06)',
    paddingVertical: 12,
    paddingHorizontal: Spacing.threeHalf,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  titleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00FF88',
    shadowColor: '#00FF88',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 3,
  },
  titleText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: Fonts.sans,
    color: '#E8ECF4',
    letterSpacing: 0.3,
  },
  systemTag: {
    fontSize: 11,
    fontFamily: Fonts.mono,
    color: '#4B6282',
    letterSpacing: 0.5,
  },
  content: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
});
