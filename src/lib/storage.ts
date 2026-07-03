/**
 * Wrapper fino sobre `localStorage`, tolerante a falhas (modo privado, quota
 * excedida, SSR) e com serialização JSON automática. Centralizado aqui para
 * que nenhuma feature acesse `window.localStorage` diretamente.
 */

const isBrowser = typeof window !== 'undefined';

export function readStorage<T>(key: string, fallback: T): T {
  if (!isBrowser) return fallback;

  try {
    const raw = window.localStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function writeStorage<T>(key: string, value: T): void {
  if (!isBrowser) return;

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage indisponível (modo privado, quota excedida etc.) — falha silenciosa.
  }
}
