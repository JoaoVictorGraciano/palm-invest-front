import { HttpError, httpClient } from '@/services';
import type { LoginCredentials, RegisterInput } from '@/features/auth/types';

/** Autentica na API e devolve o token JWT. */
export async function login(credentials: LoginCredentials): Promise<string> {
  const response = await httpClient.post<{ token?: unknown }>('/auth/login', credentials);

  if (typeof response?.token !== 'string' || response.token === '') {
    throw new HttpError('A API não devolveu um token de acesso.', 0, response);
  }

  return response.token;
}

/** Cadastra um novo usuário (201). Lança `HttpError` 409 se o e-mail já existe e 400 se há campos inválidos. */
export async function register(input: RegisterInput): Promise<void> {
  await httpClient.post<unknown>('/auth/cadastrar', input);
}
