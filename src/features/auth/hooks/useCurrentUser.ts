import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/auth-context';
import { getCurrentUser } from '@/features/auth/services/auth.service';

export const CURRENT_USER_QUERY_KEY = ['auth', 'me'] as const;

/**
 * Usuário dono da sessão (`GET /auth/me`). Só consulta com sessão ativa; o
 * cache é limpo pelo `AuthProvider` a cada login e logout, então nunca
 * mostra o nome de outra conta.
 */
export function useCurrentUser() {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: CURRENT_USER_QUERY_KEY,
    queryFn: getCurrentUser,
    enabled: isAuthenticated,
    staleTime: Infinity,
    // Sem o nome o app segue funcionando: não vale um toast de erro.
    meta: { silent: true },
  });
}
