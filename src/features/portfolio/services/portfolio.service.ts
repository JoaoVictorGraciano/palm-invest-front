import { ASSET_CLASS } from '@/types';
import type { Asset, Portfolio } from '@/types';
import { calculateAssetProfit, calculatePortfolioTotals } from '@/utils';
import { fetchCryptoQuotes, fetchStockQuotes, type Quote, type QuoteProviderError } from '@/services';
import { getHoldingsFromTransactions } from '@/features/portfolio/services/transactions.repository';
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

// 🚀 AQUI ESTÁ A MÁGICA: Conectando no Spring Boot
export async function getPortfolioHoldings(): Promise<AssetHolding[]> {
  try {
    // 1. Vai até a porta 8080 buscar os dados reais no banco de dados
    const response = await fetch("http://localhost:8080/api/transactions");
    
    if (!response.ok) {
      throw new Error("Falha ao buscar dados da API do Java");
    }

    const dbTransactions = await response.json();

    // 2. Traduz as variáveis do Java para as variáveis que o Front-End espera
    const mappedTransactions = dbTransactions.map((t: any) => ({
      id: t.id.toString(),
      type: t.type,           // 'BUY' ou 'SELL'
      ticker: t.assetSymbol,  // O Java chama de assetSymbol, o Front chama de ticker
      quantity: t.quantity,
      price: t.price,
      date: t.transactionDate 
    }));

    // 3. Manda para o calculador do Front-End fazer o preço médio
    return getHoldingsFromTransactions(mappedTransactions);
    
  } catch (error) {
    console.error("Erro ao conectar com o banco de dados:", error);
    return []; // Se a API estiver desligada, retorna a carteira vazia
  }
}

export interface PortfolioResult {
  portfolio: Portfolio;
  failures: QuoteProviderError[];
}

export async function getPortfolio(): Promise<PortfolioResult> {
  // 🚀 Como agora consultamos a rede, colocamos o "await" aqui!
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