import { describe, expect, it } from 'vitest';
import {
  checkExemptionLimit,
  exemptionCategoryOf,
  formatMonth,
  formatThousands,
  monthOf,
} from '@/features/impostos/utils/impostos';

const normalize = (value: string | null) => value?.replace(/\s/g, ' ') ?? null;

describe('checkExemptionLimit', () => {
  const base = { category: 'acoes' as const, mes: '2026-11', limite: 20000 };

  it('avisa quando a venda leva o mês acima do limite', () => {
    const check = checkExemptionLimit({ ...base, vendido: 15000, saleValue: 8400 });

    expect(check).toMatchObject({ before: 15000, total: 23400, crosses: true, alreadyAbove: false });
    expect(normalize(check.message)).toBe(
      'Com esta venda, suas vendas de ações em novembro chegam a R$ 23.400,00, acima de R$ 20 mil: o lucro do mês fica tributável.',
    );
  });

  it('o próprio valor do limite ainda é isento', () => {
    const check = checkExemptionLimit({ ...base, vendido: 15000, saleValue: 5000 });

    expect(check).toMatchObject({ total: 20000, crosses: false, message: null });
  });

  it('na edição, desconta o valor antigo da venda que a API já contou', () => {
    // A API já conta 22.000, dos quais 8.000 são desta venda; editada para 4.000, o mês fica em 18.000.
    const check = checkExemptionLimit({ ...base, vendido: 22000, saleValue: 4000, alreadyCounted: 8000 });

    expect(check).toMatchObject({ before: 14000, total: 18000, crosses: false, alreadyAbove: false });
  });

  it('com o mês já acima do limite, só informa', () => {
    const check = checkExemptionLimit({ ...base, vendido: 25000, saleValue: 1000 });

    expect(check).toMatchObject({ crosses: false, alreadyAbove: true });
    expect(check.message).toContain('já passaram de R$ 20 mil');
  });

  it('cripto usa o limite de R$ 35 mil', () => {
    const check = checkExemptionLimit({ category: 'cripto', mes: '2026-03', limite: 35000, vendido: 30000, saleValue: 6000 });

    expect(normalize(check.message)).toBe(
      'Com esta venda, suas vendas de cripto em março chegam a R$ 36.000,00, acima de R$ 35 mil: o lucro do mês fica tributável.',
    );
  });
});

describe('utilitários de impostos', () => {
  it('só ações e cripto têm limite de isenção', () => {
    expect(exemptionCategoryOf('STOCK')).toBe('acoes');
    expect(exemptionCategoryOf('CRYPTO')).toBe('cripto');
    expect(exemptionCategoryOf('ETF')).toBeNull();
    expect(exemptionCategoryOf('BDR')).toBeNull();
    expect(exemptionCategoryOf('FII')).toBeNull();
  });

  it('formata mês, milhares e extrai o mês de uma data', () => {
    expect(formatMonth('2026-11')).toBe('novembro de 2026');
    expect(formatMonth('2026-03', { withYear: false })).toBe('março');
    expect(formatThousands(20000)).toBe('R$ 20 mil');
    expect(monthOf('2026-11-23T10:00')).toBe('2026-11');
    expect(monthOf('')).toBeNull();
  });
});
