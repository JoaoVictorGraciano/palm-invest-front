import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { useAuth } from '@/features/auth/auth-context';
import { tokenStorage } from '@/lib/token-storage';

// Valores fictícios, usados apenas contra o `fetch` simulado.
const FAKE_TOKEN = 'token-ficticio';
const NOW = new Date('2026-01-01T12:00:00Z').getTime();

function Probe() {
  const { isAuthenticated, sessionExpired, login } = useAuth();
  return (
    <div>
      <p>{isAuthenticated ? 'com sessão' : 'sem sessão'}</p>
      <p>{sessionExpired ? 'expirada' : 'não expirada'}</p>
      <button type="button" onClick={() => void login({ email: 'pessoa@exemplo.test', senha: 'valor-ficticio' })}>
        entrar
      </button>
    </div>
  );
}

function renderProvider() {
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );
}

function stubLogin(body: unknown) {
  vi.stubGlobal('fetch', vi.fn<typeof fetch>(async () => new Response(JSON.stringify(body), { status: 200 })));
}

async function clickLogin() {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'entrar' }));
    // Deixa a promise do login (fetch simulado) resolver.
    await vi.advanceTimersByTimeAsync(0);
  });
}

async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

describe('AuthProvider: expiração da sessão', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  it('guarda o instante de expiração a partir do expiresIn do login', async () => {
    stubLogin({ token: FAKE_TOKEN, expiresIn: 7200 });
    renderProvider();

    await clickLogin();

    expect(screen.getByText('com sessão')).toBeInTheDocument();
    expect(tokenStorage.get()).toBe(FAKE_TOKEN);
    expect(tokenStorage.getExpiresAt()).toBe(NOW + 7200 * 1000);
  });

  it('encerra a sessão quando o token expira, e não antes', async () => {
    stubLogin({ token: FAKE_TOKEN, expiresIn: 60 });
    renderProvider();
    await clickLogin();

    await advance(59_000);
    expect(screen.getByText('com sessão')).toBeInTheDocument();

    await advance(1_000);
    expect(screen.getByText('sem sessão')).toBeInTheDocument();
    expect(screen.getByText('expirada')).toBeInTheDocument();
    expect(tokenStorage.get()).toBeNull();
    expect(tokenStorage.getExpiresAt()).toBeNull();
  });

  it('ao voltar para a aba, encerra a sessão vencida mesmo que o timer não tenha disparado', async () => {
    tokenStorage.set(FAKE_TOKEN, NOW + 60_000);
    renderProvider();
    expect(screen.getByText('com sessão')).toBeInTheDocument();

    // O relógio avança sem rodar timers, como em um computador suspenso.
    vi.setSystemTime(NOW + 61_000);
    act(() => {
      window.dispatchEvent(new Event('focus'));
    });

    expect(screen.getByText('sem sessão')).toBeInTheDocument();
    expect(screen.getByText('expirada')).toBeInTheDocument();
  });

  it('ao abrir o app com um token já vencido, começa sem sessão e limpa o token', () => {
    tokenStorage.set(FAKE_TOKEN, NOW - 1);

    renderProvider();

    expect(screen.getByText('sem sessão')).toBeInTheDocument();
    expect(screen.getByText('expirada')).toBeInTheDocument();
    expect(tokenStorage.get()).toBeNull();
  });

  it('mantém uma sessão antiga, gravada sem instante de expiração', async () => {
    tokenStorage.set(FAKE_TOKEN);
    renderProvider();

    await advance(24 * 60 * 60 * 1000);

    expect(screen.getByText('com sessão')).toBeInTheDocument();
  });

  it('se o login não informar expiresIn, entra sem agendar expiração', async () => {
    stubLogin({ token: FAKE_TOKEN });
    renderProvider();
    await clickLogin();

    expect(screen.getByText('com sessão')).toBeInTheDocument();
    expect(tokenStorage.getExpiresAt()).toBeNull();
  });
});
