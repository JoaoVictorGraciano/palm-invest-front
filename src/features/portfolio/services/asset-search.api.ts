import { HttpError, httpClient } from '@/services';
import { ASSET_CLASS, isB3AssetClass } from '@/types';
import type { AssetClass } from '@/types';

/**
 * Busca de ativos pela palm-invest-api (`GET /api/assets/search`). A API
 * consulta a Brapi (ações, FIIs, ETFs e BDRs da B3) e a CoinGecko
 * (criptomoedas); o navegador não fala mais com esses provedores.
 *
 * É a fonte das sugestões do formulário de transação: um ticker só pode ser
 * registrado se tiver sido escolhido a partir desta busca, e a classe do
 * ativo vem da sugestão escolhida.
 */

const SEARCH_PATH = '/api/assets/search';

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

/** Resposta da API: `symbol` no lugar de `ticker`. */
interface AssetSearchResponse {
  suggestions?: Array<{ symbol?: string | null; name?: string | null; assetClass?: string | null }>;
  failedProviders?: string[];
}

const KNOWN_CLASSES = new Set<string>(Object.values(ASSET_CLASS));
const KNOWN_PROVIDERS = new Set<string>(['brapi', 'coingecko']);

/**
 * Quão bem um ativo casa com o texto digitado; menor é melhor:
 * 0. símbolo igual ao texto;
 * 1. símbolo ou nome começando com o texto;
 * 2. o resto (o texto aparece no meio do símbolo ou do nome).
 *
 * É a mesma regra da API. Fica também aqui porque o formulário junta às
 * sugestões da API os ativos da carteira, e a lista combinada precisa
 * seguir a mesma ordem.
 */
function matchScore(term: string, asset: { ticker: string; name: string }): number {
  const ticker = asset.ticker.toUpperCase();
  if (ticker === term) return 0;
  return ticker.startsWith(term) || asset.name.toUpperCase().startsWith(term) ? 1 : 2;
}

/**
 * Ordena sugestões pela qualidade do casamento com o texto digitado. A
 * ordenação é estável: empates mantêm a ordem de entrada, o que preserva a
 * ordem da API (nas criptos, maior valor de mercado primeiro).
 */
export function sortByMatch<T extends { ticker: string; name: string }>(query: string, assets: T[]): T[] {
  const term = query.trim().toUpperCase();
  return [...assets].sort((a, b) => matchScore(term, a) - matchScore(term, b));
}

/** Provedores consultados para uma classe (ou para todas, sem classe). */
function providersFor(assetClass?: AssetClass): AssetSearchProvider[] {
  if (!assetClass) return ['brapi', 'coingecko'];
  return isB3AssetClass(assetClass) ? ['brapi'] : ['coingecko'];
}

function toSuggestions(response: AssetSearchResponse | undefined, assetClass?: AssetClass): AssetSuggestion[] {
  return (response?.suggestions ?? []).flatMap((item) => {
    const ticker = (item.symbol ?? '').trim().toUpperCase();
    const itemClass = item.assetClass ?? '';
    if (ticker === '' || !KNOWN_CLASSES.has(itemClass)) return [];
    if (assetClass && itemClass !== assetClass) return [];
    return [{ ticker, name: item.name?.trim() || ticker, assetClass: itemClass as AssetClass }];
  });
}

/**
 * Busca ativos na API e devolve as sugestões já ordenadas (ver
 * `sortByMatch`). Com `assetClass`, a API consulta só o provedor daquela
 * classe e devolve apenas ativos dela.
 *
 * Provedor fora do ar não é erro: aparece em `failedProviders`. Um 503
 * (todos os provedores consultados fora do ar), um 5xx ou a API fora do ar
 * também viram resultado vazio com esses provedores em `failedProviders`,
 * para o formulário seguir com as sugestões da carteira.
 */
export async function searchAssets(
  query: string,
  signal?: AbortSignal,
  assetClass?: AssetClass,
): Promise<AssetSearchResult> {
  const term = query.trim();
  if (term === '') return { suggestions: [], failedProviders: [] };

  const params = new URLSearchParams({ q: term, class: assetClass ?? 'ALL' });

  let response: AssetSearchResponse | undefined;
  try {
    response = await httpClient.get<AssetSearchResponse | undefined>(`${SEARCH_PATH}?${params}`, { signal });
  } catch (error) {
    if (error instanceof HttpError && (error.status === 0 || error.status >= 500)) {
      return { suggestions: [], failedProviders: providersFor(assetClass) };
    }
    throw error;
  }

  return {
    suggestions: sortByMatch(term, toSuggestions(response, assetClass)),
    failedProviders: (response?.failedProviders ?? []).filter((provider): provider is AssetSearchProvider =>
      KNOWN_PROVIDERS.has(provider),
    ),
  };
}
