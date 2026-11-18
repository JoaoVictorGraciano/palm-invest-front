import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { HttpError } from '@/services';
import { PROVENTOS_QUERY_KEY } from '@/features/proventos/hooks/useProventos';
import { deleteProvento } from '@/features/proventos/services/proventos.api';
import type { Provento } from '@/features/proventos/types';
import { TIPO_PROVENTO_LABEL } from '@/features/proventos/utils/proventos';

/** Exclui um provento e atualiza lista, resumo, carteira e dashboard. */
export function useDeleteProvento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (provento: Provento) => deleteProvento(provento.id),
    onSuccess: (_result, provento) => {
      toast.success('Provento excluído', {
        description: `${TIPO_PROVENTO_LABEL[provento.tipo]} de ${provento.ticker}.`,
      });
    },
    onError: (error) => {
      // 404: já tinha sido excluído (ex: em outra aba); a lista é recarregada abaixo.
      if (error instanceof HttpError && error.status === 404) {
        toast.info('Provento já excluído');
        return;
      }
      toast.error('Não foi possível excluir o provento', {
        description: error instanceof Error ? error.message : 'Tente novamente em instantes.',
      });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: PROVENTOS_QUERY_KEY }),
  });
}
