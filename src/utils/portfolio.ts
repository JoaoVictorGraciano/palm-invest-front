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
