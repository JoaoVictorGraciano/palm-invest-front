import { useEffect, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { searchAssets } from '@/features/portfolio/services/asset-search.api';
import type { AssetClass } from '@/types';

/** Mínimo de caracteres para consultar os provedores. */
export const MIN_SEARCH_LENGTH = 2;

const DEBOUNCE_MS = 300;

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

/**
 * Sugestões de ativos para o texto digitado, buscadas na palm-invest-api
 * (que consulta a Brapi e a CoinGecko); com `assetClass`, só daquela
 * classe. Espera o
 * usuário parar de digitar e guarda os resultados em cache, para não gastar
 * a cota pública dos provedores a cada tecla.
 */
export function useAssetSearch(text: string, assetClass?: AssetClass) {
  const term = text.trim().toUpperCase();
  const debouncedTerm = useDebouncedValue(term, DEBOUNCE_MS);
  const enabled = debouncedTerm.length >= MIN_SEARCH_LENGTH;

  const query = useQuery({
    queryKey: ['asset-search', assetClass ?? 'ALL', debouncedTerm],
    queryFn: ({ signal }) => searchAssets(debouncedTerm, signal, assetClass),
    enabled,
    staleTime: 5 * 60_000,
    retry: false,
    placeholderData: keepPreviousData,
    // Falhas da busca aparecem na própria lista de sugestões, sem toast.
    meta: { silent: true },
  });

  return {
    suggestions: enabled ? (query.data?.suggestions ?? []) : [],
    failedProviders: enabled ? (query.data?.failedProviders ?? []) : [],
    /** `true` enquanto a busca do texto atual ainda não terminou (inclui a espera da digitação). */
    isSearching: term.length >= MIN_SEARCH_LENGTH && (term !== debouncedTerm || query.isFetching),
  };
}
