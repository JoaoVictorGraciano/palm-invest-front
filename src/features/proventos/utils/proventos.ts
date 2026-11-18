import { TIPO_PROVENTO } from '@/features/proventos/types';
import type { ProventosResumo, TipoProvento } from '@/features/proventos/types';

export const TIPO_PROVENTO_LABEL: Record<TipoProvento, string> = {
  [TIPO_PROVENTO.DIVIDENDO]: 'Dividendo',
  [TIPO_PROVENTO.JCP]: 'JCP',
  [TIPO_PROVENTO.RENDIMENTO]: 'Rendimento',
  [TIPO_PROVENTO.AMORTIZACAO]: 'Amortização',
};

/** Cores fixas por tipo, iguais em qualquer tela. */
export const TIPO_PROVENTO_COLOR: Record<TipoProvento, string> = {
  [TIPO_PROVENTO.DIVIDENDO]: '#3b82f6',
  [TIPO_PROVENTO.JCP]: '#8b5cf6',
  [TIPO_PROVENTO.RENDIMENTO]: '#10b981',
  [TIPO_PROVENTO.AMORTIZACAO]: '#f59e0b',
};

/** IR sugerido para JCP: 15% retidos na fonte. */
export const JCP_IR_RATE = 0.15;

/** 15% do bruto, arredondado em centavos. */
export function suggestJcpIr(valorBruto: number): number {
  return Number.isFinite(valorBruto) && valorBruto > 0 ? Math.round(valorBruto * JCP_IR_RATE * 100) / 100 : 0;
}

export const MONTH_SHORT_LABEL = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** Data `AAAA-MM-DD` como `DD/MM/AAAA`, sem passar por `Date` (evita voltar um dia pelo fuso). */
export function formatPaymentDate(isoDate: string): string {
  const [year, month, day] = isoDate.slice(0, 10).split('-');
  if (!year || !month || !day) return isoDate;
  return `${day}/${month}/${year}`;
}

/** Hoje no fuso do navegador, no formato `AAAA-MM-DD`. */
export function todayIsoDate(now = new Date()): string {
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

export interface MonthlyAverage {
  value: number;
  /** Quantos meses entram na conta. */
  months: number;
}

/**
 * Média mensal líquida do ano. No ano corrente divide pelos meses já
 * iniciados (de janeiro até o mês atual); em anos anteriores, por 12.
 */
export function monthlyAverage(resumo: ProventosResumo, now = new Date()): MonthlyAverage {
  const currentYear = now.getFullYear();
  const months = resumo.ano === currentYear ? now.getMonth() + 1 : resumo.ano > currentYear ? 1 : 12;
  return { value: resumo.totalLiquido / months, months };
}

/**
 * Anos oferecidos no seletor: do ano da primeira transação (antes dela não
 * pode haver provento) até o ano atual, do mais recente para o mais antigo.
 */
export function availableYears(firstTransactionDates: string[], now = new Date()): number[] {
  const currentYear = now.getFullYear();
  const years = firstTransactionDates
    .map((date) => Number(date.slice(0, 4)))
    .filter((year) => Number.isInteger(year) && year > 1900 && year <= currentYear);
  const firstYear = years.length > 0 ? Math.min(...years) : currentYear;

  return Array.from({ length: currentYear - firstYear + 1 }, (_, index) => currentYear - index);
}
