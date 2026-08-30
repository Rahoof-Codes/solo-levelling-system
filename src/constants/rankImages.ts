import { Rank } from '@/types';

export const RANK_IMAGES: Record<Rank, any> = {
  [Rank.E]: require('../../assets/images/ranks/rank-e.jpg'),
  [Rank.D]: require('../../assets/images/ranks/rank-d.png'),
  [Rank.C]: require('../../assets/images/ranks/rank-c.png'),
  [Rank.B]: require('../../assets/images/ranks/rank-b.png'),
  [Rank.A]: require('../../assets/images/ranks/rank-a.png'),
  [Rank.S]: require('../../assets/images/ranks/rank-s.jpeg'),
};

export function getRankImage(rank?: Rank | string | null) {
  if (!rank) return RANK_IMAGES[Rank.E];
  return RANK_IMAGES[rank as Rank] || RANK_IMAGES[Rank.E];
}
