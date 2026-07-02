import { useMemo } from 'react';
import { getHomeStats } from '@/features/home/services/home.service';
import type { HomeStats } from '@/features/home/types';

export function useHomeStats(): HomeStats[] {
  return useMemo(() => getHomeStats(), []);
}
