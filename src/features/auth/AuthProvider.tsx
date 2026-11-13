import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { queryClient } from '@/lib/query-client';
import { tokenStorage } from '@/lib/token-storage';
import { setUnauthorizedHandler } from '@/services';
import { AuthContext } from '@/features/auth/auth-context';
import type { AuthContextValue } from '@/features/auth/auth-context';
import * as authService from '@/features/auth/services/auth.service';
import type { LoginCredentials } from '@/features/auth/types';

/** Maior espera aceita por `setTimeout` (2^31 - 1 ms, cerca de 24 dias). */
const MAX_TIMEOUT_MS = 2_147_483_647;

interface Session {
  token: string | null;
  /** Instante de expiração do token (ms desde a época); `null` se desconhecido. */
  expiresAt: number | null;
}

interface StoredSession extends Session {
  /** `true` quando havia um token guardado, mas ele já estava vencido. */
  expired: boolean;
}

/** Lê a sessão guardada no navegador, descartando um token já vencido. */
function readStoredSession(): StoredSession {
  const token = tokenStorage.get();
  const expiresAt = tokenStorage.getExpiresAt();

  if (token !== null && expiresAt !== null && expiresAt <= Date.now()) {
    tokenStorage.clear();
    return { token: null, expiresAt: null, expired: true };
  }

  return { token, expiresAt: token === null ? null : expiresAt, expired: false };
}

/**
 * Dono da sessão: guarda o token (via `tokenStorage`), expõe login/logout e
 * encerra a sessão quando a API responde 401 ou quando o token chega ao fim
 * da validade informada no login (`expiresIn`). Ao trocar de sessão o cache
 * do React Query é limpo para que dados de um usuário nunca apareçam para
 * outro.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [initialSession] = useState(readStoredSession);
  const [session, setSession] = useState<Session>({
    token: initialSession.token,
    expiresAt: initialSession.expiresAt,
  });
  const [sessionExpired, setSessionExpired] = useState(initialSession.expired);

  const endSession = useCallback((expired: boolean) => {
    tokenStorage.clear();
    queryClient.clear();
    setSession({ token: null, expiresAt: null });
    setSessionExpired(expired);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => endSession(true));
    return () => setUnauthorizedHandler(() => {});
  }, [endSession]);

  // Encerra a sessão no instante da expiração. Além do timer, confere ao
  // voltar para a aba: navegadores atrasam timers de abas em segundo plano
  // e de computadores que ficaram suspensos.
  const { expiresAt } = session;
  useEffect(() => {
    if (expiresAt === null) return;

    let timer: number | undefined;

    function check() {
      window.clearTimeout(timer);
      const remaining = expiresAt! - Date.now();

      if (remaining <= 0) endSession(true);
      else timer = window.setTimeout(check, Math.min(remaining, MAX_TIMEOUT_MS));
    }

    check();
    window.addEventListener('focus', check);
    document.addEventListener('visibilitychange', check);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('focus', check);
      document.removeEventListener('visibilitychange', check);
    };
  }, [expiresAt, endSession]);

  const login = useCallback(async (credentials: LoginCredentials) => {
    const { token, expiresIn } = await authService.login(credentials);
    const newExpiresAt = expiresIn === null ? null : Date.now() + expiresIn * 1000;

    queryClient.clear();
    tokenStorage.set(token, newExpiresAt);
    setSession({ token, expiresAt: newExpiresAt });
    setSessionExpired(false);
  }, []);

  const logout = useCallback(() => endSession(false), [endSession]);

  const isAuthenticated = session.token !== null;
  const value = useMemo<AuthContextValue>(
    () => ({ isAuthenticated, sessionExpired, login, logout }),
    [isAuthenticated, sessionExpired, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
