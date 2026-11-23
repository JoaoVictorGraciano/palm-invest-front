import { useMemo } from 'react';
import { useTransactions } from '@/features/portfolio/hooks/useTransactions';
import type { Transaction } from '@/features/portfolio/types';

/** Lucro realizado somado por ticker, com todas as vendas (inclusive de ativos já vendidos por inteiro). */
export function sumRealizedByTicker(transactions: Transaction[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const transaction of transactions) {
    if (transaction.realizedProfit === null) continue;
    totals.set(transaction.ticker, (totals.get(transaction.ticker) ?? 0) + transaction.realizedProfit);
  }
  return totals;
}

/** Lucro realizado por ticker, vindo de `lucroRealizado` das vendas na API. */
export function useRealizedProfitByTicker(): ReadonlyMap<string, number> | undefined {
  const { data } = useTransactions();
  return useMemo(() => (data ? sumRealizedByTicker(data) : undefined), [data]);
}
