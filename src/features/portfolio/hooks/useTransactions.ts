import { useQuery } from '@tanstack/react-query';
import { listTransactions } from '@/features/portfolio/services/transactions.api';

export const TRANSACTIONS_QUERY_KEY = ['transactions'] as const;

/**
 * Transações do usuário vindas da API. É a única fonte de dados da carteira:
 * dashboard, carteira e histórico derivam tudo desta mesma query.
 */
export function useTransactions() {
  return useQuery({
    queryKey: TRANSACTIONS_QUERY_KEY,
    queryFn: listTransactions,
  });
}
