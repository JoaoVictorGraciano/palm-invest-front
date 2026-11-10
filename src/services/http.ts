/**
 * Cliente HTTP único da API interna da aplicação (palm-invest-api).
 *
 * - A URL base vem de `VITE_API_URL` (ver `.env.example`).
 * - O token JWT guardado em `tokenStorage` é enviado automaticamente como
 *   `Authorization: Bearer <token>` em toda rota que não seja `/auth/*`.
 * - Respostas sem corpo (204) resolvem com `undefined`.
 * - Um 401 fora de `/auth/*` dispara o handler registrado em
 *   `setUnauthorizedHandler` (a sessão é encerrada pela camada de auth).
 *
 * Serviços de domínio devem consumir este client em vez de chamar `fetch`
 * diretamente. Integrações com provedores externos (cotações) não o usam.
 */
import { tokenStorage } from '@/lib/token-storage';

const BASE_URL = ((import.meta.env.VITE_API_URL as string | undefined) ?? '').trim().replace(/\/+$/, '');

const AUTH_PATH_PREFIX = '/auth/';

export class HttpError extends Error {
  /** Status HTTP da resposta; `0` quando a requisição nem chegou ao servidor. */
  readonly status: number;
  /** Corpo da resposta de erro já interpretado (JSON, texto ou `undefined`). */
  readonly body: unknown;

  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.body = body;
  }
}

let unauthorizedHandler: () => void = () => {};

/** Registra o que fazer quando a API responde 401 em uma rota protegida. */
export function setUnauthorizedHandler(handler: () => void): void {
  unauthorizedHandler = handler;
}

async function parseBody(response: Response): Promise<unknown> {
  if (response.status === 204 || response.status === 205) return undefined;

  const text = await response.text();
  if (text === '') return undefined;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function defaultMessage(status: number): string {
  if (status === 401) return 'Sua sessão expirou. Faça login novamente.';
  if (status === 403) return 'Você não tem permissão para realizar esta ação.';
  if (status === 404) return 'Recurso não encontrado.';
  if (status >= 500) return 'O servidor encontrou um erro. Tente novamente em instantes.';
  return `A requisição falhou (HTTP ${status}).`;
}

function errorMessage(status: number, body: unknown): string {
  if (body && typeof body === 'object' && !Array.isArray(body)) {
    const { message, mensagem } = body as Record<string, unknown>;
    if (typeof message === 'string' && message.trim() !== '') return message;
    if (typeof mensagem === 'string' && mensagem.trim() !== '') return mensagem;
  }
  return defaultMessage(status);
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (BASE_URL === '') {
    throw new HttpError('A URL da API não está configurada. Defina VITE_API_URL no arquivo .env.local.', 0);
  }

  const isAuthRoute = path.startsWith(AUTH_PATH_PREFIX);

  const headers = new Headers(init.headers);
  if (!headers.has('Accept')) headers.set('Accept', 'application/json');
  if (init.body != null && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');

  const token = tokenStorage.get();
  if (token && !isAuthRoute && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, { ...init, headers });
  } catch {
    throw new HttpError('Não foi possível conectar ao servidor. Verifique se a API está no ar.', 0);
  }

  const body = await parseBody(response);

  if (!response.ok) {
    if (response.status === 401 && !isAuthRoute) unauthorizedHandler();
    throw new HttpError(errorMessage(response.status, body), response.status, body);
  }

  return body as T;
}

function jsonBody(body: unknown): string | undefined {
  return body === undefined ? undefined : JSON.stringify(body);
}

export const httpClient = {
  get: <T>(path: string, init?: RequestInit) => request<T>(path, { ...init, method: 'GET' }),
  post: <T>(path: string, body?: unknown, init?: RequestInit) =>
    request<T>(path, { ...init, method: 'POST', body: jsonBody(body) }),
  put: <T>(path: string, body?: unknown, init?: RequestInit) =>
    request<T>(path, { ...init, method: 'PUT', body: jsonBody(body) }),
  delete: <T = void>(path: string, init?: RequestInit) => request<T>(path, { ...init, method: 'DELETE' }),
};
