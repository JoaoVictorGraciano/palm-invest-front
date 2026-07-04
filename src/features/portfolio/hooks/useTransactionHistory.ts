import { useQuery } from '@tanstack/react-query';
import { getTransactions } from '@/features/portfolio/services/transactions.repository';

/**
 * Lê o extrato completo de transações (compras e vendas) do localStorage,
 * ordenado da mais recente para a mais antiga. A query key `['transactions']`
 * é invalidada por `useAddTransaction`/`useDeleteAsset`, mantendo o extrato
 * sempre em sincronia com a carteira.
 */
export function useTransactionHistory() {
  const query = useQuery({
    queryKey: ['transactions'],
    queryFn: async () => getTransactions(),
  });

  const transactions = [...(query.data ?? [])].sort((a, b) => b.purchasedAt.localeCompare(a.purchasedAt));

  return { ...query, transactions };
}
