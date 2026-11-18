import type { Asset, Portfolio } from '@/types';
import { calculateAssetProfit, calculatePortfolioTotals } from '@/utils';
import { fetchQuotes } from '@/features/portfolio/services/quotes.api';
import type { Quote, QuotesResult } from '@/features/portfolio/services/quotes.api';
import type { AssetHolding } from '@/features/portfolio/types';

function buildAsset(holding: AssetHolding, quotes: Quote[], updatedAt: string): Asset {
  const quote = quotes.find((candidate) => candidate.ticker === holding.ticker);
  const currentPrice = quote?.price ?? holding.averageCost;
  const currency = quote?.currency ?? 'BRL';
  const profit = calculateAssetProfit(holding.quantity, holding.averageCost, currentPrice);

  return {
    ...holding,
    currentPrice,
    currency,
    updatedAt,
    ...profit,
  } as Asset;
}

export type HoldingQuotes = QuotesResult;

/**
 * Busca as cotações de todas as posições em uma única chamada à API
 * (`GET /api/quotes`). Nunca lança por causa de um ativo: símbolos sem
 * cotação voltam em `failures` e usam o custo médio como preço atual; com
 * as cotações indisponíveis (`unavailable`), todos usam o custo médio.
 */
export async function getQuotesForHoldings(holdings: AssetHolding[]): Promise<HoldingQuotes> {
  return fetchQuotes(holdings.map((holding) => holding.ticker));
}

/** Monta a carteira consolidada a partir das posições e das cotações disponíveis. */
export function buildPortfolio(holdings: AssetHolding[], quotes: Quote[], updatedAt: string): Portfolio {
  const assets = holdings.map((holding) => buildAsset(holding, quotes, updatedAt));

  return {
    id: 'default',
    name: 'Minha Carteira',
    assets,
    updatedAt,
    ...calculatePortfolioTotals(assets),
  };
}
