import { QueryCache, QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { HttpError } from '@/services';

/** 401/403 não melhoram com nova tentativa: a sessão precisa ser refeita. */
function isAuthError(error: unknown): boolean {
  return error instanceof HttpError && (error.status === 401 || error.status === 403);
}

/**
 * Instância única do QueryClient da aplicação.
 *
 * `QueryCache.onError` funciona como uma rede de segurança global: cobre
 * falhas inesperadas de qualquer query (ex: exceção não tratada). Falhas
 * esperadas e parciais (ex: uma cotação específica indisponível) são
 * tratadas localmente em cada hook, que pode agregar/formatar a mensagem
 * com mais contexto antes de notificar o usuário. Um 401 não gera toast
 * aqui: o cliente HTTP encerra a sessão e a tela de login avisa o usuário.
 */
export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      if (error instanceof HttpError && error.status === 401) return;
      // Queries acessórias (ex: nome do usuário) falham em silêncio.
      if (query.meta?.silent) return;

      const message = error instanceof Error ? error.message : 'Erro desconhecido.';
      toast.error('Não foi possível carregar os dados', { description: message });
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      retry: (failureCount, error) => !isAuthError(error) && failureCount < 1,
      refetchOnWindowFocus: false,
    },
  },
});
