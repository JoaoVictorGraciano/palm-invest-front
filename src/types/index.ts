/**
 * Tipos globais compartilhados por toda a aplicação.
 * Tipos específicos de um domínio devem viver em `src/features/<feature>/types`.
 */

export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  page: number;
  pageSize: number;
  total: number;
}

export interface AppError {
  code: string;
  message: string;
}
