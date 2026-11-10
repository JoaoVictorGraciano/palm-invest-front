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
 * verdade", persistido na palm-invest-api — os `AssetHolding` são derivados
 * processando o histórico de transações do mesmo ticker em ordem
 * cronológica: compras recalculam o custo médio ponderado, vendas apenas
 * reduzem a quantidade em estoque (o custo médio não muda em uma venda).
 */
export interface Transaction {
  id: string;
  ticker: string;
  name: string;
  /** Ainda não é persistida pela API: é inferida a partir do ticker. */
  assetClass: AssetClass;
  type: TransactionType;
  /** Quantidade comprada ou vendida nesta transação. */
  quantity: number;
  /** Preço por unidade nesta transação (pago na compra, recebido na venda), sem taxas. */
  pricePaid: number;
  /** Data/hora local da transação, como enviada pela API (ex: "2025-03-10T13:00:00"). */
  purchasedAt: string;
  /** Corretora/exchange; string vazia quando não informada. */
  broker: string;
  /** Taxas e custos da operação, em moeda. */
  fee: number;
  /** Observação livre; string vazia quando não informada. */
  observation: string;
}

/** Dados de entrada para criar ou editar uma transação (o formulário coleta estes campos). */
export interface TransactionInput {
  type: TransactionType;
  ticker: string;
  quantity: number;
  pricePaid: number;
  /** Data/hora local no formato `YYYY-MM-DDTHH:mm:ss`. */
  transactionDate: string;
  broker: string;
  fee: number;
  observation: string;
}
