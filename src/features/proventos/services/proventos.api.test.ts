import { describe, expect, it, vi } from 'vitest';
import {
  createProvento,
  deleteProvento,
  getProventosResumo,
  listProventos,
  updateProvento,
} from '@/features/proventos/services/proventos.api';
import { tokenStorage } from '@/lib/token-storage';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), { status });
}

function stubFetch(reply: () => Response) {
  const fetchMock = vi.fn<typeof fetch>(async () => reply());
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function call(fetchMock: ReturnType<typeof stubFetch>, index = 0) {
  const [input, init] = fetchMock.mock.calls[index];
  const url = new URL(String(input));
  return { url, path: `${url.pathname}${url.search}`, method: init?.method ?? 'GET', init };
}

const JCP_DTO = {
  id: 7,
  assetSymbol: 'PETR4',
  assetClass: 'STOCK',
  tipo: 'JCP',
  dataPagamento: '2025-03-20',
  valorBruto: 50,
  irRetido: '7.50',
  valorLiquido: 42.5,
  observacao: 'JCP 1T25',
};

const INPUT = {
  ticker: ' petr4 ',
  tipo: 'JCP' as const,
  dataPagamento: '2025-03-20',
  valorBruto: 50,
  irRetido: 7.5,
  observacao: ' jcp 1t25 ',
};

describe('listProventos', () => {
  it('chama GET /api/proventos com o Bearer e os filtros ?ano= e ?assetSymbol=', async () => {
    tokenStorage.set('token-ficticio');
    const fetchMock = stubFetch(() => jsonResponse([JCP_DTO]));

    const proventos = await listProventos({ ano: 2025, ticker: 'petr4' });

    const { url, init } = call(fetchMock);
    expect(`${url.origin}${url.pathname}`).toBe('http://api.test/api/proventos');
    expect(url.searchParams.get('ano')).toBe('2025');
    expect(url.searchParams.get('assetSymbol')).toBe('PETR4');
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer token-ficticio');
    expect(proventos).toEqual([
      {
        id: '7',
        ticker: 'PETR4',
        assetClass: 'STOCK',
        tipo: 'JCP',
        dataPagamento: '2025-03-20',
        valorBruto: 50,
        irRetido: 7.5,
        valorLiquido: 42.5,
        observacao: 'JCP 1T25',
      },
    ]);
  });

  it('sem filtros, não manda query string', async () => {
    const fetchMock = stubFetch(() => jsonResponse([]));

    await listProventos();

    expect(call(fetchMock).path).toBe('/api/proventos');
  });
});

describe('createProvento e updateProvento', () => {
  it('POST manda o corpo do contrato, sem assetClass, com o ticker e a observação normalizados', async () => {
    const fetchMock = stubFetch(() => jsonResponse(JCP_DTO, 201));

    const saved = await createProvento(INPUT);

    const { path, method, init } = call(fetchMock);
    expect(method).toBe('POST');
    expect(path).toBe('/api/proventos');
    expect(JSON.parse(String(init?.body))).toEqual({
      assetSymbol: 'PETR4',
      tipo: 'JCP',
      dataPagamento: '2025-03-20',
      valorBruto: 50,
      irRetido: 7.5,
      observacao: 'JCP 1T25',
    });
    expect(saved.assetClass).toBe('STOCK');
  });

  it('PUT vai para /api/proventos/{id}', async () => {
    const fetchMock = stubFetch(() => jsonResponse(JCP_DTO));

    await updateProvento('7', INPUT);

    expect(call(fetchMock)).toMatchObject({ method: 'PUT', path: '/api/proventos/7' });
  });

  it('propaga o 422 da regra de carteira com a mensagem da API', async () => {
    stubFetch(() => jsonResponse({ mensagem: 'Você não tinha PETR4 em 20/03/2025' }, 422));

    await expect(createProvento(INPUT)).rejects.toMatchObject({
      name: 'HttpError',
      status: 422,
      message: 'Você não tinha PETR4 em 20/03/2025',
    });
  });
});

describe('deleteProvento', () => {
  it('chama DELETE /api/proventos/{id}', async () => {
    const fetchMock = stubFetch(() => jsonResponse(undefined, 204));

    await deleteProvento('7');

    expect(call(fetchMock)).toMatchObject({ method: 'DELETE', path: '/api/proventos/7' });
  });
});

describe('getProventosResumo', () => {
  it('chama /api/proventos/resumo?ano= e completa os 12 meses e os 4 tipos', async () => {
    const fetchMock = stubFetch(() =>
      jsonResponse({
        ano: 2025,
        totalBruto: '380.00',
        totalIrRetido: 30,
        totalLiquido: 350,
        porMes: [
          { mes: 1, totalLiquido: 100 },
          { mes: 3, totalLiquido: '250.00' },
        ],
        porAtivo: [
          { assetSymbol: 'PETR4', assetClass: 'STOCK', totalLiquido: 270 },
          { assetSymbol: 'HGLG11', assetClass: 'FII', totalLiquido: 80 },
        ],
        porTipo: [
          { tipo: 'DIVIDENDO', totalLiquido: 100 },
          { tipo: 'JCP', totalLiquido: 170 },
          { tipo: 'RENDIMENTO', totalLiquido: 80 },
        ],
      }),
    );

    const resumo = await getProventosResumo(2025);

    expect(call(fetchMock).path).toBe('/api/proventos/resumo?ano=2025');
    expect(resumo.totalBruto).toBe(380);
    expect(resumo.totalLiquido).toBe(350);
    expect(resumo.porMes).toHaveLength(12);
    expect(resumo.porMes[0]).toEqual({ mes: 1, totalLiquido: 100 });
    expect(resumo.porMes[1]).toEqual({ mes: 2, totalLiquido: 0 });
    expect(resumo.porMes[2]).toEqual({ mes: 3, totalLiquido: 250 });
    expect(resumo.porAtivo.map((item) => item.ticker)).toEqual(['PETR4', 'HGLG11']);
    expect(resumo.porTipo).toEqual([
      { tipo: 'DIVIDENDO', totalLiquido: 100 },
      { tipo: 'JCP', totalLiquido: 170 },
      { tipo: 'RENDIMENTO', totalLiquido: 80 },
      { tipo: 'AMORTIZACAO', totalLiquido: 0 },
    ]);
  });
});
