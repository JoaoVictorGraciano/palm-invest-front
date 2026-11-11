import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { queryClient } from '@/lib/query-client';
import { tokenStorage } from '@/lib/token-storage';
import { setUnauthorizedHandler } from '@/services';
import { AuthContext } from '@/features/auth/auth-context';
import type { AuthContextValue } from '@/features/auth/auth-context';
import * as authService from '@/features/auth/services/auth.service';
import type { LoginCredentials } from '@/features/auth/types';

/**
 * Dono da sessão: guarda o token (via `tokenStorage`), expõe login/logout e
 * encerra a sessão quando a API responde 401. Ao trocar de sessão o cache do
 * React Query é limpo para que dados de um usuário nunca apareçam para outro.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => tokenStorage.get());
  const [sessionExpired, setSessionExpired] = useState(false);

  const endSession = useCallback((expired: boolean) => {
    tokenStorage.clear();
    queryClient.clear();
    setToken(null);
    setSessionExpired(expired);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => endSession(true));
    return () => setUnauthorizedHandler(() => {});
  }, [endSession]);

  const login = useCallback(async (credentials: LoginCredentials) => {
    const newToken = await authService.login(credentials);
    queryClient.clear();
    tokenStorage.set(newToken);
    setToken(newToken);
    setSessionExpired(false);
  }, []);

  const logout = useCallback(() => endSession(false), [endSession]);

  const value = useMemo<AuthContextValue>(
    () => ({ isAuthenticated: token !== null, sessionExpired, login, logout }),
    [token, sessionExpired, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
