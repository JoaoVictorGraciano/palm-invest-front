import { createContext, useContext } from 'react';
import type { LoginCredentials } from '@/features/auth/types';

export interface AuthContextValue {
  isAuthenticated: boolean;
  /** `true` quando a sessão foi encerrada por um 401 da API (token inválido ou expirado). */
  sessionExpired: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser usado dentro de <AuthProvider>.');
  return context;
}
