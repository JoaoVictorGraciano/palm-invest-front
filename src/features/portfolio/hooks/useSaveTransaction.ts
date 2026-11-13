import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { HttpError } from '@/services';
import { TRANSACTIONS_QUERY_KEY } from '@/features/portfolio/hooks/useTransactions';
import { createTransaction, updateTransaction } from '@/features/portfolio/services/transactions.api';
import { TRANSACTION_TYPE } from '@/features/portfolio/types';
import type { TransactionInput } from '@/features/portfolio/types';
import { formatCurrency } from '@/utils';

/** Erros da API que o formulário mostra junto aos campos, em vez de em um toast. */
export function isFormError(error: unknown): error is HttpError {
  return error instanceof HttpError && (error.status === 422 || error.status === 400);
}

interface SaveTransactionVariables {
  /** Presente quando é edição (PUT); ausente quando é criação (POST). */
  id?: string;
  input: TransactionInput;
}

/**
 * Cria ou edita uma transação na API e invalida a query de transações, o
 * que recalcula carteira, dashboard e histórico sem recarregar a página.
 */
export function useSaveTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: SaveTransactionVariables) =>
      id === undefined ? createTransaction(input) : updateTransaction(id, input),
    onSuccess: async (_transaction, { id, input }) => {
      await queryClient.invalidateQueries({ queryKey: TRANSACTIONS_QUERY_KEY });

      const kind = input.type === TRANSACTION_TYPE.SELL ? 'Venda' : 'Compra';
      toast.success(id === undefined ? `${kind} registrada` : 'Transação atualizada', {
        description: `${input.quantity} ${input.ticker.toUpperCase()} a ${formatCurrency(input.pricePaid)} por unidade.`,
      });
    },
    onError: (error) => {
      // 422 (saldo) e 400 (validação) são mostrados nos campos pelo formulário.
      if (isFormError(error)) return;

      toast.error('Não foi possível salvar a transação', {
        description: error instanceof Error ? error.message : 'Tente novamente em instantes.',
      });
    },
  });
}
