import { QueryCache, QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

/**
 * Instância única do QueryClient da aplicação.
 *
 * `QueryCache.onError` funciona como uma rede de segurança global: cobre
 * falhas inesperadas de qualquer query (ex: exceção não tratada). Falhas
 * esperadas e parciais (ex: uma cotação específica indisponível) são
 * tratadas localmente em cada hook, que pode agregar/formatar a mensagem
 * com mais contexto antes de notificar o usuário.
 */
export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Erro desconhecido.';
      toast.error('Não foi possível carregar os dados', { description: message });
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
