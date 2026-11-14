import { useTransactions } from '@/features/portfolio/hooks/useTransactions';

/**
 * Extrato completo de transações. A API já devolve a lista ordenada da mais
 * recente para a mais antiga, então a ordem é usada como veio.
 */
export function useTransactionHistory() {
  const query = useTransactions();

  return { ...query, transactions: query.data ?? [] };
}
