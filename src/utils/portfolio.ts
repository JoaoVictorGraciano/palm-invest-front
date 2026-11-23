import type { Asset, AssetClass, AssetProfit } from '@/types';
import { ASSET_CLASS_ORDER } from './asset-class';

/**
 * Funções puras para cálculo de rentabilidade de ativos e carteiras.
 * Centralizadas aqui (em vez de dentro de um service) para poderem ser
 * reaproveitadas sempre que uma cotação for atualizada (ex: polling,
 * websocket) sem depender da camada de acesso a dados.
 */

/**
 * Calcula as métricas de rentabilidade de uma posição a partir da
 * quantidade, custo médio de aquisição e cotação atual.
 */
export function calculateAssetProfit(
  quantity: number,
  averageCost: number,
  currentPrice: number,
): AssetProfit {
  const totalInvested = quantity * averageCost;
  const currentValue = quantity * currentPrice;
  const profit = currentValue - totalInvested;
  const profitPercentage = totalInvested === 0 ? 0 : (profit / totalInvested) * 100;

  return { totalInvested, currentValue, profit, profitPercentage };
}

/**
 * Consolida os totais de uma carteira a partir da lista de ativos,
 * somando as métricas individuais já calculadas de cada um.
 */
export function calculatePortfolioTotals(assets: Asset[]): AssetProfit {
  const totalInvested = assets.reduce((sum, asset) => sum + asset.totalInvested, 0);
  const currentValue = assets.reduce((sum, asset) => sum + asset.currentValue, 0);
  const profit = currentValue - totalInvested;
  const profitPercentage = totalInvested === 0 ? 0 : (profit / totalInvested) * 100;

  return { totalInvested, currentValue, profit, profitPercentage };
}

export interface ClassDistributionSlice {
  assetClass: AssetClass;
  /** Soma do valor de mercado atual dos ativos da classe. */
  value: number;
}

/**
 * Distribuição do patrimônio por classe de ativo, pelo valor de mercado
 * atual. Devolve só as classes com valor, na ordem padrão de exibição.
 */
export function calculateClassDistribution(assets: Asset[]): ClassDistributionSlice[] {
  return ASSET_CLASS_ORDER.map((assetClass) => ({
    assetClass,
    value: assets
      .filter((asset) => asset.assetClass === assetClass)
      .reduce((sum, asset) => sum + asset.currentValue, 0),
  })).filter((slice) => slice.value > 0);
}

/**
 * Resultado de uma posição (ou da carteira) separando o que é valorização
 * do que é provento. Os percentuais são sobre o total investido, então
 * `totalPercentage = appreciationPercentage + incomePercentage`.
 */
export interface TotalReturn {
  /** Valorização: valor atual menos o investido. */
  appreciation: number;
  appreciationPercentage: number;
  /** Proventos líquidos recebidos. */
  income: number;
  incomePercentage: number;
  /** Valorização + proventos. */
  total: number;
  totalPercentage: number;
}

export function calculateTotalReturn(totalInvested: number, appreciation: number, income: number): TotalReturn {
  const percentage = (value: number) => (totalInvested === 0 ? 0 : (value / totalInvested) * 100);
  const total = appreciation + income;

  return {
    appreciation,
    appreciationPercentage: percentage(appreciation),
    income,
    incomePercentage: percentage(income),
    total,
    totalPercentage: percentage(total),
  };
}

/**
 * Soma os proventos líquidos dos ativos que estão na carteira. Proventos de
 * um ativo já vendido por inteiro ficam de fora, porque a valorização dele
 * também não entra mais na conta.
 */
export function sumIncomeOfAssets(assets: Asset[], incomeByTicker: ReadonlyMap<string, number>): number {
  return assets.reduce((sum, asset) => sum + (incomeByTicker.get(asset.ticker) ?? 0), 0);
}

/**
 * Resultado total, separado nas três partes: lucro já realizado nas vendas,
 * lucro em aberto (valorização das posições atuais) e proventos recebidos.
 */
export interface TotalResult {
  realized: number;
  open: number;
  income: number;
  total: number;
}

export function calculateTotalResult(realized: number, open: number, income: number): TotalResult {
  return { realized, open, income, total: realized + open + income };
}

/** Soma todos os valores de um mapa por ticker (ex: proventos ou lucro realizado de todos os ativos). */
export function sumByTicker(valuesByTicker: ReadonlyMap<string, number>): number {
  let total = 0;
  for (const value of valuesByTicker.values()) total += value;
  return total;
}
