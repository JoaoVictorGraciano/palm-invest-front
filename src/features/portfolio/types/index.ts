import type { AssetClass, AssetProfit, Crypto, Stock } from '@/types';

/**
 * Filtro de visualização por classe de ativo na tela da carteira.
 * `'ALL'` é um valor exclusivo da UI e não existe no domínio global (`@/types`).
 */
export type AssetFilter = AssetClass | 'ALL';

/**
 * Dados "estáticos" de uma posição da carteira: tudo que não depende de
 * cotação em tempo real (quantidade, custo médio, dados cadastrais).
 * `currentPrice`, `currency` e as métricas de `AssetProfit` são preenchidos
 * dinamicamente após a busca de cotações — ver `services/portfolio.service.ts`.
 */
export type StockHolding = Omit<Stock, 'currentPrice' | 'currency' | 'updatedAt' | keyof AssetProfit>;
export type CryptoHolding = Omit<Crypto, 'currentPrice' | 'currency' | 'updatedAt' | keyof AssetProfit>;
export type AssetHolding = StockHolding | CryptoHolding;

/** Natureza de uma transação: compra (aumenta o estoque) ou venda (reduz o estoque). */
export const TRANSACTION_TYPE = {
  BUY: 'BUY',
  SELL: 'SELL',
} as const;
export type TransactionType = (typeof TRANSACTION_TYPE)[keyof typeof TRANSACTION_TYPE];

/**
 * Uma transação (compra ou venda) registrada pelo usuário. É o dado "de
 * verdade" que persiste no localStorage — os `AssetHolding` são derivados
 * processando o histórico de transações do mesmo ticker em ordem
 * cronológica: compras recalculam o custo médio ponderado, vendas apenas
 * reduzem a quantidade em estoque (o custo médio não muda em uma venda).
 */
export interface Transaction {
  id: string;
  ticker: string;
  name: string;
  assetClass: AssetClass;
  type: TransactionType;
  /** Quantidade comprada ou vendida nesta transação. */
  quantity: number;
  /** Preço por unidade nesta transação (pago na compra, recebido na venda). */
  pricePaid: number;
  /** Data/hora da transação (ISO 8601). */
  purchasedAt: string;
}

/** Dados de entrada para registrar uma nova transação (o formulário coleta estes campos). */
export interface NewTransactionInput {
  ticker: string;
  assetClass: AssetClass;
  type: TransactionType;
  quantity: number;
  pricePaid: number;
}
