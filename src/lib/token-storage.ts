import { readStorage, removeStorage, writeStorage } from '@/lib/storage';

/**
 * Guarda o token JWT da sessão no `localStorage` do navegador. É o único
 * lugar da aplicação que conhece a chave — o token nunca fica no código.
 */
const TOKEN_KEY = 'palm-invest:auth-token';

export const tokenStorage = {
  get(): string | null {
    const token = readStorage<unknown>(TOKEN_KEY, null);
    return typeof token === 'string' && token !== '' ? token : null;
  },
  set(token: string): void {
    writeStorage(TOKEN_KEY, token);
  },
  clear(): void {
    removeStorage(TOKEN_KEY);
  },
};
