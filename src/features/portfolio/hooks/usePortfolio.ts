import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getPortfolio } from '@/features/portfolio/services/portfolio.service';
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
 * Busca a carteira com cotações reais via React Query.
 *
 * A query nunca "falha" por causa de uma cotação individual indisponível —
 * `getPortfolio()` já aplica fallback por ativo. Falhas parciais são
 * reportadas via `failures` e notificadas aqui com um toast (deduplicado
 * para não reaparecer a cada refetch com o mesmo resultado). Falhas
 * catastróficas (ex: exceção não tratada) seguem o fluxo normal de erro do
 * React Query e são cobertas pelo `onError` global do `queryClient`.
 */
export function usePortfolio() {
  const query = useQuery({
    queryKey: ['portfolio'],
    queryFn: getPortfolio,
    refetchInterval: REFRESH_INTERVAL_MS,
  });

  const lastNotifiedSignatureRef = useRef<string>('');

  useEffect(() => {
    const failures = query.data?.failures ?? [];
    if (failures.length === 0) return;

    const signature = failures.map((failure) => `${failure.provider}:${failure.ticker ?? ''}`).join('|');
    if (signature === lastNotifiedSignatureRef.current) return;

    lastNotifiedSignatureRef.current = signature;
    notifyFailures(failures);
  }, [query.data]);

  return {
    portfolio: query.data?.portfolio,
    isLoading: query.isPending,
    isError: query.isError,
    isFetching: query.isFetching,
    refetch: query.refetch,
  };
}
