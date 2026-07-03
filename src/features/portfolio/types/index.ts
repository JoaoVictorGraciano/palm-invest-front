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

/**
 * Um aporte (compra) registrado pelo usuário. É o dado "de verdade" que
 * persiste no localStorage — os `AssetHolding` são derivados agregando as
 * transações do mesmo ticker (soma de quantidade + custo médio ponderado).
 * Guardar o histórico de transações (em vez de só a posição final) permite
 * recalcular o custo médio corretamente a cada novo aporte.
 */
export interface Transaction {
  id: string;
  ticker: string;
  name: string;
  assetClass: AssetClass;
  /** Quantidade comprada nesta transação. */
  quantity: number;
  /** Preço pago por unidade nesta transação. */
  pricePaid: number;
  /** Data/hora do aporte (ISO 8601). */
  purchasedAt: string;
}

/** Dados de entrada para registrar um novo aporte (o formulário coleta estes campos). */
export interface NewTransactionInput {
  ticker: string;
  assetClass: AssetClass;
  quantity: number;
  pricePaid: number;
}
