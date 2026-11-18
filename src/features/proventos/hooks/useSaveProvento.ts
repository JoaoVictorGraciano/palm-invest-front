import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { HttpError } from '@/services';
import { PROVENTOS_QUERY_KEY } from '@/features/proventos/hooks/useProventos';
import { createProvento, updateProvento } from '@/features/proventos/services/proventos.api';
import type { ProventoInput } from '@/features/proventos/types';
import { TIPO_PROVENTO_LABEL } from '@/features/proventos/utils/proventos';
import { formatCurrency } from '@/utils';

/** Erros que o formulário mostra nele mesmo: 400 nos campos, 422 com a mensagem da API. */
export function isProventoFormError(error: unknown): error is HttpError {
  return error instanceof HttpError && (error.status === 400 || error.status === 422);
}

interface SaveProventoVariables {
  /** Presente na edição (PUT); ausente no registro (POST). */
  id?: string;
  input: ProventoInput;
}

/** Registra ou edita um provento e atualiza lista, resumo, carteira e dashboard. */
export function useSaveProvento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: SaveProventoVariables) =>
      id === undefined ? createProvento(input) : updateProvento(id, input),
    onSuccess: async (provento, { id }) => {
      await queryClient.invalidateQueries({ queryKey: PROVENTOS_QUERY_KEY });
      toast.success(id === undefined ? 'Provento registrado' : 'Provento atualizado', {
        description: `${TIPO_PROVENTO_LABEL[provento.tipo]} de ${provento.ticker}: líquido de ${formatCurrency(provento.valorLiquido)}.`,
      });
    },
    onError: (error) => {
      if (isProventoFormError(error)) return;
      toast.error('Não foi possível salvar o provento', {
        description: error instanceof Error ? error.message : 'Tente novamente em instantes.',
      });
    },
  });
}
