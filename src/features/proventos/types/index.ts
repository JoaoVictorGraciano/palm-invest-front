import type { AssetClass } from '@/types';

/** Tipos de provento aceitos pela palm-invest-api. */
export const TIPO_PROVENTO = {
  DIVIDENDO: 'DIVIDENDO',
  JCP: 'JCP',
  RENDIMENTO: 'RENDIMENTO',
  AMORTIZACAO: 'AMORTIZACAO',
} as const;
export type TipoProvento = (typeof TIPO_PROVENTO)[keyof typeof TIPO_PROVENTO];

/** Ordem de exibição dos tipos (formulário, totais por tipo). */
export const TIPO_PROVENTO_ORDER: TipoProvento[] = [
  TIPO_PROVENTO.DIVIDENDO,
  TIPO_PROVENTO.JCP,
  TIPO_PROVENTO.RENDIMENTO,
  TIPO_PROVENTO.AMORTIZACAO,
];

/** Um provento recebido (dividendo, JCP, rendimento de FII ou amortização). */
export interface Provento {
  id: string;
  ticker: string;
  /** Classe do ativo, copiada pela API da transação mais recente até a data do pagamento. */
  assetClass: AssetClass;
  tipo: TipoProvento;
  /** Data do pagamento, `AAAA-MM-DD`. */
  dataPagamento: string;
  valorBruto: number;
  irRetido: number;
  /** `valorBruto - irRetido`, calculado pela API. */
  valorLiquido: number;
  /** Observação livre; string vazia quando não informada. */
  observacao: string;
}

/** Dados que o formulário envia para registrar ou editar um provento (sem `assetClass`, que vem da API). */
export interface ProventoInput {
  ticker: string;
  tipo: TipoProvento;
  /** `AAAA-MM-DD`. */
  dataPagamento: string;
  valorBruto: number;
  irRetido: number;
  observacao: string;
}

/** Totais líquidos de um ano (`GET /api/proventos/resumo?ano=`). */
export interface ProventosResumo {
  ano: number;
  totalBruto: number;
  totalIrRetido: number;
  totalLiquido: number;
  /** Os 12 meses, de janeiro (1) a dezembro (12). */
  porMes: Array<{ mes: number; totalLiquido: number }>;
  /** Do maior para o menor. */
  porAtivo: Array<{ ticker: string; assetClass: AssetClass; totalLiquido: number }>;
  /** Os 4 tipos, com zero quando não houve. */
  porTipo: Array<{ tipo: TipoProvento; totalLiquido: number }>;
}
