import { HttpError, httpClient } from '@/services';

/**
 * Cotações pela palm-invest-api (`GET /api/quotes?symbols=`). A API decide
 * o provedor de cada símbolo (Brapi ou CoinGecko), devolve tudo em reais e
 * guarda em cache; o navegador não fala mais com esses provedores.
 */

const QUOTES_PATH = '/api/quotes';

/** Máximo de símbolos aceitos pela API em uma chamada. */
const MAX_SYMBOLS_PER_REQUEST = 50;

export type QuoteProvider = 'brapi' | 'coingecko';

export interface Quote {
  ticker: string;
  price: number;
  currency: string;
  provider?: QuoteProvider;
  /** Horário informado pelo provedor (ISO 8601), quando houver. */
  updatedAt?: string;
}

/** Símbolo que ficou sem cotação: provedor fora do ar ou ativo inexistente. */
export interface QuoteFailure {
  ticker: string;
  provider?: QuoteProvider;
  mensagem: string;
}

export interface QuotesResult {
  quotes: Quote[];
  failures: QuoteFailure[];
  /**
   * `true` quando a API respondeu 503 (nenhum provedor disponível) ou não
   * pôde ser alcançada: nenhuma cotação veio, e a tela avisa
   * "Cotações indisponíveis no momento".
   */
  unavailable: boolean;
}

interface QuotesResponse {
  quotes?: Array<{
    symbol?: string | null;
    price?: number | string | null;
    currency?: string | null;
    provider?: string | null;
    updatedAt?: string | null;
  }>;
  failures?: Array<{ symbol?: string | null; provider?: string | null; mensagem?: string | null }>;
}

function toProvider(value: string | null | undefined): QuoteProvider | undefined {
  return value === 'brapi' || value === 'coingecko' ? value : undefined;
}

function normalize(symbol: string | null | undefined): string {
  return (symbol ?? '').trim().toUpperCase();
}

function toResult(response: QuotesResponse | undefined): QuotesResult {
  const quotes = (response?.quotes ?? []).flatMap((item): Quote[] => {
    const ticker = normalize(item.symbol);
    const price = Number(item.price);
    if (ticker === '' || !Number.isFinite(price) || price <= 0) return [];
    return [
      {
        ticker,
        price,
        currency: item.currency?.trim() || 'BRL',
        provider: toProvider(item.provider),
        updatedAt: item.updatedAt ?? undefined,
      },
    ];
  });

  const failures = (response?.failures ?? []).flatMap((item): QuoteFailure[] => {
    const ticker = normalize(item.symbol);
    if (ticker === '') return [];
    return [{ ticker, provider: toProvider(item.provider), mensagem: item.mensagem?.trim() || 'Cotação indisponível.' }];
  });

  return { quotes, failures, unavailable: false };
}

function isUnavailable(error: unknown): boolean {
  return error instanceof HttpError && (error.status === 0 || error.status >= 500);
}

async function fetchChunk(symbols: string[]): Promise<QuotesResult> {
  const params = new URLSearchParams({ symbols: symbols.join(',') });

  try {
    return toResult(await httpClient.get<QuotesResponse | undefined>(`${QUOTES_PATH}?${params}`));
  } catch (error) {
    if (!isUnavailable(error)) throw error;
    return { quotes: [], failures: [], unavailable: true };
  }
}

/**
 * Busca a cotação de vários símbolos em uma única chamada à API (ou em
 * algumas, se passar do limite de 50). Nunca lança por causa de um ativo:
 * símbolos sem cotação voltam em `failures`. Um 503, um 5xx ou a API fora
 * do ar viram `unavailable: true`, sem lançar, para a carteira continuar
 * de pé usando o custo médio.
 */
export async function fetchQuotes(tickers: string[]): Promise<QuotesResult> {
  const symbols = [...new Set(tickers.map(normalize).filter((ticker) => ticker !== ''))];
  if (symbols.length === 0) return { quotes: [], failures: [], unavailable: false };

  const chunks: string[][] = [];
  for (let start = 0; start < symbols.length; start += MAX_SYMBOLS_PER_REQUEST) {
    chunks.push(symbols.slice(start, start + MAX_SYMBOLS_PER_REQUEST));
  }

  const results = await Promise.all(chunks.map(fetchChunk));

  return {
    quotes: results.flatMap((result) => result.quotes),
    failures: results.flatMap((result) => result.failures),
    unavailable: results.some((result) => result.unavailable),
  };
}
