/**
 * Serviço unificado de cotações de mercado, agregando duas APIs públicas:
 * - Brapi (https://brapi.dev): cotações de ações negociadas na B3.
 * - CoinGecko (https://www.coingecko.com): cotações de criptomoedas.
 *
 * Vive em `services/api` (e não em `features/portfolio/services`) porque é
 * uma integração de infraestrutura com provedores externos, reaproveitável
 * por qualquer feature que precise de preços de mercado — não é uma regra
 * de negócio da carteira. Por consumir APIs de terceiros com formatos,
 * autenticação e políticas de erro próprias, não reutiliza o `httpClient`
 * genérico de `services/http.ts` (pensado para a API interna da aplicação).
 */

import { resolveCoinGeckoId } from './asset-search.service';

const BRAPI_BASE_URL ='https://brapi.dev/api';
const BRAPI_TOKEN = import.meta.env.VITE_BRAPI_TOKEN as string | undefined;

const COINGECKO_BASE_URL = 'https://api.coingecko.com/api/v3';

/** Mapa de ticker (ex: "BTC") para o id de moeda usado pela CoinGecko (ex: "bitcoin"). */
const COINGECKO_ID_BY_TICKER: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
  ADA: 'cardano',
  XRP: 'ripple',
  DOGE: 'dogecoin',
  BNB: 'binancecoin',
  MATIC: 'matic-network',
  LTC: 'litecoin',
  DOT: 'polkadot',
};

/**
 * Id da CoinGecko de um ticker: primeiro o mapa fixo (sem rede); para as
 * demais moedas, a busca da CoinGecko. Se a busca falhar ou não achar nada,
 * tenta o próprio ticker como id, e a cotação cai no fallback do ativo.
 */
async function coinGeckoIdFor(ticker: string): Promise<string> {
  const known = COINGECKO_ID_BY_TICKER[ticker.toUpperCase()];
  if (known) return known;

  const resolved = await resolveCoinGeckoId(ticker).catch(() => undefined);
  return resolved ?? ticker.toLowerCase();
}

export type QuoteProvider = 'brapi' | 'coingecko';

/**
 * Erro tipado de um provedor de cotação. Carrega o `ticker` afetado
 * (quando aplicável) para permitir mensagens de erro específicas e fallback
 * granular por ativo, em vez de derrubar a carteira inteira.
 */
export class QuoteProviderError extends Error {
  readonly provider: QuoteProvider;
  readonly ticker?: string;

  constructor(message: string, provider: QuoteProvider, ticker?: string) {
    super(message);
    this.name = 'QuoteProviderError';
    this.provider = provider;
    this.ticker = ticker;
  }
}

export interface Quote {
  ticker: string;
  price: number;
  currency: string;
}

/**
 * Resultado tolerante a falhas parciais: ativos com cotação obtida ficam em
 * `quotes`; ativos que falharam ficam registrados em `errors`, sem
 * interromper os demais.
 */
export interface QuoteFetchResult {
  quotes: Quote[];
  errors: QuoteProviderError[];
}

interface BrapiQuoteResponse {
  results?: Array<{
    symbol: string;
    regularMarketPrice: number;
    currency: string;
  }>;
  error?: boolean;
  message?: string;
}

async function fetchSingleStockQuote(ticker: string): Promise<Quote> {
  const url = new URL(`${BRAPI_BASE_URL}/quote/${encodeURIComponent(ticker)}`);
  if (BRAPI_TOKEN) url.searchParams.set('token', BRAPI_TOKEN);

  let response: Response;
  try {
    response = await fetch(url);
  } catch {
    throw new QuoteProviderError(`Não foi possível conectar à Brapi para ${ticker}`, 'brapi', ticker);
  }

  const body = (await response.json().catch(() => null)) as BrapiQuoteResponse | null;

  if (!response.ok) {
    throw new QuoteProviderError(
      body?.message ?? `Falha ao buscar cotação de ${ticker} (HTTP ${response.status})`,
      'brapi',
      ticker,
    );
  }

  const result = body?.results?.[0];
  if (!result) {
    throw new QuoteProviderError(`Cotação não encontrada para ${ticker}`, 'brapi', ticker);
  }

  return { ticker: result.symbol, price: result.regularMarketPrice, currency: result.currency };
}

/**
 * Busca a cotação de cada ticker de ação individualmente (em paralelo).
 * Isso isola falhas por ativo: a Brapi rejeita a requisição inteira quando
 * qualquer ticker do lote exige um token não fornecido, então uma única
 * chamada em lote faria um ativo problemático derrubar todos os outros.
 */
export async function fetchStockQuotes(tickers: string[]): Promise<QuoteFetchResult> {
  if (tickers.length === 0) return { quotes: [], errors: [] };

  const settled = await Promise.allSettled(tickers.map(fetchSingleStockQuote));

  return settled.reduce<QuoteFetchResult>(
    (acc, result) => {
      if (result.status === 'fulfilled') {
        acc.quotes.push(result.value);
      } else {
        acc.errors.push(
          result.reason instanceof QuoteProviderError
            ? result.reason
            : new QuoteProviderError('Erro inesperado ao buscar cotação de ação', 'brapi'),
        );
      }
      return acc;
    },
    { quotes: [], errors: [] },
  );
}

/**
 * Busca a cotação de criptomoedas em uma única chamada (a CoinGecko suporta
 * múltiplos ids por requisição sem os problemas de autenticação da Brapi).
 */
export async function fetchCryptoQuotes(tickers: string[], vsCurrency = 'brl'): Promise<QuoteFetchResult> {
  if (tickers.length === 0) return { quotes: [], errors: [] };

  const idByTicker = new Map(
    await Promise.all(tickers.map(async (ticker) => [ticker, await coinGeckoIdFor(ticker)] as const)),
  );
  const ids = [...new Set(idByTicker.values())];

  const url = new URL(`${COINGECKO_BASE_URL}/simple/price`);
  url.searchParams.set('ids', ids.join(','));
  url.searchParams.set('vs_currencies', vsCurrency);

  let data: Record<string, Record<string, number>>;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new QuoteProviderError(`Falha ao buscar cotações de criptomoedas (HTTP ${response.status})`, 'coingecko');
    }
    data = await response.json();
  } catch (cause) {
    const error =
      cause instanceof QuoteProviderError
        ? cause
        : new QuoteProviderError('Não foi possível conectar à CoinGecko', 'coingecko');
    return { quotes: [], errors: [error] };
  }

  const quotes: Quote[] = [];
  const errors: QuoteProviderError[] = [];

  tickers.forEach((ticker) => {
    const id = idByTicker.get(ticker)!;
    const price = data[id]?.[vsCurrency];

    if (price === undefined) {
      errors.push(new QuoteProviderError(`Cotação não encontrada para ${ticker}`, 'coingecko', ticker));
    } else {
      quotes.push({ ticker, price, currency: vsCurrency.toUpperCase() });
    }
  });

  return { quotes, errors };
}
