import { useMemo } from 'react';
import { useTransactions } from '@/features/portfolio/hooks/useTransactions';

/** Extrato completo de transações da API, da mais recente para a mais antiga. */
export function useTransactionHistory() {
  const query = useTransactions();

  const transactions = useMemo(
    () => [...(query.data ?? [])].sort((a, b) => b.purchasedAt.localeCompare(a.purchasedAt)),
    [query.data],
  );

  return { ...query, transactions };
}
