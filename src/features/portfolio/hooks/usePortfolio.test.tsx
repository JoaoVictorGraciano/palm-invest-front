import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { toast } from 'sonner';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { usePortfolio } from '@/features/portfolio/hooks/usePortfolio';

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

function buy(assetSymbol: string, assetClass: string, price: number) {
  return {
    id: assetSymbol,
    type: 'BUY',
    assetSymbol,
    assetClass,
    quantity: 10,
    price,
    transactionDate: '2025-01-01T10:00:00',
    broker: 'CLEAR',
    fee: 0,
    observation: '',
  };
}

const TRANSACTIONS = [buy('PETR4', 'STOCK', 30), buy('BTC', 'CRYPTO', 100)];

/** Simula a palm-invest-api; qualquer chamada a outro host falha o teste. */
function stubApi(quotesReply: () => Response) {
  const fetchMock = vi.fn<typeof fetch>(async (input) => {
    const url = new URL(String(input));
    if (url.origin !== 'http://api.test') throw new Error(`Chamada fora da API: ${url}`);
    if (url.pathname === '/api/transactions') return jsonResponse(TRANSACTIONS);
    if (url.pathname === '/api/quotes') return quotesReply();
    throw new Error(`Rota inesperada no teste: ${url}`);
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function renderPortfolio() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return renderHook(() => usePortfolio(), { wrapper });
}

function priceOf(result: ReturnType<typeof renderPortfolio>['result'], ticker: string) {
  return result.current.portfolio?.assets.find((asset) => asset.ticker === ticker)?.currentPrice;
}

describe('usePortfolio: cotações pela API', () => {
  beforeEach(() => vi.mocked(toast.error).mockClear());

  it('busca as cotações de todas as posições em uma única chamada', async () => {
    const fetchMock = stubApi(() =>
      jsonResponse({
        quotes: [
          { symbol: 'PETR4', price: 45, currency: 'BRL', provider: 'brapi' },
          { symbol: 'BTC', price: 120, currency: 'BRL', provider: 'coingecko' },
        ],
        failures: [],
      }),
    );
    const { result } = renderPortfolio();

    await waitFor(() => expect(result.current.portfolio).toBeDefined());

    const quoteCalls = fetchMock.mock.calls.filter(([input]) => String(input).includes('/api/quotes'));
    expect(quoteCalls).toHaveLength(1);
    expect(new URL(String(quoteCalls[0][0])).searchParams.get('symbols')!.split(',').sort()).toEqual(['BTC', 'PETR4']);
    expect(priceOf(result, 'PETR4')).toBe(45);
    expect(priceOf(result, 'BTC')).toBe(120);
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('um símbolo em failures usa o custo médio e aparece no aviso', async () => {
    stubApi(() =>
      jsonResponse({
        quotes: [{ symbol: 'PETR4', price: 45, currency: 'BRL', provider: 'brapi' }],
        failures: [{ symbol: 'BTC', provider: 'coingecko', mensagem: 'CoinGecko indisponível' }],
      }),
    );
    const { result } = renderPortfolio();

    await waitFor(() => expect(result.current.portfolio).toBeDefined());

    expect(priceOf(result, 'PETR4')).toBe(45);
    expect(priceOf(result, 'BTC')).toBe(100);
    expect(toast.error).toHaveBeenCalledWith('Algumas cotações não puderam ser atualizadas', {
      description: 'Usando o custo médio como preço atual de: BTC.',
    });
  });

  it('um 503 avisa "Cotações indisponíveis no momento" e a carteira continua de pé com o custo médio', async () => {
    stubApi(() => jsonResponse({ mensagem: 'Brapi e CoinGecko indisponíveis' }, 503));
    const { result } = renderPortfolio();

    await waitFor(() => expect(result.current.portfolio).toBeDefined());

    expect(result.current.isError).toBe(false);
    expect(priceOf(result, 'PETR4')).toBe(30);
    expect(priceOf(result, 'BTC')).toBe(100);
    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(vi.mocked(toast.error).mock.calls[0][0]).toBe('Cotações indisponíveis no momento');
  });
});
