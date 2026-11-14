import { HttpError, httpClient } from '@/services';
import type { CurrentUser, LoginCredentials, RegisterInput } from '@/features/auth/types';

export interface LoginResult {
  token: string;
  /** Validade do token em segundos a partir de agora; `null` se a API não informar. */
  expiresIn: number | null;
}

/** Autentica na API e devolve o token JWT com a sua validade. */
export async function login(credentials: LoginCredentials): Promise<LoginResult> {
  const response = await httpClient.post<{ token?: unknown; expiresIn?: unknown }>('/auth/login', credentials);

  if (typeof response?.token !== 'string' || response.token === '') {
    throw new HttpError('A API não devolveu um token de acesso.', 0, response);
  }

  const { expiresIn } = response;
  return {
    token: response.token,
    expiresIn: typeof expiresIn === 'number' && Number.isFinite(expiresIn) && expiresIn > 0 ? expiresIn : null,
  };
}

/** Dados do usuário dono do token (`GET /auth/me`). */
export async function getCurrentUser(): Promise<CurrentUser> {
  return httpClient.get<CurrentUser>('/auth/me');
}

/** Cadastra um novo usuário (201). Lança `HttpError` 409 se o e-mail já existe e 400 se há campos inválidos. */
export async function register(input: RegisterInput): Promise<void> {
  await httpClient.post<unknown>('/auth/cadastrar', input);
}
