import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { addTransaction } from '@/features/portfolio/services/transactions.repository';
import type { NewTransactionInput } from '@/features/portfolio/types';
import { formatCurrency } from '@/utils';

/**
 * Registra um novo aporte (persistido no localStorage) e invalida a query
 * `['portfolio']`, forçando o `usePortfolio` a recalcular as posições e
 * buscar cotações atualizadas — inclusive para um ticker novo que ainda não
 * estava na carteira.
 */
export function useAddTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: NewTransactionInput) => addTransaction(input),
    onSuccess: async (transaction) => {
      await queryClient.invalidateQueries({ queryKey: ['portfolio'] });
      toast.success('Aporte registrado', {
        description: `${transaction.quantity} ${transaction.ticker} a ${formatCurrency(transaction.pricePaid)} por unidade.`,
      });
    },
    onError: () => {
      toast.error('Não foi possível registrar o aporte', {
        description: 'Tente novamente em instantes.',
      });
    },
  });
}
