import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { deleteAssetTransactions } from '@/features/portfolio/services/transactions.repository';

/**
 * Remove definitivamente um ativo da carteira (todas as suas transações) e
 * invalida as queries `['portfolio']` e `['transactions']` para que o
 * Dashboard, a tabela e o extrato reflitam a remoção imediatamente.
 */
export function useDeleteAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ticker: string) => {
      deleteAssetTransactions(ticker);
      return ticker;
    },
    onSuccess: async (ticker) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['portfolio'] }),
        queryClient.invalidateQueries({ queryKey: ['transactions'] }),
      ]);
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
