import { ASSET_CLASS } from '@/types';
import type { Asset, Portfolio } from '@/types';
import { calculateAssetProfit, calculatePortfolioTotals } from '@/utils';
import { fetchCryptoQuotes, fetchStockQuotes, type Quote, type QuoteProviderError } from '@/services';
import { getHoldingsFromTransactions } from '@/features/portfolio/services/transactions.repository';
import { TRANSACTION_TYPE } from '@/features/portfolio/types';
import type { AssetHolding, CryptoHolding, StockHolding } from '@/features/portfolio/types';

function isStockHolding(holding: AssetHolding): holding is StockHolding {
  return holding.assetClass === ASSET_CLASS.STOCK;
}

function isCryptoHolding(holding: AssetHolding): holding is CryptoHolding {
  return holding.assetClass === ASSET_CLASS.CRYPTO;
}

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

export async function getPortfolioHoldings(): Promise<AssetHolding[]> {
  try {
    const response = await fetch("http://localhost:8080/api/transactions");
    
    if (!response.ok) {
      throw new Error("Falha ao buscar dados da API do Java");
    }

    const dbTransactions = await response.json();

    // 1. Ordenação cronológica garantida
    dbTransactions.sort((a: any, b: any) => 
      new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime()
    );

    // 2. Tradução blindada contra erros
    const mappedTransactions = dbTransactions.map((t: any) => {
      const qty = Number(t.quantity);
      const rawPrice = Number(t.price);
      const fee = Number(t.fee || 0);

      // Garante que o tipo bata perfeitamente com o que o Front-End espera
      const isSell = t.type?.toUpperCase() === 'SELL' || t.type?.toUpperCase() === 'VENDA';
      const safeType = isSell ? TRANSACTION_TYPE.SELL : TRANSACTION_TYPE.BUY;

      // Matemática do custo médio com taxas embutidas
      const effectivePrice = !isSell 
        ? (qty * rawPrice + fee) / qty 
        : (qty * rawPrice - fee) / qty;

      // Se não tem número no ticker (ex: BTC, ETH) ou for os famosos, é Cripto. Senão é Ação.
      const tickerStr = (t.assetSymbol || '').toUpperCase();
      const isCrypto = tickerStr === 'BTC' || tickerStr === 'ETH' || tickerStr === 'SOL' || !tickerStr.match(/\d/);

      return {
        id: t.id.toString(),
        type: safeType,
        ticker: tickerStr,
        name: tickerStr, // 🚀 Resolve o Bug #1 (nome vazio)
        quantity: qty,
        pricePaid: effectivePrice, 
        purchasedAt: t.transactionDate, 
        date: t.transactionDate,
        assetClass: isCrypto ? ASSET_CLASS.CRYPTO : ASSET_CLASS.STOCK, // 🚀 Resolve o Bug #3 (enum correto)
      };
    });

    return getHoldingsFromTransactions(mappedTransactions);
    
  } catch (error) {
    console.error("Erro ao conectar com o banco de dados:", error);
    return []; 
  }
}

export interface PortfolioResult {
  portfolio: Portfolio;
  failures: QuoteProviderError[];
}

export async function getPortfolio(): Promise<PortfolioResult> {
  const holdings = await getPortfolioHoldings();
  
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