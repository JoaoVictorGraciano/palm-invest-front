import { useCallback, useState } from 'react';
import { readStorage, writeStorage } from '@/lib/storage';
import type { AssetFilter } from '@/features/portfolio/types';
import { ASSET_CLASS } from '@/types';

const STORAGE_KEY = 'palm-invest:transaction-form-asset-filter';

const VALID_FILTERS = new Set<string>(['ALL', ...Object.values(ASSET_CLASS)]);

function readFilter(): AssetFilter {
  const stored = readStorage<unknown>(STORAGE_KEY, 'ALL');
  return typeof stored === 'string' && VALID_FILTERS.has(stored) ? (stored as AssetFilter) : 'ALL';
}

/**
 * Filtro de classe do formulário de transação. Começa em "Todos" e lembra,
 * neste navegador, a última classe escolhida. É só uma preferência de
 * busca: a classe gravada na transação vem do ativo escolhido.
 */
export function useRememberedAssetFilter(): [AssetFilter, (filter: AssetFilter) => void] {
  const [filter, setFilter] = useState<AssetFilter>(readFilter);

  const change = useCallback((next: AssetFilter) => {
    writeStorage(STORAGE_KEY, next);
    setFilter(next);
  }, []);

  return [filter, change];
}
