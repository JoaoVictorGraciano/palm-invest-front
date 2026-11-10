import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { TRANSACTIONS_QUERY_KEY } from '@/features/portfolio/hooks/useTransactions';
import { deleteTransaction } from '@/features/portfolio/services/transactions.api';

/** Exclui uma transação na API e atualiza carteira, dashboard e histórico. */
export function useDeleteTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteTransaction(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: TRANSACTIONS_QUERY_KEY });
      toast.success('Transação excluída');
    },
    onError: (error) => {
      toast.error('Não foi possível excluir a transação', {
        description: error instanceof Error ? error.message : 'Tente novamente em instantes.',
      });
    },
  });
}
