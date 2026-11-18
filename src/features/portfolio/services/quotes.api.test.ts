import { describe, expect, it, vi } from 'vitest';
import { fetchQuotes } from '@/features/portfolio/services/quotes.api';
import { tokenStorage } from '@/lib/token-storage';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

function stubFetch(reply: (url: URL) => Response | Promise<Response>) {
  const fetchMock = vi.fn<typeof fetch>(async (input) => reply(new URL(String(input))));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function requestedSymbols(fetchMock: ReturnType<typeof stubFetch>): string[][] {
  return fetchMock.mock.calls.map(([input]) => new URL(String(input)).searchParams.get('symbols')!.split(','));
}

describe('fetchQuotes', () => {
  it('faz uma única chamada a GET /api/quotes com o Bearer e troca symbol por ticker', async () => {
    tokenStorage.set('token-ficticio');
    const fetchMock = stubFetch(() =>
      jsonResponse({
        quotes: [
          { symbol: 'PETR4', price: 45.3, currency: 'BRL', provider: 'brapi', updatedAt: '2026-11-18T13:00:00Z' },
          { symbol: 'BTC', price: '377077', currency: 'BRL', provider: 'coingecko', updatedAt: '2026-11-18T13:01:00Z' },
        ],
        failures: [{ symbol: 'XXXX9', provider: 'brapi', mensagem: 'Ativo não encontrado' }],
      }),
    );

    const result = await fetchQuotes(['petr4', 'BTC', 'XXXX9', 'PETR4']);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(`${url.origin}${url.pathname}`).toBe('http://api.test/api/quotes');
    expect(url.searchParams.get('symbols')).toBe('PETR4,BTC,XXXX9');
    expect(new Headers(fetchMock.mock.calls[0][1]?.headers).get('Authorization')).toBe('Bearer token-ficticio');

    expect(result).toEqual({
      quotes: [
        { ticker: 'PETR4', price: 45.3, currency: 'BRL', provider: 'brapi', updatedAt: '2026-11-18T13:00:00Z' },
        { ticker: 'BTC', price: 377077, currency: 'BRL', provider: 'coingecko', updatedAt: '2026-11-18T13:01:00Z' },
      ],
      failures: [{ ticker: 'XXXX9', provider: 'brapi', mensagem: 'Ativo não encontrado' }],
      unavailable: false,
    });
  });

  it('um 503 vira "indisponível", sem lançar e sem cotações', async () => {
    stubFetch(() => jsonResponse({ mensagem: 'Brapi e CoinGecko indisponíveis' }, 503));

    await expect(fetchQuotes(['PETR4', 'BTC'])).resolves.toEqual({ quotes: [], failures: [], unavailable: true });
  });

  it('com a API fora do ar, também vira "indisponível"', async () => {
    stubFetch(() => Promise.reject(new TypeError('Failed to fetch')));

    await expect(fetchQuotes(['PETR4'])).resolves.toMatchObject({ unavailable: true });
  });

  it('propaga erros que não são de indisponibilidade (ex: 400)', async () => {
    stubFetch(() => jsonResponse({ mensagem: 'symbols inválido' }, 400));

    await expect(fetchQuotes(['PETR4'])).rejects.toMatchObject({ name: 'HttpError', status: 400 });
  });

  it('divide em várias chamadas acima de 50 símbolos', async () => {
    const fetchMock = stubFetch(() => jsonResponse({ quotes: [], failures: [] }));
    const tickers = Array.from({ length: 51 }, (_, index) => `ATV${index}`);

    await fetchQuotes(tickers);

    expect(requestedSymbols(fetchMock).map((chunk) => chunk.length)).toEqual([50, 1]);
  });

  it('não chama a API sem símbolos', async () => {
    const fetchMock = stubFetch(() => jsonResponse({ quotes: [], failures: [] }));

    await expect(fetchQuotes([])).resolves.toEqual({ quotes: [], failures: [], unavailable: false });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
