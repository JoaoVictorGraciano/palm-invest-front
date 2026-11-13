import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { HttpError } from '@/services';
import { TRANSACTIONS_QUERY_KEY } from '@/features/portfolio/hooks/useTransactions';
import { deleteAssetTransactions } from '@/features/portfolio/services/transactions.api';

/**
 * Remove definitivamente um ativo da carteira (todas as suas transações, em
 * uma única chamada à API) e invalida a query de transações para que o
 * Dashboard, a tabela e o extrato reflitam a remoção.
 */
export function useDeleteAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ticker: string) => deleteAssetTransactions(ticker),
    onSuccess: ({ ticker }) => {
      toast.success('Ativo removido', {
        description: `${ticker} foi removido da carteira.`,
      });
    },
    onError: (error, ticker) => {
      // 404: o ativo já não tinha transações (ex: removido em outra aba).
      if (error instanceof HttpError && error.status === 404) {
        toast.info('Ativo já removido', {
          description: `${ticker.toUpperCase()} não tinha mais transações na carteira.`,
        });
        return;
      }

      toast.error('Não foi possível remover o ativo', {
        description: error instanceof Error ? error.message : 'Tente novamente em instantes.',
      });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: TRANSACTIONS_QUERY_KEY }),
  });
}
