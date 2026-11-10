import { useCallback, useEffect, useMemo, useRef } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTransactions } from '@/features/portfolio/hooks/useTransactions';
import { getHoldingsFromTransactions } from '@/features/portfolio/services/holdings';
import { buildPortfolio, getQuotesForHoldings } from '@/features/portfolio/services/portfolio.service';
import type { QuoteProviderError } from '@/services';

/** Cotações são atualizadas a cada minuto enquanto a tela estiver aberta. */
const REFRESH_INTERVAL_MS = 60_000;

function notifyFailures(failures: QuoteProviderError[]) {
  const affectedTickers = failures.map((failure) => failure.ticker).filter(Boolean).join(', ');

  toast.error('Algumas cotações não puderam ser atualizadas', {
    description: affectedTickers
      ? `Exibindo o último valor conhecido para: ${affectedTickers}.`
      : 'Exibindo os últimos valores conhecidos.',
  });
}

/**
 * Monta a carteira a partir das transações da API (`useTransactions`) e das
 * cotações dos provedores externos.
 *
 * - Se as transações não puderem ser carregadas, `isError` fica `true` e
 *   não existe carteira: a tela mostra o erro em vez de uma carteira vazia.
 * - Cotações nunca derrubam a carteira: um ativo sem cotação usa o custo
 *   médio como preço atual e a falha é notificada com um toast
 *   (deduplicado para não reaparecer a cada refetch com o mesmo resultado).
 */
export function usePortfolio() {
  const transactionsQuery = useTransactions();

  const holdings = useMemo(
    () => getHoldingsFromTransactions(transactionsQuery.data ?? []),
    [transactionsQuery.data],
  );

  const holdingsKey = useMemo(
    () => holdings.map((holding) => `${holding.assetClass}:${holding.ticker}`).sort().join(','),
    [holdings],
  );

  const quotesQuery = useQuery({
    queryKey: ['quotes', holdingsKey],
    queryFn: () => getQuotesForHoldings(holdings),
    enabled: transactionsQuery.isSuccess && holdings.length > 0,
    refetchInterval: REFRESH_INTERVAL_MS,
    placeholderData: keepPreviousData,
  });

  const quotesSettled = holdings.length === 0 || quotesQuery.data !== undefined || quotesQuery.isError;

  const portfolio = useMemo(() => {
    if (!transactionsQuery.isSuccess || !quotesSettled) return undefined;

    const updatedAtMs = quotesQuery.dataUpdatedAt || transactionsQuery.dataUpdatedAt || Date.now();
    return buildPortfolio(holdings, quotesQuery.data?.quotes ?? [], new Date(updatedAtMs).toISOString());
  }, [
    transactionsQuery.isSuccess,
    transactionsQuery.dataUpdatedAt,
    quotesSettled,
    quotesQuery.data,
    quotesQuery.dataUpdatedAt,
    holdings,
  ]);

  const lastNotifiedSignatureRef = useRef<string>('');

  useEffect(() => {
    const failures = quotesQuery.data?.failures ?? [];
    if (failures.length === 0) return;

    const signature = failures.map((failure) => `${failure.provider}:${failure.ticker ?? ''}`).join('|');
    if (signature === lastNotifiedSignatureRef.current) return;

    lastNotifiedSignatureRef.current = signature;
    notifyFailures(failures);
  }, [quotesQuery.data]);

  const { refetch: refetchTransactions } = transactionsQuery;
  const { refetch: refetchQuotes } = quotesQuery;
  const refetch = useCallback(async () => {
    const result = await refetchTransactions();
    if (result.isSuccess) await refetchQuotes();
  }, [refetchTransactions, refetchQuotes]);

  return {
    portfolio,
    isLoading: !transactionsQuery.isError && portfolio === undefined,
    isError: transactionsQuery.isError,
    isFetching: transactionsQuery.isFetching || quotesQuery.isFetching,
    refetch,
  };
}
