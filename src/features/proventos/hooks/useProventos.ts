import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getProventosResumo, listProventos } from '@/features/proventos/services/proventos.api';

/** Raiz de todas as queries de proventos: invalidar esta chave atualiza lista, resumo e carteira. */
export const PROVENTOS_QUERY_KEY = ['proventos'] as const;

/** Proventos pagos no ano, do mais recente para o mais antigo. Sem `ano`, todos. */
export function useProventos(ano?: number) {
  return useQuery({
    queryKey: [...PROVENTOS_QUERY_KEY, 'list', ano ?? 'todos'],
    queryFn: () => listProventos({ ano }),
    placeholderData: keepPreviousData,
  });
}

/** Totais líquidos do ano (por mês, por ativo e por tipo). */
export function useProventosResumo(ano: number) {
  return useQuery({
    queryKey: [...PROVENTOS_QUERY_KEY, 'resumo', ano],
    queryFn: () => getProventosResumo(ano),
    placeholderData: keepPreviousData,
  });
}
