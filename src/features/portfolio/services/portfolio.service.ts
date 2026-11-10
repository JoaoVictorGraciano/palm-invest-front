import { ASSET_CLASS } from '@/types';
import type { Asset, Portfolio } from '@/types';
import { calculateAssetProfit, calculatePortfolioTotals } from '@/utils';
import { fetchCryptoQuotes, fetchStockQuotes, type Quote, type QuoteProviderError } from '@/services';
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

export interface HoldingQuotes {
  quotes: Quote[];
  failures: QuoteProviderError[];
}

/**
 * Busca as cotações das posições nos provedores externos. Nunca lança por
 * causa de um ativo: falhas individuais voltam em `failures` e o ativo usa
 * o custo médio como preço atual.
 */
export async function getQuotesForHoldings(holdings: AssetHolding[]): Promise<HoldingQuotes> {
  const stockTickers = holdings.filter((holding) => holding.assetClass === ASSET_CLASS.STOCK).map((holding) => holding.ticker);
  const cryptoTickers = holdings.filter((holding) => holding.assetClass === ASSET_CLASS.CRYPTO).map((holding) => holding.ticker);

  const [stockResult, cryptoResult] = await Promise.all([
    fetchStockQuotes(stockTickers),
    fetchCryptoQuotes(cryptoTickers),
  ]);

  return {
    quotes: [...stockResult.quotes, ...cryptoResult.quotes],
    failures: [...stockResult.errors, ...cryptoResult.errors],
  };
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
