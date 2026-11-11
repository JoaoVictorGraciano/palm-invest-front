import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AuthContext } from '@/features/auth/auth-context';
import type { AuthContextValue } from '@/features/auth/auth-context';
import { PrivateRoute } from '@/routes/PrivateRoute';

function LoginProbe() {
  const location = useLocation();
  return <p>login (origem: {(location.state as { from?: string } | null)?.from})</p>;
}

function renderAt(path: string, isAuthenticated: boolean) {
  const auth: AuthContextValue = {
    isAuthenticated,
    sessionExpired: false,
    login: async () => {},
    logout: () => {},
  };

  render(
    <AuthContext.Provider value={auth}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/login" element={<LoginProbe />} />
          <Route element={<PrivateRoute />}>
            <Route path="/carteira" element={<p>carteira privada</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

describe('PrivateRoute', () => {
  it('sem sessão, redireciona para o login guardando a página de origem', () => {
    renderAt('/carteira', false);

    expect(screen.getByText('login (origem: /carteira)')).toBeInTheDocument();
    expect(screen.queryByText('carteira privada')).not.toBeInTheDocument();
  });

  it('com sessão, renderiza a rota privada', () => {
    renderAt('/carteira', true);

    expect(screen.getByText('carteira privada')).toBeInTheDocument();
  });
});
