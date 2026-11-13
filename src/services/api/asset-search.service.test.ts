import { describe, expect, it, vi } from 'vitest';
import { resolveCoinGeckoId, searchAssets } from '@/services/api/asset-search.service';
import { fetchCryptoQuotes } from '@/services/api/quotes.service';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

interface ProviderReplies {
  brapi?: () => Response;
  coingeckoSearch?: () => Response;
  coingeckoPrice?: () => Response;
}

/** Simula os provedores externos; nenhuma chamada real sai dos testes. */
function stubProviders(replies: ProviderReplies) {
  const fetchMock = vi.fn<typeof fetch>(async (input) => {
    const url = String(input);
    if (url.startsWith('https://brapi.dev/api/quote/list')) return (replies.brapi ?? (() => jsonResponse({ stocks: [] })))();
    if (url.startsWith('https://api.coingecko.com/api/v3/search')) {
      return (replies.coingeckoSearch ?? (() => jsonResponse({ coins: [] })))();
    }
    if (url.startsWith('https://api.coingecko.com/api/v3/simple/price')) {
      return (replies.coingeckoPrice ?? (() => jsonResponse({})))();
    }
    throw new Error(`URL inesperada no teste: ${url}`);
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('searchAssets', () => {
  it('junta ações da Brapi e criptos da CoinGecko, cada uma com a sua classe', async () => {
    const fetchMock = stubProviders({
      brapi: () => jsonResponse({ stocks: [{ stock: 'PETR4', name: 'PETROBRAS' }, { stock: 'petr3', name: null }] }),
      coingeckoSearch: () =>
        jsonResponse({ coins: [{ id: 'petro-coin', name: 'Petro', symbol: 'petr', market_cap_rank: 900 }] }),
    });

    const result = await searchAssets(' petr ');

    expect(result).toEqual({
      suggestions: [
        { ticker: 'PETR4', name: 'PETROBRAS', assetClass: 'STOCK' },
        { ticker: 'PETR3', name: 'PETR3', assetClass: 'STOCK' },
        { ticker: 'PETR', name: 'Petro', assetClass: 'CRYPTO' },
      ],
      failedProviders: [],
    });

    const urls = fetchMock.mock.calls.map(([input]) => new URL(String(input)));
    expect(urls[0].searchParams.get('search')).toBe('petr');
    expect(urls[1].searchParams.get('query')).toBe('petr');
  });

  it('fica com uma cripto por símbolo (a de maior valor de mercado) e descarta símbolos inválidos', async () => {
    stubProviders({
      coingeckoSearch: () =>
        jsonResponse({
          coins: [
            { id: 'clone-sem-ranking', name: 'Clone', symbol: 'AAA', market_cap_rank: null },
            { id: 'clone-pequeno', name: 'Clone pequeno', symbol: 'aaa', market_cap_rank: 800 },
            { id: 'original', name: 'Original', symbol: 'AAA', market_cap_rank: 5 },
            { id: 'com-espaco', name: 'Inválida', symbol: 'A B', market_cap_rank: 1 },
          ],
        }),
    });

    const { suggestions } = await searchAssets('aaa');

    expect(suggestions).toEqual([{ ticker: 'AAA', name: 'Original', assetClass: 'CRYPTO' }]);
  });

  it('mantém as sugestões de um provedor quando o outro falha', async () => {
    stubProviders({
      brapi: () => jsonResponse({ message: 'fora do ar' }, 503),
      coingeckoSearch: () => jsonResponse({ coins: [{ id: 'bbb-coin', name: 'Bbb', symbol: 'BBB', market_cap_rank: 3 }] }),
    });

    await expect(searchAssets('bbb')).resolves.toEqual({
      suggestions: [{ ticker: 'BBB', name: 'Bbb', assetClass: 'CRYPTO' }],
      failedProviders: ['brapi'],
    });
  });

  it('não consulta os provedores com o texto vazio', async () => {
    const fetchMock = stubProviders({});

    await expect(searchAssets('   ')).resolves.toEqual({ suggestions: [], failedProviders: [] });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('id da CoinGecko para cotações', () => {
  it('resolve o id pelo símbolo exato e reaproveita o resultado', async () => {
    const fetchMock = stubProviders({
      coingeckoSearch: () =>
        jsonResponse({
          coins: [
            { id: 'ccc-parecida', name: 'Parecida', symbol: 'CCCX', market_cap_rank: 1 },
            { id: 'ccc-network', name: 'Ccc', symbol: 'CCC', market_cap_rank: 40 },
          ],
        }),
    });

    await expect(resolveCoinGeckoId('ccc')).resolves.toBe('ccc-network');
    await expect(resolveCoinGeckoId('CCC')).resolves.toBe('ccc-network');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('fetchCryptoQuotes cota uma moeda fora do mapa fixo usando o id resolvido', async () => {
    const fetchMock = stubProviders({
      coingeckoSearch: () => jsonResponse({ coins: [{ id: 'ddd-protocol', name: 'Ddd', symbol: 'DDD', market_cap_rank: 70 }] }),
      coingeckoPrice: () => jsonResponse({ bitcoin: { brl: 500000 }, 'ddd-protocol': { brl: 12.5 } }),
    });

    const result = await fetchCryptoQuotes(['BTC', 'DDD']);

    expect(result.errors).toEqual([]);
    expect(result.quotes).toEqual([
      { ticker: 'BTC', price: 500000, currency: 'BRL' },
      { ticker: 'DDD', price: 12.5, currency: 'BRL' },
    ]);

    const priceUrl = new URL(String(fetchMock.mock.calls.at(-1)?.[0]));
    expect(priceUrl.searchParams.get('ids')).toBe('bitcoin,ddd-protocol');
  });
});
