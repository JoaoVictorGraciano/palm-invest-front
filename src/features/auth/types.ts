export interface LoginCredentials {
  email: string;
  senha: string;
}

/** Usuário dono da sessão, como devolvido por `GET /auth/me`. */
export interface CurrentUser {
  id: number;
  nome: string;
  email: string;
}

export interface RegisterInput {
  nome: string;
  email: string;
  senha: string;
}
