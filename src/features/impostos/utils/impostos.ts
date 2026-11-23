import type { AssetClass } from '@/types';
import { ASSET_CLASS_PLURAL_LABEL } from '@/utils';

export const MONTH_LONG_LABEL = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];

/** `AAAA-MM` como "novembro de 2026". */
export function formatMonth(mes: string, { withYear = true } = {}): string {
  const [year, month] = mes.split('-').map(Number);
  const name = MONTH_LONG_LABEL[month - 1] ?? mes;
  return withYear ? `${name} de ${year}` : name;
}

/** Mês corrente no fuso do navegador, `AAAA-MM`. */
export function currentMonth(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/** Mês `AAAA-MM` de uma data/hora local (`AAAA-MM-DDTHH:mm`), ou `null` se inválida. */
export function monthOf(dateTime: string): string | null {
  return /^\d{4}-\d{2}/.test(dateTime) ? dateTime.slice(0, 7) : null;
}

export function categoriaLabel(categoria: AssetClass): string {
  return ASSET_CLASS_PLURAL_LABEL[categoria];
}

/** Ex: 20000 → "R$ 20 mil". */
export function formatThousands(value: number): string {
  return value % 1000 === 0
    ? `R$ ${(value / 1000).toLocaleString('pt-BR')} mil`
    : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

const ALERTA_LABEL: Record<string, string> = {
  POSSIVEL_DAY_TRADE: 'Possível day trade',
  DARF_ABAIXO_DO_MINIMO: 'DARF abaixo de R$ 10,00',
};

export function alertaLabel(tipo: string): string {
  return ALERTA_LABEL[tipo] ?? 'Atenção';
}

export const TAX_DISCLAIMER = 'Estimativa para organização. Confirme com um contador antes de pagar ou declarar.';

/** Categorias com limite de isenção mensal. */
export type ExemptionCategory = 'acoes' | 'cripto';

/** Só ações (`STOCK`) e cripto têm limite de isenção; ETF, BDR e FII não. */
export function exemptionCategoryOf(assetClass: AssetClass | undefined): ExemptionCategory | null {
  if (assetClass === 'STOCK') return 'acoes';
  if (assetClass === 'CRYPTO') return 'cripto';
  return null;
}

const EXEMPTION_CATEGORY_LABEL: Record<ExemptionCategory, string> = { acoes: 'ações', cripto: 'cripto' };

export interface ExemptionCheck {
  /** Vendido no mês antes desta venda. */
  before: number;
  /** Vendido no mês com esta venda. */
  total: number;
  /** Esta venda faz o mês passar do limite. */
  crosses: boolean;
  /** O mês já estava acima do limite antes desta venda. */
  alreadyAbove: boolean;
  message: string | null;
}

interface ExemptionInput {
  category: ExemptionCategory;
  /** `AAAA-MM` da venda. */
  mes: string;
  limite: number;
  /** Vendido no mês segundo a API (inclui a venda em edição, se for do mesmo mês e categoria). */
  vendido: number;
  /** Quantidade × preço desta venda (sem taxas, como a regra da isenção). */
  saleValue: number;
  /** Valor da venda em edição que a API já contou no mês; 0 numa venda nova. */
  alreadyCounted?: number;
}

/**
 * Confere se uma venda leva o total vendido no mês acima do limite de
 * isenção (R$ 20 mil em ações, R$ 35 mil em cripto). O próprio valor do
 * limite ainda é isento.
 */
export function checkExemptionLimit(input: ExemptionInput): ExemptionCheck {
  const before = Math.max(0, input.vendido - (input.alreadyCounted ?? 0));
  const total = before + input.saleValue;
  const alreadyAbove = before > input.limite;
  const crosses = !alreadyAbove && input.saleValue > 0 && total > input.limite;
  const label = EXEMPTION_CATEGORY_LABEL[input.category];
  const month = formatMonth(input.mes, { withYear: false });
  const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  let message: string | null = null;
  if (crosses) {
    message = `Com esta venda, suas vendas de ${label} em ${month} chegam a ${money.format(total)}, acima de ${formatThousands(input.limite)}: o lucro do mês fica tributável.`;
  } else if (alreadyAbove && input.saleValue > 0) {
    message = `Suas vendas de ${label} em ${month} já passaram de ${formatThousands(input.limite)} (${money.format(before)} antes desta venda): o lucro do mês já é tributável.`;
  }

  return { before, total, crosses, alreadyAbove, message };
}
