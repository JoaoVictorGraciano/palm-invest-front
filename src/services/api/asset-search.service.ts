/**
 * Busca de ativos nos mesmos provedores usados para cotação:
 * - Brapi (`/quote/list?search=`): ações e demais papéis da B3.
 * - CoinGecko (`/search?query=`): criptomoedas.
 *
 * É a fonte das sugestões do formulário de transação: um ticker só pode ser
 * registrado se tiver sido escolhido a partir desta busca, e a classe do
 * ativo vem do provedor que o devolveu.
 *
 * Nenhuma das duas buscas exige token. O token opcional da Brapi
 * (`VITE_BRAPI_TOKEN`) é enviado quando configurado, apenas para usar a
 * cota da conta em vez da cota anônima.
 */
import { ASSET_CLASS } from '@/types';
import type { AssetClass } from '@/types';

const BRAPI_BASE_URL = 'https://brapi.dev/api';
const BRAPI_TOKEN = import.meta.env.VITE_BRAPI_TOKEN as string | undefined;
const COINGECKO_BASE_URL = 'https://api.coingecko.com/api/v3';

/** Quantas sugestões cada provedor contribui, no máximo. */
const MAX_PER_PROVIDER = 6;

/** Formato aceito pela palm-invest-api em `assetSymbol` (até 20 caracteres, sem espaços). */
const VALID_TICKER = /^[A-Z0-9]{1,20}$/;

export type AssetSearchProvider = 'brapi' | 'coingecko';

export interface AssetSuggestion {
  ticker: string;
  name: string;
  assetClass: AssetClass;
}

export interface AssetSearchResult {
  suggestions: AssetSuggestion[];
  /** Provedores que falharam nesta busca (as sugestões do outro continuam valendo). */
  failedProviders: AssetSearchProvider[];
}

interface BrapiListResponse {
  stocks?: Array<{ stock?: string; name?: string | null }>;
}

interface CoinGeckoCoin {
  id: string;
  name: string;
  symbol: string;
  market_cap_rank: number | null;
}

interface CoinGeckoSearchResponse {
  coins?: CoinGeckoCoin[];
}

async function getJson<T>(url: URL, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return (await response.json()) as T;
}

export async function searchStocks(query: string, signal?: AbortSignal): Promise<AssetSuggestion[]> {
  const url = new URL(`${BRAPI_BASE_URL}/quote/list`);
  url.searchParams.set('search', query);
  url.searchParams.set('limit', String(MAX_PER_PROVIDER));
  if (BRAPI_TOKEN) url.searchParams.set('token', BRAPI_TOKEN);

  const body = await getJson<BrapiListResponse>(url, signal);

  return (body.stocks ?? [])
    .map((item) => {
      const ticker = (item.stock ?? '').trim().toUpperCase();
      return { ticker, name: item.name?.trim() || ticker, assetClass: ASSET_CLASS.STOCK };
    })
    .filter((item) => VALID_TICKER.test(item.ticker))
    .slice(0, MAX_PER_PROVIDER);
}

/** Posição no ranking de valor de mercado; moedas sem ranking vão para o fim. */
function rankOf(coin: CoinGeckoCoin): number {
  return coin.market_cap_rank ?? Number.POSITIVE_INFINITY;
}

/**
 * Na CoinGecko várias moedas compartilham o mesmo símbolo, mas a API da
 * carteira guarda só o símbolo. Por isso fica uma moeda por símbolo: a de
 * maior valor de mercado.
 */
function bestCoinBySymbol(coins: CoinGeckoCoin[]): Map<string, CoinGeckoCoin> {
  const bySymbol = new Map<string, CoinGeckoCoin>();

  for (const coin of coins) {
    const symbol = (coin.symbol ?? '').trim().toUpperCase();
    if (!VALID_TICKER.test(symbol)) continue;

    const current = bySymbol.get(symbol);
    if (!current || rankOf(coin) < rankOf(current)) bySymbol.set(symbol, coin);
  }

  return bySymbol;
}

/** Id da CoinGecko por símbolo, aprendido nas buscas desta sessão do navegador. */
const coinIdBySymbol = new Map<string, string>();

async function fetchBestCoins(query: string, signal?: AbortSignal): Promise<Map<string, CoinGeckoCoin>> {
  const url = new URL(`${COINGECKO_BASE_URL}/search`);
  url.searchParams.set('query', query);

  const body = await getJson<CoinGeckoSearchResponse>(url, signal);
  return bestCoinBySymbol(body.coins ?? []);
}

export async function searchCryptos(query: string, signal?: AbortSignal): Promise<AssetSuggestion[]> {
  const best = await fetchBestCoins(query, signal);

  return [...best.entries()]
    .sort(([, a], [, b]) => rankOf(a) - rankOf(b))
    .slice(0, MAX_PER_PROVIDER)
    .map(([symbol, coin]) => {
      coinIdBySymbol.set(symbol, coin.id);
      return { ticker: symbol, name: coin.name, assetClass: ASSET_CLASS.CRYPTO };
    });
}

/**
 * Descobre o id da CoinGecko de um símbolo (ex: "SOL" → "solana") usando a
 * mesma regra das sugestões. Devolve `undefined` se a moeda não for
 * encontrada; lança se a CoinGecko estiver indisponível.
 */
export async function resolveCoinGeckoId(ticker: string): Promise<string | undefined> {
  const symbol = ticker.trim().toUpperCase();

  const cached = coinIdBySymbol.get(symbol);
  if (cached) return cached;

  const coin = (await fetchBestCoins(symbol)).get(symbol);
  if (coin) coinIdBySymbol.set(symbol, coin.id);
  return coin?.id;
}

/**
 * Busca nos dois provedores ao mesmo tempo. Nunca lança por causa de um
 * provedor: quem falhar aparece em `failedProviders`.
 */
export async function searchAssets(query: string, signal?: AbortSignal): Promise<AssetSearchResult> {
  const term = query.trim();
  if (term === '') return { suggestions: [], failedProviders: [] };

  const [stocks, cryptos] = await Promise.allSettled([searchStocks(term, signal), searchCryptos(term, signal)]);

  const failedProviders: AssetSearchProvider[] = [];
  if (stocks.status === 'rejected') failedProviders.push('brapi');
  if (cryptos.status === 'rejected') failedProviders.push('coingecko');

  return {
    suggestions: [
      ...(stocks.status === 'fulfilled' ? stocks.value : []),
      ...(cryptos.status === 'fulfilled' ? cryptos.value : []),
    ],
    failedProviders,
  };
}
