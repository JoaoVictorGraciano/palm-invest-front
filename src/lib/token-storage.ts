import { readStorage, removeStorage, writeStorage } from '@/lib/storage';

/**
 * Guarda o token JWT da sessão e o instante em que ele expira no
 * `localStorage` do navegador. É o único lugar da aplicação que conhece as
 * chaves — o token nunca fica no código.
 */
const TOKEN_KEY = 'palm-invest:auth-token';
const EXPIRES_AT_KEY = 'palm-invest:auth-expires-at';

export const tokenStorage = {
  get(): string | null {
    const token = readStorage<unknown>(TOKEN_KEY, null);
    return typeof token === 'string' && token !== '' ? token : null;
  },
  /**
   * Instante de expiração do token, em milissegundos desde a época, ou
   * `null` quando desconhecido (sessão gravada antes de a API informar o
   * `expiresIn`).
   */
  getExpiresAt(): number | null {
    const expiresAt = readStorage<unknown>(EXPIRES_AT_KEY, null);
    return typeof expiresAt === 'number' && Number.isFinite(expiresAt) ? expiresAt : null;
  },
  set(token: string, expiresAt: number | null = null): void {
    writeStorage(TOKEN_KEY, token);
    if (expiresAt === null) removeStorage(EXPIRES_AT_KEY);
    else writeStorage(EXPIRES_AT_KEY, expiresAt);
  },
  clear(): void {
    removeStorage(TOKEN_KEY);
    removeStorage(EXPIRES_AT_KEY);
  },
};
