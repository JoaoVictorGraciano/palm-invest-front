import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { addTransaction, InsufficientQuantityError } from '@/features/portfolio/services/transactions.repository';
import { TRANSACTION_TYPE } from '@/features/portfolio/types';
import type { NewTransactionInput } from '@/features/portfolio/types';
import { formatCurrency } from '@/utils';

/**
 * Registra uma nova transação (compra ou venda, persistida no localStorage)
 * e invalida a query `['portfolio']`, forçando o `usePortfolio` a
 * recalcular as posições e buscar cotações atualizadas — inclusive para um
 * ticker novo que ainda não estava na carteira.
 */
export function useAddTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: NewTransactionInput) => addTransaction(input),
    onSuccess: async (transaction) => {
      await queryClient.invalidateQueries({ queryKey: ['portfolio'] });
      const action = transaction.type === TRANSACTION_TYPE.SELL ? 'Venda registrada' : 'Compra registrada';
      toast.success(action, {
        description: `${transaction.quantity} ${transaction.ticker} a ${formatCurrency(transaction.pricePaid)} por unidade.`,
      });
    },
    onError: (error) => {
      console.error('[useAddTransaction] onError fired', error);
      if (error instanceof InsufficientQuantityError) {
        toast.error('Quantidade insuficiente para venda', {
          description:
            error.available > 0
              ? `Você possui apenas ${error.available} unidade(s) de ${error.ticker}.`
              : `Você não possui ${error.ticker} na carteira.`,
        });
        return;
      }

      toast.error('Não foi possível registrar a transação', {
        description: 'Tente novamente em instantes.',
      });
    },
  });
}
