import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Fonts, Spacing } from '@/constants/theme';

interface StatusWindowProps {
  title?: string;
  children: React.ReactNode;
}

export function StatusWindow({
  title = 'SYSTEM STATUS WINDOW',
  children,
}: StatusWindowProps) {
  return (
    <View style={styles.windowFrame}>
      {/* Top HUD Title Bar */}
      <View style={styles.titleBar}>
        <View style={styles.titleLeft}>
          <View style={styles.statusDot} />
          <Text style={styles.titleText}>{title}</Text>
        </View>
        <Text style={styles.systemTag}>SYS.VER 1.0.4</Text>
      </View>

      {/* Main Content Area */}
      <View style={styles.content}>{children}</View>

      {/* Bottom HUD Footer Accent */}
      <View style={styles.footerBar}>
        <View style={styles.footerLine} />
        <Text style={styles.footerText}>HUNTER ASSOCIATION SYNCED</Text>
        <View style={styles.footerLine} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  windowFrame: {
    backgroundColor: '#070B14',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#00A8FF',
    overflow: 'hidden',
    shadowColor: '#00A8FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 10,
  },
  titleBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 168, 255, 0.12)',
    paddingVertical: 10,
    paddingHorizontal: Spacing.three,
    borderBottomWidth: 1,
    borderBottomColor: '#00A8FF',
  },
  titleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00FF88',
    shadowColor: '#00FF88',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 3,
  },
  titleText: {
    fontSize: 13,
    fontWeight: '900',
    fontFamily: Fonts.mono,
    color: '#00F0FF',
    letterSpacing: 2,
  },
  systemTag: {
    fontSize: 9,
    fontFamily: Fonts.mono,
    color: '#496A94',
    letterSpacing: 1,
  },
  content: {
    padding: Spacing.two,
    gap: Spacing.two,
  },
  footerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: Spacing.three,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#12233E',
  },
  footerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#162C4E',
  },
  footerText: {
    fontSize: 8,
    fontFamily: Fonts.mono,
    color: '#3B577D',
    letterSpacing: 1,
  },
});
