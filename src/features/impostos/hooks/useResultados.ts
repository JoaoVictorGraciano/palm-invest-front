import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getLimiteIsencao, getResultados } from '@/features/impostos/services/resultados.api';

/**
 * Raiz das queries de resultados. Como tudo é calculado das transações,
 * qualquer mudança em transações invalida esta chave também.
 */
export const RESULTADOS_QUERY_KEY = ['resultados'] as const;

export function useResultados(ano: number) {
  return useQuery({
    queryKey: [...RESULTADOS_QUERY_KEY, 'ano', ano],
    queryFn: () => getResultados(ano),
    placeholderData: keepPreviousData,
  });
}

/** Limite de isenção do mês `AAAA-MM`; não busca enquanto `mes` for `null`. */
export function useLimiteIsencao(mes: string | null, options: { silent?: boolean } = {}) {
  return useQuery({
    queryKey: [...RESULTADOS_QUERY_KEY, 'limite-isencao', mes],
    queryFn: () => getLimiteIsencao(mes!),
    enabled: mes !== null,
    meta: options.silent ? { silent: true } : undefined,
  });
}
