import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { HttpError } from '@/services';
import { TRANSACTIONS_QUERY_KEY } from '@/features/portfolio/hooks/useTransactions';
import { deleteAssetTransactions } from '@/features/portfolio/services/transactions.api';
import type { AssetDeletionResult } from '@/features/portfolio/services/transactions.api';
import { PROVENTOS_QUERY_KEY } from '@/features/proventos/hooks/useProventos';

/** Ex: "PETR4 removido, junto com 2 proventos." */
export function describeAssetDeletion({ ticker, deletedProventos }: AssetDeletionResult): string {
  if (deletedProventos === 0) return `${ticker} foi removido da carteira.`;
  return `${ticker} removido, junto com ${deletedProventos} ${deletedProventos === 1 ? 'provento' : 'proventos'}.`;
}

/**
 * Remove definitivamente um ativo da carteira (todas as suas transações e
 * todos os seus proventos, em uma única chamada à API) e invalida as queries
 * de transações e de proventos para que Dashboard, Carteira, Proventos e
 * extrato reflitam a remoção.
 */
export function useDeleteAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ticker: string) => deleteAssetTransactions(ticker),
    onSuccess: (result) => {
      toast.success('Ativo removido', { description: describeAssetDeletion(result) });
    },
    onError: (error, ticker) => {
      // 404: o ativo já não tinha transações nem proventos (ex: removido em outra aba).
      if (error instanceof HttpError && error.status === 404) {
        toast.info('Ativo já removido', {
          description: `${ticker.toUpperCase()} não tinha mais transações nem proventos na carteira.`,
        });
        return;
      }

      toast.error('Não foi possível remover o ativo', {
        description: error instanceof Error ? error.message : 'Tente novamente em instantes.',
      });
    },
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: TRANSACTIONS_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: PROVENTOS_QUERY_KEY }),
      ]),
  });
}
