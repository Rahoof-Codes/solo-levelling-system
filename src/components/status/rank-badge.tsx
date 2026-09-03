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
  const fontSize = size === 'large' ? 30 : size === 'medium' ? 22 : 15;

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
      <Text style={[styles.subText, { color }]}>Rank</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 10,
    borderWidth: 1.5,
    backgroundColor: '#111827',
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  rankText: {
    fontFamily: Fonts.mono,
    fontWeight: '900',
    lineHeight: undefined,
  },
  subText: {
    fontSize: 8,
    fontFamily: Fonts.sans,
    fontWeight: '700',
    marginTop: -2,
    opacity: 0.9,
  },
});
