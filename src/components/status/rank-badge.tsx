import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Rank } from '@/types';
import { RankColors, Fonts } from '@/constants/theme';

interface RankBadgeProps {
  rank: Rank;
  size?: 'small' | 'medium' | 'large';
}

export function RankBadge({ rank, size = 'medium' }: RankBadgeProps) {
  const color = RankColors[rank] || RankColors.E;

  const dimension = size === 'large' ? 68 : size === 'medium' ? 48 : 34;
  const fontSize = size === 'large' ? 32 : size === 'medium' ? 24 : 16;

  return (
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
      <Text style={[styles.rankText, { color, fontSize }]}>{rank}</Text>
      <Text style={[styles.subText, { color }]}>RANK</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    borderWidth: 2,
    backgroundColor: 'rgba(7, 11, 20, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 8,
  },
  rankText: {
    fontFamily: Fonts.mono,
    fontWeight: '900',
    lineHeight: undefined,
  },
  subText: {
    fontSize: 7,
    fontFamily: Fonts.mono,
    letterSpacing: 1,
    marginTop: -2,
    opacity: 0.8,
  },
});
