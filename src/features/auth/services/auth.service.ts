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

export interface ValidationErrors {
  /** Mensagem por campo (chave = nome do campo na API). */
  fields: Record<string, string>;
  /** Mensagens que não puderam ser associadas a um campo. */
  general: string[];
}

const FIELD_KEYS = ['campo', 'field', 'nome', 'name', 'property'];
const MESSAGE_KEYS = ['mensagem', 'message', 'defaultMessage', 'erro', 'error'];
const LIST_KEYS = ['errors', 'erros', 'campos', 'fieldErrors', 'fields', 'detalhes', 'details'];

function firstString(source: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'string' && value !== '') return value;
  }
  return undefined;
}

/**
 * Interpreta o corpo de um 400 de validação. Como o formato exato da lista
 * de campos inválidos não é fixo, aceita as formas mais comuns:
 * `["msg"]`, `[{campo, mensagem}]`, `[{field, message}]`, `{campo: "msg"}`
 * ou qualquer uma delas dentro de `errors`/`erros`/`campos`.
 */
export function parseValidationErrors(body: unknown): ValidationErrors {
  const result: ValidationErrors = { fields: {}, general: [] };

  function visit(value: unknown): void {
    if (typeof value === 'string') {
      if (value !== '') result.general.push(value);
      return;
    }

    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }

    if (!value || typeof value !== 'object') return;
    const record = value as Record<string, unknown>;

    const nestedKey = LIST_KEYS.find((key) => record[key] && typeof record[key] === 'object');
    if (nestedKey) {
      visit(record[nestedKey]);
      return;
    }

    const field = firstString(record, FIELD_KEYS);
    const message = firstString(record, MESSAGE_KEYS);
    if (field && message) {
      result.fields[field] = message;
      return;
    }

    // Mapa simples { campo: "mensagem" }.
    for (const [key, entry] of Object.entries(record)) {
      if (typeof entry === 'string' && entry !== '') result.fields[key] = entry;
    }
  }

  visit(body);
  return result;
}
