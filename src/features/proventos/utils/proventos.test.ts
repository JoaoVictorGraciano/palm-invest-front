import { describe, expect, it } from 'vitest';
import type { ProventosResumo } from '@/features/proventos/types';
import { availableYears, formatPaymentDate, monthlyAverage, todayIsoDate } from '@/features/proventos/utils/proventos';

function resumo(ano: number, totalLiquido: number): ProventosResumo {
  return { ano, totalBruto: totalLiquido, totalIrRetido: 0, totalLiquido, porMes: [], porAtivo: [], porTipo: [] };
}

describe('formatPaymentDate', () => {
  it('formata AAAA-MM-DD como DD/MM/AAAA sem voltar um dia pelo fuso', () => {
    expect(formatPaymentDate('2025-03-01')).toBe('01/03/2025');
  });
});

describe('todayIsoDate', () => {
  it('usa a data local, não a UTC', () => {
    const lateNight = new Date(2026, 10, 18, 23, 30);
    expect(todayIsoDate(lateNight)).toBe('2026-11-18');
  });
});

describe('monthlyAverage', () => {
  const now = new Date(2026, 10, 18); // novembro de 2026

  it('no ano corrente divide pelos meses de janeiro até o mês atual', () => {
    expect(monthlyAverage(resumo(2026, 110), now)).toEqual({ value: 10, months: 11 });
  });

  it('em anos anteriores divide por 12', () => {
    expect(monthlyAverage(resumo(2025, 120), now)).toEqual({ value: 10, months: 12 });
  });
});

describe('availableYears', () => {
  const now = new Date(2026, 10, 18);

  it('vai do ano da primeira transação até o ano atual, do mais recente para o mais antigo', () => {
    expect(availableYears(['2026-02-01T10:00:00', '2024-05-10T10:00:00'], now)).toEqual([2026, 2025, 2024]);
  });

  it('sem transações, oferece só o ano atual', () => {
    expect(availableYears([], now)).toEqual([2026]);
  });
});
