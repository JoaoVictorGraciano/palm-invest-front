import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { deleteAssetTransactions } from '@/features/portfolio/services/transactions.repository';

/**
 * Remove definitivamente um ativo da carteira (todas as suas transações) e
 * invalida a query `['portfolio']` para que o Dashboard e a tabela reflitam
 * a remoção imediatamente.
 */
export function useDeleteAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ticker: string) => {
      deleteAssetTransactions(ticker);
      return ticker;
    },
    onSuccess: async (ticker) => {
      await queryClient.invalidateQueries({ queryKey: ['portfolio'] });
      toast.success('Ativo removido', {
        description: `${ticker} foi removido da carteira.`,
      });
    },
    onError: () => {
      toast.error('Não foi possível remover o ativo', {
        description: 'Tente novamente em instantes.',
      });
    },
  });
}
