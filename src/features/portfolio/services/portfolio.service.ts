import { ASSET_CLASS } from '@/types';
import type { Asset, Portfolio } from '@/types';
import { calculateAssetProfit, calculatePortfolioTotals } from '@/utils';
import { fetchCryptoQuotes, fetchStockQuotes, type Quote, type QuoteProviderError } from '@/services';
import { getHoldingsFromTransactions, getTransactions } from '@/features/portfolio/services/transactions.repository';
import type { AssetHolding, CryptoHolding, StockHolding } from '@/features/portfolio/types';

/**
 * Serviço da feature `portfolio`.
 *
 * As posições da carteira (`holdings`) são derivadas dos aportes que o
 * usuário registra (persistidos no localStorage via
 * `transactions.repository`) — ver `getPortfolioHoldings()`. O que é
 * externo/real é a cotação: `getPortfolio()` busca preços atuais via
 * `services/api/quotes.service` e calcula os lucros em cima deles.
 */

function isStockHolding(holding: AssetHolding): holding is StockHolding {
  return holding.assetClass === ASSET_CLASS.STOCK;
}

function isCryptoHolding(holding: AssetHolding): holding is CryptoHolding {
  return holding.assetClass === ASSET_CLASS.CRYPTO;
}

/**
 * Enriquece uma posição estática com a cotação obtida (quando disponível).
 * Se a cotação de um ativo específico falhar, usa o custo médio como
 * fallback (lucro zerado para aquele ativo) em vez de quebrar a carteira
 * inteira — o chamador é responsável por notificar o usuário sobre a falha.
 */
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

export function getPortfolioHoldings(): AssetHolding[] {
  return getHoldingsFromTransactions(getTransactions());
}

export interface PortfolioResult {
  portfolio: Portfolio;
  /** Falhas de cotação por provedor/ativo; a carteira renderiza normalmente mesmo com falhas. */
  failures: QuoteProviderError[];
}

export async function getPortfolio(): Promise<PortfolioResult> {
  const holdings = getPortfolioHoldings();
  const stockTickers = holdings.filter(isStockHolding).map((holding) => holding.ticker);
  const cryptoTickers = holdings.filter(isCryptoHolding).map((holding) => holding.ticker);

  const [stockResult, cryptoResult] = await Promise.all([
    fetchStockQuotes(stockTickers),
    fetchCryptoQuotes(cryptoTickers),
  ]);

  const quotes = [...stockResult.quotes, ...cryptoResult.quotes];
  const failures = [...stockResult.errors, ...cryptoResult.errors];

  const updatedAt = new Date().toISOString();
  const assets = holdings.map((holding) => buildAsset(holding, quotes, updatedAt));

  const portfolio: Portfolio = {
    id: 'default',
    name: 'Minha Carteira',
    assets,
    updatedAt,
    ...calculatePortfolioTotals(assets),
  };

  return { portfolio, failures };
}
