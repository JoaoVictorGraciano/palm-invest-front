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
