import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Rank } from '@/types';
import { RankColors, RankGlows, Fonts, Colors } from '@/constants/theme';

interface RankBadgeProps {
  rank: Rank;
  size?: 'small' | 'medium' | 'large';
}

export function RankBadge({ rank, size = 'medium' }: RankBadgeProps) {
  const color = RankColors[rank] || RankColors.E;
  const glow = RankGlows[rank] || RankGlows.E;

  const dimension = size === 'large' ? 72 : size === 'medium' ? 52 : 36;
  const fontSize = size === 'large' ? 32 : size === 'medium' ? 24 : 16;

  return (
    <View
      style={[
        styles.outerGlow,
        {
          width: dimension + 8,
          height: dimension + 8,
          shadowColor: color,
        },
      ]}
    >
      {/* Diamond/Shield shape container */}
      <View
        style={[
          styles.container,
          {
            width: dimension,
            height: dimension,
            borderColor: color,
            shadowColor: color,
          },
        ]}
      >
        {/* Inner gradient feel */}
        <View style={[styles.innerShine, { backgroundColor: glow }]} />

        <Text style={[styles.rankText, { color, fontSize }]}>{rank}</Text>
        <Text style={[styles.subText, { color }]}>RANK</Text>

        {/* Corner accents */}
        <View style={[styles.cornerAccent, styles.cornerTL, { borderColor: color }]} />
        <View style={[styles.cornerAccent, styles.cornerBR, { borderColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerGlow: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  container: {
    borderRadius: 12,
    borderWidth: 2,
    backgroundColor: Colors.dark.backgroundCard,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 6,
  },
  innerShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    opacity: 0.15,
  },
  rankText: {
    fontFamily: Fonts.display,
    fontWeight: '700',
    lineHeight: undefined,
  },
  subText: {
    fontSize: 8,
    fontFamily: Fonts.display,
    fontWeight: '700',
    marginTop: -2,
    opacity: 0.8,
    letterSpacing: 2,
  },
  cornerAccent: {
    position: 'absolute',
    width: 8,
    height: 8,
  },
  cornerTL: {
    top: 2,
    left: 2,
    borderTopWidth: 1.5,
    borderLeftWidth: 1.5,
  },
  cornerBR: {
    bottom: 2,
    right: 2,
    borderBottomWidth: 1.5,
    borderRightWidth: 1.5,
  },
});
