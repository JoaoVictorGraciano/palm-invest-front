import { ASSET_CLASS } from '@/types';
import type { Asset, Portfolio } from '@/types';
import { calculateAssetProfit, calculatePortfolioTotals } from '@/utils';
import { fetchCryptoQuotes, fetchStockQuotes, type Quote, type QuoteProviderError } from '@/services';
import type { AssetHolding, CryptoHolding, StockHolding } from '@/features/portfolio/types';

/**
 * Serviço da feature `portfolio`.
 *
 * As posições da carteira (`holdings`) ainda são mock, pois dependem de um
 * backend de usuário/corretora que ainda não existe. O que passou a ser
 * real é a cotação: `getPortfolio()` busca preços atuais via
 * `services/api/quotes.service` e calcula os lucros em cima deles.
 */

const holdings: AssetHolding[] = [
  {
    id: 'stock-petr4',
    ticker: 'PETR4',
    name: 'Petrobras PN',
    assetClass: ASSET_CLASS.STOCK,
    quantity: 200,
    averageCost: 32.5,
    exchange: 'B3',
    sector: 'Energia',
    dividendYield: 12.4,
  },
  {
    id: 'stock-itub4',
    ticker: 'ITUB4',
    name: 'Itaú Unibanco PN',
    assetClass: ASSET_CLASS.STOCK,
    quantity: 150,
    averageCost: 28.1,
    exchange: 'B3',
    sector: 'Financeiro',
    dividendYield: 6.8,
  },
  {
    id: 'stock-wege3',
    ticker: 'WEGE3',
    name: 'WEG ON',
    assetClass: ASSET_CLASS.STOCK,
    quantity: 80,
    averageCost: 38.2,
    exchange: 'B3',
    sector: 'Bens de Capital',
    dividendYield: 1.9,
  },
  {
    id: 'crypto-btc',
    ticker: 'BTC',
    name: 'Bitcoin',
    assetClass: ASSET_CLASS.CRYPTO,
    quantity: 0.15,
    averageCost: 280000,
    network: 'Bitcoin',
  },
  {
    id: 'crypto-eth',
    ticker: 'ETH',
    name: 'Ethereum',
    assetClass: ASSET_CLASS.CRYPTO,
    quantity: 2.4,
    averageCost: 12500,
    network: 'Ethereum',
  },
  {
    id: 'crypto-sol',
    ticker: 'SOL',
    name: 'Solana',
    assetClass: ASSET_CLASS.CRYPTO,
    quantity: 30,
    averageCost: 480,
    network: 'Solana',
  },
];

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
  return holdings;
}

export interface PortfolioResult {
  portfolio: Portfolio;
  /** Falhas de cotação por provedor/ativo; a carteira renderiza normalmente mesmo com falhas. */
  failures: QuoteProviderError[];
}

export async function getPortfolio(): Promise<PortfolioResult> {
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
