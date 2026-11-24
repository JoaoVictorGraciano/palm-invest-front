import { describe, expect, it } from 'vitest';
import { getLimiteIsencao, getResultados } from '@/features/impostos/services/resultados.api';
import { RESULTADOS_2026, limite, stubResultadosApi } from '@/features/impostos/test/fake-resultados-api';
import { tokenStorage } from '@/lib/token-storage';

describe('getResultados', () => {
  it('chama GET /api/resultados?ano= com o Bearer e completa os 12 meses', async () => {
    tokenStorage.set('token-ficticio');
    const { fetchMock, callsTo } = stubResultadosApi({ resultados: { 2026: RESULTADOS_2026 } });

    const resultados = await getResultados(2026);

    expect(callsTo('/api/resultados')[0].searchParams.get('ano')).toBe('2026');
    expect(new Headers(fetchMock.mock.calls[0][1]?.headers).get('Authorization')).toBe('Bearer token-ficticio');
    expect(resultados.meses).toHaveLength(12);
    expect(resultados.meses[0]).toEqual({ mes: '2026-01', categorias: [], darfs: [], impostoEstimado: 0 });

    const abril = resultados.meses[3];
    expect(abril.mes).toBe('2026-04');
    expect(abril.categorias.map((categoria) => categoria.categoria)).toEqual(['STOCK', 'CRYPTO']);
    expect(abril.categorias[1]).toMatchObject({ lucroBruto: 1000, isento: false, codigoDarf: '4600' });
    expect(resultados.prejuizoAcumulado.fimDoAno).toEqual({ acoesEtfBdr: 0, fii: 120 });
    expect(resultados.alertas[0]).toMatchObject({ tipo: 'POSSIVEL_DAY_TRADE', ticker: 'PETR4', data: '2026-04-10' });
  });
});

describe('getLimiteIsencao', () => {
  it('chama /api/resultados/limite-isencao?mes=AAAA-MM', async () => {
    const { callsTo } = stubResultadosApi({ limites: { '2026-11': limite('2026-11', 23400, 5000) } });

    const result = await getLimiteIsencao('2026-11');

    expect(callsTo('/api/resultados/limite-isencao')[0].searchParams.get('mes')).toBe('2026-11');
    expect(result.acoes).toEqual({ limite: 20000, vendido: 23400, disponivel: 0, dentroDoLimite: false });
    expect(result.cripto).toEqual({ limite: 35000, vendido: 5000, disponivel: 30000, dentroDoLimite: true });
  });
});
