/**
 * Tipos globais compartilhados por toda a aplicação.
 * Tipos específicos de um domínio devem viver em `src/features/<feature>/types`.
 */

export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  page: number;
  pageSize: number;
  total: number;
}

export interface AppError {
  code: string;
  message: string;
}

/* ------------------------------------------------------------------------ */
/* Carteira de investimentos (Portfolio)                                    */
/* ------------------------------------------------------------------------ */

/**
 * Classes de ativos suportadas pela carteira. Funciona como propriedade
 * discriminante do union type `Asset`, permitindo que o TypeScript
 * estreite (narrow) `Stock` ou `Crypto` a partir do valor de `assetClass`.
 *
 * Usamos um objeto `as const` em vez de `enum` porque o projeto tem
 * `erasableSyntaxOnly` habilitado no `tsconfig`, que não permite `enum`.
 */
export const ASSET_CLASS = {
  STOCK: 'STOCK',
  CRYPTO: 'CRYPTO',
} as const;

export type AssetClass = (typeof ASSET_CLASS)[keyof typeof ASSET_CLASS];

/**
 * Métricas de rentabilidade de uma posição, derivadas de `quantity`,
 * `averageCost` e `currentPrice`. Mantidas como campos explícitos (e não
 * apenas calculadas em tempo de exibição) para permitir cache/serialização
 * vindos da camada de serviço.
 */
export interface AssetProfit {
  /** Valor total investido na posição (quantity * averageCost). */
  totalInvested: number;
  /** Valor de mercado atual da posição (quantity * currentPrice). */
  currentValue: number;
  /** Lucro/prejuízo absoluto (currentValue - totalInvested). */
  profit: number;
  /** Lucro/prejuízo percentual em relação ao total investido. */
  profitPercentage: number;
}

/**
 * Campos obrigatórios e comuns a qualquer ativo da carteira,
 * independentemente da sua classe (ação ou criptomoeda).
 */
export interface BaseAsset extends AssetProfit {
  /** Identificador único do ativo dentro da carteira. */
  id: string;
  /** Código de negociação do ativo (ex: "PETR4", "BTC"). */
  ticker: string;
  /** Nome de exibição do ativo (ex: "Petrobras PN", "Bitcoin"). */
  name: string;
  /** Discriminante da classe do ativo. */
  assetClass: AssetClass;
  /** Quantidade total de unidades/cotas/moedas em posse. */
  quantity: number;
  /** Custo médio de aquisição: preço médio pago por unidade. */
  averageCost: number;
  /** Cotação atual: preço de mercado por unidade no momento. */
  currentPrice: number;
  /** Moeda de referência dos valores monetários (ex: "BRL", "USD"). */
  currency: string;
  /** Data/hora da última atualização da cotação (ISO 8601). */
  updatedAt: string;
}

/**
 * Ativo do tipo Ação (mercado tradicional de renda variável).
 */
export interface Stock extends BaseAsset {
  assetClass: typeof ASSET_CLASS.STOCK;
  /** Bolsa/mercado onde o ativo é negociado (ex: "B3", "NASDAQ"). */
  exchange: string;
  /** Setor de atuação da empresa (ex: "Financeiro", "Energia"). */
  sector?: string;
  /** Dividend yield acumulado, em percentual. */
  dividendYield?: number;
}

/**
 * Ativo do tipo Criptomoeda.
 */
export interface Crypto extends BaseAsset {
  assetClass: typeof ASSET_CLASS.CRYPTO;
  /** Rede/blockchain do ativo (ex: "Bitcoin", "Ethereum (ERC-20)"). */
  network?: string;
  /** Endereço da carteira onde o ativo está custodiado, se aplicável. */
  walletAddress?: string;
}

/**
 * Union discriminado de todos os ativos suportados pela carteira.
 * Usar `isStock`/`isCrypto` (ou checar `assetClass`) para estreitar o tipo.
 */
export type Asset = Stock | Crypto;

/**
 * Carteira de investimentos: coleção de ativos com totais consolidados.
 */
export interface Portfolio {
  id: string;
  name: string;
  assets: Asset[];
  /** Soma de `totalInvested` de todos os ativos. */
  totalInvested: number;
  /** Soma de `currentValue` de todos os ativos. */
  currentValue: number;
  /** Lucro/prejuízo absoluto consolidado da carteira. */
  profit: number;
  /** Lucro/prejuízo percentual consolidado da carteira. */
  profitPercentage: number;
  /** Data/hora da última atualização dos totais (ISO 8601). */
  updatedAt: string;
}

/** Type guard: estreita `Asset` para `Stock`. */
export function isStock(asset: Asset): asset is Stock {
  return asset.assetClass === ASSET_CLASS.STOCK;
}

/** Type guard: estreita `Asset` para `Crypto`. */
export function isCrypto(asset: Asset): asset is Crypto {
  return asset.assetClass === ASSET_CLASS.CRYPTO;
}
