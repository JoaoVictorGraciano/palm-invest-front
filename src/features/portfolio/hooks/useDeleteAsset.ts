import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { TRANSACTIONS_QUERY_KEY } from '@/features/portfolio/hooks/useTransactions';
import { deleteAssetTransactions, PartialAssetDeletionError } from '@/features/portfolio/services/asset-deletion';

/**
 * Remove definitivamente um ativo da carteira (todas as suas transações na
 * API) e invalida a query de transações para que o Dashboard, a tabela e o
 * extrato reflitam a remoção — inclusive quando ela foi apenas parcial.
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
    onError: (error) => {
      if (error instanceof PartialAssetDeletionError) {
        toast.error('O ativo foi removido apenas em parte', {
          description: `${error.deleted} de ${error.total} transações de ${error.ticker} foram excluídas. Tente remover novamente.`,
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
