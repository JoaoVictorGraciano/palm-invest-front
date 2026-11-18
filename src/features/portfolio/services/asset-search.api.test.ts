import { describe, expect, it, vi } from 'vitest';
import { searchAssets, sortByMatch } from '@/features/portfolio/services/asset-search.api';
import { tokenStorage } from '@/lib/token-storage';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

function stubFetch(reply: () => Response | Promise<Response>) {
  const fetchMock = vi.fn<typeof fetch>(async () => reply());
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function requestedUrl(fetchMock: ReturnType<typeof stubFetch>): URL {
  return new URL(String(fetchMock.mock.calls[0][0]));
}

describe('searchAssets', () => {
  it('chama GET /api/assets/search com o Bearer e troca symbol por ticker', async () => {
    tokenStorage.set('token-ficticio');
    const fetchMock = stubFetch(() =>
      jsonResponse({
        suggestions: [
          { symbol: 'PETR4', name: 'PETROBRAS PN', assetClass: 'STOCK' },
          { symbol: 'BTC', name: 'Bitcoin', assetClass: 'CRYPTO' },
        ],
        failedProviders: [],
      }),
    );

    const result = await searchAssets(' petr ');

    const url = requestedUrl(fetchMock);
    expect(`${url.origin}${url.pathname}`).toBe('http://api.test/api/assets/search');
    expect(url.searchParams.get('q')).toBe('petr');
    expect(url.searchParams.get('class')).toBe('ALL');
    expect(new Headers(fetchMock.mock.calls[0][1]?.headers).get('Authorization')).toBe('Bearer token-ficticio');
    expect(result).toEqual({
      suggestions: [
        { ticker: 'PETR4', name: 'PETROBRAS PN', assetClass: 'STOCK' },
        { ticker: 'BTC', name: 'Bitcoin', assetClass: 'CRYPTO' },
      ],
      failedProviders: [],
    });
  });

  it('envia a classe escolhida e descarta o que vier de outra classe', async () => {
    const fetchMock = stubFetch(() =>
      jsonResponse({
        suggestions: [
          { symbol: 'HGLG11', name: 'PATRIA LOG', assetClass: 'FII' },
          { symbol: 'BOVA11', name: 'ISHARES IBOVESPA', assetClass: 'ETF' },
        ],
        failedProviders: [],
      }),
    );

    const { suggestions } = await searchAssets('hglg', undefined, 'FII');

    expect(requestedUrl(fetchMock).searchParams.get('class')).toBe('FII');
    expect(suggestions).toEqual([{ ticker: 'HGLG11', name: 'PATRIA LOG', assetClass: 'FII' }]);
  });

  it('repassa os provedores que falharam e ignora valores desconhecidos', async () => {
    stubFetch(() =>
      jsonResponse({
        suggestions: [{ symbol: 'PETR4', name: 'PETROBRAS PN', assetClass: 'STOCK' }],
        failedProviders: ['coingecko', 'outro'],
      }),
    );

    await expect(searchAssets('petr')).resolves.toMatchObject({ failedProviders: ['coingecko'] });
  });

  it('descarta sugestões sem símbolo ou com classe desconhecida', async () => {
    stubFetch(() =>
      jsonResponse({
        suggestions: [
          { symbol: '', name: 'Sem símbolo', assetClass: 'STOCK' },
          { symbol: 'XYZ', name: 'Classe estranha', assetClass: 'FUTURO' },
          { symbol: 'eth', name: null, assetClass: 'CRYPTO' },
        ],
        failedProviders: [],
      }),
    );

    const { suggestions } = await searchAssets('xy');

    expect(suggestions).toEqual([{ ticker: 'ETH', name: 'ETH', assetClass: 'CRYPTO' }]);
  });

  it('um 503 vira busca vazia com os provedores da classe em failedProviders', async () => {
    stubFetch(() => jsonResponse({ mensagem: 'Provedores indisponíveis' }, 503));

    await expect(searchAssets('btc', undefined, 'CRYPTO')).resolves.toEqual({
      suggestions: [],
      failedProviders: ['coingecko'],
    });
    await expect(searchAssets('petr', undefined, 'STOCK')).resolves.toEqual({
      suggestions: [],
      failedProviders: ['brapi'],
    });
    await expect(searchAssets('petr')).resolves.toEqual({
      suggestions: [],
      failedProviders: ['brapi', 'coingecko'],
    });
  });

  it('com a API fora do ar, também devolve busca vazia em vez de lançar', async () => {
    stubFetch(() => Promise.reject(new TypeError('Failed to fetch')));

    await expect(searchAssets('petr')).resolves.toEqual({
      suggestions: [],
      failedProviders: ['brapi', 'coingecko'],
    });
  });

  it('propaga erros que não são de indisponibilidade (ex: 400)', async () => {
    stubFetch(() => jsonResponse([{ campo: 'q', mensagem: 'Muito curto' }], 400));

    await expect(searchAssets('p')).rejects.toMatchObject({ name: 'HttpError', status: 400 });
  });

  it('não chama a API com o texto vazio', async () => {
    const fetchMock = stubFetch(() => jsonResponse({ suggestions: [], failedProviders: [] }));

    await expect(searchAssets('   ')).resolves.toEqual({ suggestions: [], failedProviders: [] });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('sortByMatch', () => {
  const asset = (ticker: string, name = ticker) => ({ ticker, name });

  it('símbolo igual primeiro, depois símbolo ou nome que começa com o texto, depois o resto', () => {
    const sorted = sortByMatch('btc', [
      asset('OBTC3', 'ORANJEBTC'),
      asset('BGBTC', 'Bitget Wrapped BTC'),
      asset('BTCP', 'Bitcoin Pro'),
      asset('BTC', 'Bitcoin'),
    ]);

    expect(sorted.map((item) => item.ticker)).toEqual(['BTC', 'BTCP', 'OBTC3', 'BGBTC']);
  });

  it('com "BI", o Bitcoin (nome começando com o texto) fica no mesmo nível de BIO e mantém a ordem de entrada', () => {
    const sorted = sortByMatch('BI', [
      asset('BTC', 'Bitcoin'),
      asset('BIO', 'Bio Protocol'),
      asset('MOTV3', 'MOTIVA INFRAESTRUTURA DE MOBILIDADE'),
    ]);

    expect(sorted.map((item) => item.ticker)).toEqual(['BTC', 'BIO', 'MOTV3']);
  });
});
