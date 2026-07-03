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
