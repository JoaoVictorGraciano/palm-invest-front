import { ASSET_CLASS } from '@/types';
import type { AssetClass } from '@/types';

/** Ordem de exibição das classes em filtros, legendas e gráficos. */
export const ASSET_CLASS_ORDER: AssetClass[] = [
  ASSET_CLASS.STOCK,
  ASSET_CLASS.FII,
  ASSET_CLASS.ETF,
  ASSET_CLASS.BDR,
  ASSET_CLASS.CRYPTO,
];

/** Nome da classe no singular, para etiquetas de um ativo (ex: "Ação"). */
export const ASSET_CLASS_LABEL: Record<AssetClass, string> = {
  [ASSET_CLASS.STOCK]: 'Ação',
  [ASSET_CLASS.FII]: 'FII',
  [ASSET_CLASS.ETF]: 'ETF',
  [ASSET_CLASS.BDR]: 'BDR',
  [ASSET_CLASS.CRYPTO]: 'Cripto',
};

/** Nome da classe no plural, para filtros e legendas (ex: "Ações"). */
export const ASSET_CLASS_PLURAL_LABEL: Record<AssetClass, string> = {
  [ASSET_CLASS.STOCK]: 'Ações',
  [ASSET_CLASS.FII]: 'FIIs',
  [ASSET_CLASS.ETF]: 'ETFs',
  [ASSET_CLASS.BDR]: 'BDRs',
  [ASSET_CLASS.CRYPTO]: 'Cripto',
};
