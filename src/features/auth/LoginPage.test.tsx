import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { LoginPage } from '@/features/auth/LoginPage';
import { tokenStorage } from '@/lib/token-storage';

// Valores fictícios, usados apenas contra o `fetch` simulado.
const FAKE_EMAIL = 'pessoa@exemplo.test';
const FAKE_PASSWORD = 'valor-ficticio';
const FAKE_TOKEN = 'token-ficticio';

function renderLogin() {
  render(
    <AuthProvider>
      <MemoryRouter initialEntries={[{ pathname: '/login', state: { from: '/carteira' } }]}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/carteira" element={<p>carteira privada</p>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );
}

async function submitCredentials() {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('E-mail'), FAKE_EMAIL);
  await user.type(screen.getByLabelText('Senha'), FAKE_PASSWORD);
  await user.click(screen.getByRole('button', { name: 'Entrar' }));
}

describe('LoginPage', () => {
  it('envia as credenciais, guarda o token e volta para a página de origem', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({ token: FAKE_TOKEN }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    renderLogin();

    await submitCredentials();

    expect(await screen.findByText('carteira privada')).toBeInTheDocument();
    expect(tokenStorage.get()).toBe(FAKE_TOKEN);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://api.test/auth/login');
    expect(JSON.parse(String(init?.body))).toEqual({ email: FAKE_EMAIL, senha: FAKE_PASSWORD });
  });

  it('mostra erro e não guarda token quando as credenciais são recusadas', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>(async () => new Response(null, { status: 401 })));
    renderLogin();

    await submitCredentials();

    expect(await screen.findByText('E-mail ou senha inválidos.')).toBeInTheDocument();
    expect(tokenStorage.get()).toBeNull();
    expect(screen.queryByText('carteira privada')).not.toBeInTheDocument();
  });

  it('valida os campos antes de chamar a API', async () => {
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal('fetch', fetchMock);
    renderLogin();

    await userEvent.setup().click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByText('Informe o e-mail.')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
