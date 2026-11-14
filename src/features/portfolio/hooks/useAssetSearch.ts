import { useEffect, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { searchAssets } from '@/services';

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
 * Sugestões de ativos (Brapi + CoinGecko) para o texto digitado. Espera o
 * usuário parar de digitar e guarda os resultados em cache, para não gastar
 * a cota pública dos provedores a cada tecla.
 */
export function useAssetSearch(text: string) {
  const term = text.trim().toUpperCase();
  const debouncedTerm = useDebouncedValue(term, DEBOUNCE_MS);
  const enabled = debouncedTerm.length >= MIN_SEARCH_LENGTH;

  const query = useQuery({
    queryKey: ['asset-search', debouncedTerm],
    queryFn: ({ signal }) => searchAssets(debouncedTerm, signal),
    enabled,
    staleTime: 5 * 60_000,
    retry: false,
    placeholderData: keepPreviousData,
  });

  return {
    suggestions: enabled ? (query.data?.suggestions ?? []) : [],
    failedProviders: enabled ? (query.data?.failedProviders ?? []) : [],
    /** `true` enquanto a busca do texto atual ainda não terminou (inclui a espera da digitação). */
    isSearching: term.length >= MIN_SEARCH_LENGTH && (term !== debouncedTerm || query.isFetching),
  };
}
