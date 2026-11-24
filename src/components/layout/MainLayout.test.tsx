import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { MainLayout } from '@/components/layout/MainLayout';
import { AuthContext } from '@/features/auth/auth-context';
import type { AuthContextValue } from '@/features/auth/auth-context';
import { tokenStorage } from '@/lib/token-storage';

function renderLayout(overrides: Partial<AuthContextValue> = {}) {
  const auth: AuthContextValue = {
    isAuthenticated: true,
    sessionExpired: false,
    login: async () => {},
    logout: () => {},
    ...overrides,
  };
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={auth}>
        <MemoryRouter>
          <MainLayout />
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

describe('MainLayout', () => {
  it('mostra no cabeçalho o nome devolvido por GET /auth/me', async () => {
    tokenStorage.set('token-ficticio');
    const fetchMock = vi.fn<typeof fetch>(
      async () => new Response(JSON.stringify({ id: 1, nome: 'Pessoa de Teste', email: 'pessoa@exemplo.test' })),
    );
    vi.stubGlobal('fetch', fetchMock);

    renderLayout();

    expect(await screen.findByText('Pessoa de Teste')).toBeInTheDocument();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://api.test/auth/me');
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer token-ficticio');
  });

  it('mostra Proventos e Impostos no menu, entre Carteira e Histórico', () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>(async () => new Response(null, { status: 500 })));

    renderLayout();

    const links = within(screen.getByRole('navigation')).getAllByRole('link').map((link) => link.textContent);
    expect(links).toEqual(['Início', 'Carteira', 'Proventos', 'Impostos', 'Histórico']);
    expect(screen.getByRole('link', { name: 'Proventos' })).toHaveAttribute('href', '/proventos');
    expect(screen.getByRole('link', { name: 'Impostos' })).toHaveAttribute('href', '/impostos');
  });

  it('mostra no rodapé a atribuição da CoinGecko, com link para coingecko.com', () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>(async () => new Response(null, { status: 500 })));

    renderLayout();

    const footer = screen.getByRole('contentinfo');
    expect(footer).toHaveTextContent('Dados de cripto: CoinGecko');
    const link = within(footer).getByRole('link', { name: 'CoinGecko' });
    expect(link).toHaveAttribute('href', 'https://www.coingecko.com');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('continua utilizável se /auth/me falhar: sem nome, mas com o botão Sair', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>(async () => new Response(null, { status: 500 })));
    const logout = vi.fn();

    renderLayout({ logout });
    await userEvent.setup().click(screen.getByRole('button', { name: 'Sair' }));

    expect(logout).toHaveBeenCalledTimes(1);
  });
});
