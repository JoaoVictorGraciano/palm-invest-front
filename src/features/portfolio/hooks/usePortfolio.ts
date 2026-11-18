import { useCallback, useEffect, useMemo, useRef } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTransactions } from '@/features/portfolio/hooks/useTransactions';
import { getHoldingsFromTransactions } from '@/features/portfolio/services/holdings';
import { buildPortfolio, getQuotesForHoldings } from '@/features/portfolio/services/portfolio.service';
import type { HoldingQuotes } from '@/features/portfolio/services/portfolio.service';

/** Cotações são atualizadas a cada minuto enquanto a tela estiver aberta. */
const REFRESH_INTERVAL_MS = 60_000;

/** Identifica um resultado de cotações, para não repetir o mesmo aviso a cada atualização. */
function failureSignature({ failures, unavailable }: HoldingQuotes): string {
  if (unavailable) return 'indisponivel';
  return failures.map((failure) => failure.ticker).sort().join(',');
}

function notifyFailures({ failures, unavailable }: HoldingQuotes) {
  if (unavailable) {
    toast.error('Cotações indisponíveis no momento', {
      description: 'Exibindo o custo médio como preço atual. Tentaremos de novo em instantes.',
    });
    return;
  }

  const affectedTickers = failures.map((failure) => failure.ticker).join(', ');
  toast.error('Algumas cotações não puderam ser atualizadas', {
    description: `Usando o custo médio como preço atual de: ${affectedTickers}.`,
  });
}

/**
 * Monta a carteira a partir das transações (`useTransactions`) e das
 * cotações, ambas vindas da palm-invest-api.
 *
 * - Se as transações não puderem ser carregadas, `isError` fica `true` e
 *   não existe carteira: a tela mostra o erro em vez de uma carteira vazia.
 * - Cotações nunca derrubam a carteira: um ativo sem cotação (ou todos,
 *   quando a API responde 503) usa o custo médio como preço atual e a falha
 *   é notificada com um toast (deduplicado para não reaparecer a cada
 *   refetch com o mesmo resultado).
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
    const result = quotesQuery.data;
    if (!result) return;

    const signature = failureSignature(result);
    // Tudo cotado: libera um novo aviso se as falhas voltarem depois.
    if (signature === '') {
      lastNotifiedSignatureRef.current = '';
      return;
    }
    if (signature === lastNotifiedSignatureRef.current) return;

    lastNotifiedSignatureRef.current = signature;
    notifyFailures(result);
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
